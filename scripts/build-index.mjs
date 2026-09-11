#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';

const DATA_DIR = path.resolve('data');

async function listEventDirs() {
  const entries = await fs.readdir(DATA_DIR, { withFileTypes: true });
  const dirs = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    try {
      await fs.access(path.join(DATA_DIR, entry.name, 'raw_data.json'));
      dirs.push(entry.name);
    } catch {
      // skip directories without a metadata archive
    }
  }
  return dirs.sort((a, b) => {
    const aWwdc = /^wwdc\d{2}$/.test(a);
    const bWwdc = /^wwdc\d{2}$/.test(b);
    if (aWwdc && bWwdc) return a.localeCompare(b);
    if (aWwdc) return -1;
    if (bWwdc) return 1;
    return a.localeCompare(b);
  });
}

async function readJson(file) {
  return JSON.parse(await fs.readFile(file, 'utf8'));
}

function describeEventIdentity(eventShort, event) {
  const eventId = event.id ?? eventShort;
  if (/^wwdc\d{2}$/.test(eventShort)) {
    const year = `20${eventShort.slice(-2)}`;
    return {
      year,
      eventId: event.id ?? `wwdc${year}`,
      eventShort,
      displayName: event.name ?? `WWDC${eventShort.slice(-2)}`
    };
  }
  return {
    year: event.year ?? null,
    eventId,
    eventShort,
    displayName: event.name ?? eventId
  };
}

async function describeEvent(eventShort) {
  const dir = path.join(DATA_DIR, eventShort);
  const metadataPath = path.join(dir, 'raw_data.json');
  const raw = await readJson(metadataPath);
  const event = Object.values(raw.events ?? {})[0] ?? {};
  const identity = describeEventIdentity(eventShort, event);
  const transcriptDirs = (await fs.readdir(dir, { withFileTypes: true }))
    .filter((entry) => entry.isDirectory() && entry.name.startsWith('transcripts-'))
    .map((entry) => entry.name);
  const locales = transcriptDirs.map((name) => name.slice('transcripts-'.length)).sort();
  let generatedAt = null;
  for (const localeDir of transcriptDirs) {
    const manifestPath = path.join(dir, localeDir, '_manifest.json');
    try {
      const manifest = await readJson(manifestPath);
      if (!generatedAt || manifest.generatedAt > generatedAt) generatedAt = manifest.generatedAt;
    } catch {
      // missing manifest is OK for events without transcripts yet
    }
  }
  return {
    ...identity,
    sessionCount: Object.keys(raw.videos ?? {}).length,
    topicCount: Object.keys(raw.topics ?? {}).length,
    locales,
    generatedAt,
    files: {
      metadata: `data/${eventShort}/raw_data.json`,
      transcriptsManifest: locales[0]
        ? `data/${eventShort}/transcripts-${locales[0]}/_manifest.json`
        : null,
      transcriptDir: locales[0] ? `data/${eventShort}/transcripts-${locales[0]}/` : null
    }
  };
}

async function main() {
  const eventShorts = await listEventDirs();
  const years = [];
  for (const eventShort of eventShorts) {
    years.push(await describeEvent(eventShort));
  }
  const index = {
    schemaVersion: 1,
    generatedAt: years.map((y) => y.generatedAt).filter(Boolean).sort().at(-1) ?? null,
    years
  };
  const outputPath = path.join(DATA_DIR, 'index.json');
  await fs.writeFile(outputPath, `${JSON.stringify(index, null, 2)}\n`, 'utf8');
  console.log(`Wrote ${outputPath} (${years.length} event(s))`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
