# Raw Archive Workflow

The Node.js rewrite treats existing Python scripts as legacy references and defines a no-key raw archive workflow. Data refreshes are manual: run the local CLI for the specific WWDC year or non-WWDC event (for example Tech Talks), inspect the resulting diff, then commit the stable data files. The primary command is `crawl`, which fetches public Apple Developer video metadata, enriches each session with public resources/code snippets, and then crawls per-session transcript text in one local run. `archive` and `transcripts` remain manual sub-steps. Everything else is a local helper for inspecting or materializing already archived data.

## Primary workflow

Run `crawl` from the directory where you want the raw archive stored:

```sh
node ./bin/wwdc-quick-look.js crawl --year 2025 --locale en
```

This command:

1. Fetches public Apple Developer video collection HTML from `https://developer.apple.com/videos/<eventId>/` and derives a minimal raw metadata archive from the public cards.
2. Fetches each public Apple Developer video page and enriches the matching `videos` entry with:
   - `resources` from the page's top-level Resources list, excluding HD/SD video downloads.
   - `codeSnippets` from the page's Code tab, including time, URL, title, and code text.
3. Writes both locally:
   - `./raw_data.json` as the stable latest archive.
   - `./raw_data_<eventShort>_<locale>_<timestamp>.json` as an ignored local snapshot.
4. Fetches each public Apple Developer video page, preferring the metadata `webPermalink` when available.
5. Extracts `<section id="transcript-content">` from static HTML.
6. Writes one raw transcript text file per session under `./transcripts-<locale>/` by default.
7. Writes `./transcripts-<locale>/_manifest.json`, including every attempted session and whether it was `written`, `skipped`, `missing`, or `failed`.

For WWDC25, this shortcut is equivalent to `crawl --year 2025 --locale en`:

```sh
node ./bin/wwdc-quick-look.js wwdc25
```

No `.env` file, API key, cookie, browser session, Selenium driver, or LLM provider is involved.

The older Apple JSON service URL can still be used with `--source json`, but it is not the default combined crawl source because past-event JSON endpoints may return 404 while the public collection page remains available.

## Manual metadata archive workflow

1. Run `archive` from the directory where you want the raw metadata stored.
2. The CLI fetches public Apple Developer metadata from the public video collection page, then enriches each session from its Apple Developer video page.
3. The CLI writes both locally:
   - `./raw_data.json` as the stable latest archive.
   - `./raw_data_<eventShort>_<locale>_<timestamp>.json` as an ignored local snapshot.

Published repository data keeps only the stable latest archive (`raw_data.json`), transcript files, transcript manifests, and `data/index.json`. Timestamped `raw_data_*.json` snapshots are useful for local audit/debugging but are not committed.

No `.env` file, API key, or LLM provider is involved.

## Transcript crawl workflow

1. Run `archive` first so the event's session list exists in `raw_data.json`.
2. Run `transcripts --raw-data raw_data.json` from the directory where you want transcript output.
3. The CLI fetches each public Apple Developer video page, preferring the metadata `webPermalink` when available, and extracts `<section id="transcript-content">` from static HTML.
4. The CLI writes one raw transcript text file per session under `./transcripts-en/` by default.

Example for WWDC25:

```sh
node ./bin/wwdc-quick-look.js crawl --year 2025 --locale en

# Or the manual equivalent:
node ./bin/wwdc-quick-look.js archive --year 2025 --locale en
node ./bin/wwdc-quick-look.js transcripts --year 2025 --raw-data raw_data.json
```

Existing non-empty transcript files are skipped unless `--force` is passed. Sessions whose pages have no timestamped transcript lines are reported as missing, recorded in `_manifest.json`, and do not fail the whole crawl. Use `--concurrency <n>` to tune fetch concurrency and `--limit <n>` for smoke tests.

## Secondary helper stages

1. `init-year`
   - Creates a local yearly workspace.
   - Writes `event.json` with derived WWDC metadata configuration.

2. `ingest`
   - Alias for `archive` kept as a secondary command name.
   - Writes enriched `raw_data.json` and an ignored timestamped snapshot to `--out-dir` or the current directory.

3. `transcripts`
   - Reads `raw_data.json`.
   - Fetches public video pages without Selenium, cookies, credentials, or keys.
   - Writes raw transcript files as `<session-code>.txt`.

4. `split`
   - Reads `raw_data.json`.
   - Writes top-level JSON files under `raw/jsons/`.
   - Writes each session under `raw/jsons/videos/<session-id>.json`.
   - Derives `raw/topics_and_videos.json` from metadata topic IDs instead of scraping topic pages.

5. `query-topic` / `topics`
   - Read-only inspection commands for planning reports.

6. `materialize`
   - Reads split session JSON and optional local transcript files.
   - Writes `processed/sessions/*.md` and `processed/index.md`.
   - Does not embed full transcripts by default, to keep open-source artifacts safer.

## Transcript files

Transcript files crawled by the primary command are written under `./transcripts-en/<session-code>.txt` by default. Yearly workspaces use `raw/transcripts-en/<session-code>.txt`. Lines may use any of these timestamp forms:

```text
00:15 Text
01:02:03 Text
75 Text
```

Each parsed segment can be linked back to the Apple video with `?time=<seconds>`.

The sibling `_manifest.json` is intentionally raw operational metadata rather than a generated transcript. It lets the archive prove that all sessions were attempted without inventing transcript text for pages where Apple publishes no timestamped transcript lines.

## No-key rule

Core commands do not read `.env`, do not require API keys, and do not call LLM providers. Any future AI authoring feature should be an explicit optional adapter and must document where data is sent.
