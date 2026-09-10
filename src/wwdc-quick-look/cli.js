import fs from 'node:fs/promises';
import path from 'node:path';

import { createEventConfig } from './event-config.js';
import { readJson, writeJson } from './fs-utils.js';
import { ingestRawData } from './ingest.js';
import { materializeIndex, materializeSessions } from './materialize.js';
import { writeSplitData } from './split.js';
import { findTopics, getTopicList, sessionsForTopics, topicsAndVideos } from './topics.js';
import { crawlTranscripts } from './transcript-crawl.js';

const VERSION = '0.1.0';

const HELP = `wwdc-quick-look ${VERSION}

WWDC Quick Look skill and no-key session archive.

Usage:
  wwdc-quick-look --year 2026 [--locale en]
  wwdc-quick-look help
  wwdc-quick-look version
  wwdc-quick-look crawl --year 2026 [--locale en]
  wwdc-quick-look wwdc25 [--locale en]
  wwdc-quick-look archive --year 2026 [--locale en]
  wwdc-quick-look transcripts --year 2026 --raw-data raw_data.json [--out-dir transcripts-en]
  wwdc-quick-look init-year --year 2026
  wwdc-quick-look split --year 2026 [--raw-data years/2026/raw/raw_data.json]
  wwdc-quick-look topics --year 2026 [--raw-data years/2026/raw/raw_data.json]
  wwdc-quick-look query-topic --year 2026 --topic Swift [--with-description]
  wwdc-quick-look materialize --year 2026 [--include-transcript]

Global options:
  --project-root <path>   Project root, default: current working directory
  --data-root <path>      Data root, default: <project-root>/years/<year>
  --year <year>           WWDC year, default: current year
  --event-id <id>         Video event id, default: wwdc<year>
  --event-short <id>      Metadata event key, default: wwdc<yy>
  --locale <locale>       Apple metadata locale, default: en
  --out-dir <path>        Output directory for crawl/transcripts, default: current directory
  --transcripts-dir <path> Transcript output directory for crawl, default: <out-dir>/transcripts-<locale>
  --html-url <url>        Override the collection HTML URL used to discover sessions
  --display-name <name>   Override the event display name
  --session-codes <list>  Comma-separated session codes to keep after discovery
  --force                 Re-fetch and overwrite existing transcript files
  --concurrency <n>       Transcript fetch concurrency, default: 4
  --limit <n>             Crawl only the first n transcripts, useful for smoke tests
`;

function defaultIo() {
  return { stdout: process.stdout, stderr: process.stderr };
}

export function parseArgs(argv) {
  const args = { _: [] };
  for (let index = 0; index < argv.length; index += 1) {
    const item = argv[index];
    if (!item.startsWith('--')) {
      args._.push(item);
      continue;
    }
    const [flag, inlineValue] = item.slice(2).split('=', 2);
    if (['help', 'include-transcript', 'with-title', 'with-description', 'fuzzy', 'force'].includes(flag)) {
      args[flag] = true;
      continue;
    }
    const value = inlineValue ?? argv[index + 1];
    if (value === undefined || value.startsWith('--')) {
      throw new Error(`Missing value for --${flag}`);
    }
    index += inlineValue === undefined ? 1 : 0;
    if (flag === 'topic') args.topic = [...(args.topic ?? []), value];
    else args[flag] = value;
  }
  return args;
}

function makeConfig(args) {
  return createEventConfig({
    year: args.year,
    eventId: args['event-id'],
    eventShort: args['event-short'],
    displayName: args['display-name'],
    locale: args.locale,
    projectRoot: args['project-root'],
    dataRoot: args['data-root'],
    collectionUrl: args['html-url']
  });
}

async function readRawData(config, args) {
  return readJson(path.resolve(args['raw-data'] ?? config.rawDataPath));
}

function writeLine(io, text = '') {
  io.stdout.write(`${text}\n`);
}

function transcriptDirName(locale) {
  const safeLocale = String(locale ?? 'en').replace(/[^a-z0-9_-]+/gi, '-').replace(/^-+|-+$/g, '') || 'en';
  return `transcripts-${safeLocale}`;
}

function writeTranscriptSummary(io, result) {
  writeLine(io, `Transcript output: ${result.outputDir}`);
  writeLine(io, `Transcript manifest: ${result.manifestPath}`);
  writeLine(io, `Total: ${result.total}, written: ${result.written}, skipped: ${result.skipped}, missing: ${result.missing}, failed: ${result.failed}`);
  for (const missing of result.missingTranscripts) writeLine(io, `Missing ${missing.sessionCode}: ${missing.message}`);
  for (const failure of result.failures) writeLine(io, `Failed ${failure.sessionCode}: ${failure.message}`);
}

export async function main(argv = process.argv.slice(2), io = defaultIo()) {
  const args = parseArgs(argv);
  const command = args._[0] ?? (args.help ? 'help' : 'crawl');
  if (command === 'wwdc25' && args.year === undefined) args.year = '2025';
  const config = makeConfig(args);

  if (command === 'help') {
    io.stdout.write(HELP);
    return 0;
  }
  if (command === 'version') {
    writeLine(io, VERSION);
    return 0;
  }
  if (command === 'init-year') {
    await fs.mkdir(config.rawDir, { recursive: true });
    await fs.mkdir(config.videoJsonDir, { recursive: true });
    await fs.mkdir(config.transcriptsDir, { recursive: true });
    await fs.mkdir(config.sessionsOutputDir, { recursive: true });
    await writeJson(path.join(config.dataRoot, 'event.json'), {
      year: config.year,
      eventId: config.eventId,
      eventShort: config.eventShort,
      displayName: config.displayName,
      locale: config.locale,
      collectionUrl: config.collectionUrl
    });
    writeLine(io, `Initialized ${config.displayName} workspace at ${config.dataRoot}`);
    return 0;
  }
  if (command === 'crawl' || command === 'wwdc25') {
    const outputDir = path.resolve(args['out-dir'] ?? process.cwd());
    const metadata = await ingestRawData(config, {
      htmlUrl: args['html-url'] ?? config.collectionUrl,
      outputDir,
      sessionCodes: args['session-codes']
    });
    writeLine(io, `Wrote ${metadata.rawDataPath}`);
    writeLine(io, `Wrote ${metadata.snapshotPath}`);

    const transcriptResult = await crawlTranscripts(metadata.data, config, {
      outputDir: args['transcripts-dir'] ?? path.join(outputDir, transcriptDirName(config.locale)),
      force: Boolean(args.force),
      concurrency: args.concurrency,
      limit: args.limit
    });
    writeTranscriptSummary(io, transcriptResult);
    if (transcriptResult.failed > 0) return 1;
    return 0;
  }
  if (command === 'archive') {
    const outputDir = path.resolve(args['out-dir'] ?? process.cwd());
    const result = await ingestRawData(config, {
      htmlUrl: args['html-url'] ?? config.collectionUrl,
      outputDir,
      sessionCodes: args['session-codes']
    });
    writeLine(io, `Wrote ${result.rawDataPath}`);
    writeLine(io, `Wrote ${result.snapshotPath}`);
    return 0;
  }
  if (command === 'transcripts' || command === 'crawl-transcripts') {
    const rawData = await readRawData(config, args);
    const result = await crawlTranscripts(rawData, config, {
      outputDir: args['out-dir'] ?? path.join(process.cwd(), 'transcripts-en'),
      force: Boolean(args.force),
      concurrency: args.concurrency,
      limit: args.limit
    });
    writeTranscriptSummary(io, result);
    if (result.failed > 0) return 1;
    return 0;
  }
  if (command === 'split') {
    const rawData = await readRawData(config, args);
    const files = await writeSplitData(rawData, config.splitDir);
    await writeJson(config.topicsAndVideosPath, topicsAndVideos(rawData));
    writeLine(io, `Wrote ${files.length} JSON files under ${config.splitDir}`);
    writeLine(io, `Wrote ${config.topicsAndVideosPath}`);
    return 0;
  }
  if (command === 'topics') {
    const rawData = await readRawData(config, args);
    for (const topic of getTopicList(rawData)) writeLine(io, `${topic.id}\t${topic.title}`);
    return 0;
  }
  if (command === 'query-topic') {
    const rawData = await readRawData(config, args);
    const requested = args.topic ?? [];
    if (requested.length === 0) throw new Error('query-topic requires at least one --topic <name>');
    const found = findTopics(rawData, requested, { fuzzy: args.fuzzy });
    if (found.unmatched.length > 0) {
      throw new Error(`Unknown topic(s): ${found.unmatched.join(', ')}\nAvailable topics: ${found.available.map((topic) => topic.title).join(', ')}`);
    }
    const sessions = sessionsForTopics(rawData, found.matches);
    for (const [topic, items] of Object.entries(sessions)) {
      writeLine(io, `Topic: ${topic}`);
      for (const item of items) {
        const fields = [item.code];
        if (args['with-title']) fields.push(item.title);
        if (args['with-description']) fields.push(item.description);
        writeLine(io, fields.join('\t'));
      }
    }
    return 0;
  }
  if (command === 'materialize') {
    const rawData = await readRawData(config, args);
    const sessionFiles = await materializeSessions(config, { includeTranscript: args['include-transcript'] });
    const indexPath = await materializeIndex(config, rawData);
    writeLine(io, `Wrote ${sessionFiles.length} session markdown files under ${config.sessionsOutputDir}`);
    writeLine(io, `Wrote ${indexPath}`);
    return 0;
  }

  throw new Error(`Unknown command: ${command}\n\n${HELP}`);
}
