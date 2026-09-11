<p align="center">
  <img src="assets/wwdc-quick-look-logo.png" alt="WWDC Quick Look logo" width="180" />
</p>

![WWDC Quick Look banner](assets/wwdc-quick-look-banner.png)

# WWDC Quick Look Skill

[README-中文](README-CN.md)
[README-English](README.md)
[README-日本語](README-JP.md)
[HomePage](https://wwdc-quick-look.swiftgg.team)

WWDC Quick Look is a local agent skill for fast access to Apple WWDC session metadata, transcripts, Code tab snippets, and Resources links.

Install it through skills.sh with one command, then let your agent use `wwdc-quick-look` whenever a WWDC question needs concrete session evidence. The installable skill lives in the lightweight `SwiftGGTeam/wwdc-quick-look-skill` repository. This repository contains the crawler, website, and published dataset that power the skill. The default path is local-first and no-key: it reads public Apple Developer pages, writes structured JSON and transcript text, and serves the latest archive from jsDelivr.

## Install With skills.sh

```sh
npx skills add SwiftGGTeam/wwdc-quick-look-skill
```

The skills CLI installs from the standalone `SwiftGGTeam/wwdc-quick-look-skill` repository, so users do not need to clone this larger data and website repository. This repository tracks the same skill as a Git submodule at `skills/wwdc-quick-look` for local development.

## What This Skill Does

Use `wwdc-quick-look` when a user asks about WWDC sessions, Apple platform announcements, sample code, demo projects, Code tab snippets, Resources links, or transcripts.

The skill can:

- list available WWDC years and topics
- search session titles, descriptions, Resources, and Code snippets
- show a session summary with resource and snippet counts
- display Resources links such as documentation, sample-code pages, GitHub repositories, and demo projects
- display Code tab snippets with timestamps and jump links
- read local or CDN-backed transcript text

## Repository Layout

```text
skills/
└── wwdc-quick-look/          # Submodule: SwiftGGTeam/wwdc-quick-look-skill
    ├── README.md
    ├── scripts/query.mjs    # Compatibility wrapper for local workflows
    └── wwdc-quick-look/     # Installable skill directory
        ├── SKILL.md
        ├── scripts/query.mjs
        └── references/data-schema.md

playground/
├── .agents/skills/wwdc-quick-look -> ../../../skills/wwdc-quick-look/wwdc-quick-look
└── .claude/skills/wwdc-quick-look -> ../../../skills/wwdc-quick-look/wwdc-quick-look

data/
├── index.json
├── wwdc20/
├── wwdc21/
├── wwdc22/
├── wwdc23/
├── wwdc24/
├── wwdc25/
├── wwdc26/
└── tech-talks/
```

`skills/wwdc-quick-look` is a submodule that points to the standalone skill repository. The installable skill lives one level deeper at `skills/wwdc-quick-look/wwdc-quick-look` so the skills CLI installs bundled scripts and references instead of only `SKILL.md`. The playground links expose that installable directory to agent runtimes that expect either `.agents/skills` or `.claude/skills`.

## Use The Query Script Directly

After installing the skill, agents call this script for you. For local testing or debugging, you can also run queries from the repository root:

```sh
node skills/wwdc-quick-look/scripts/query.mjs list-years
node skills/wwdc-quick-look/scripts/query.mjs search --year 2026 --keyword "Foundation Models"
node skills/wwdc-quick-look/scripts/query.mjs show-session --year 2026 --code 339
node skills/wwdc-quick-look/scripts/query.mjs resources --year 2026 --code 339
node skills/wwdc-quick-look/scripts/query.mjs code --year 2026 --code 339 --limit 3
node skills/wwdc-quick-look/scripts/query.mjs transcript --year 2026 --code 339 --limit 20
node skills/wwdc-quick-look/scripts/query.mjs search --event tech-talks --keyword "iPhone Duo"
node skills/wwdc-quick-look/scripts/query.mjs show-session --event tech-talks --code 111461
```

By default the query script reads the published CDN dataset:

```text
https://cdn.jsdelivr.net/gh/SwiftGGTeam/wwdc-quick-look@main/data/
```

For local testing, point it at another base URL:

```sh
WWDC_QUICK_LOOK_BASE_URL=http://127.0.0.1:8765 \
  node skills/wwdc-quick-look/scripts/query.mjs list-years
```

## Dataset Coverage

The committed local dataset covers WWDC 2020 through WWDC 2026, plus selected Apple Developer Tech Talks.

| Year | Sessions | Available transcripts | Sessions with Resources | Sessions with Code snippets |
|------|----------|-----------------------|--------------------------|-----------------------------|
| 2020 | 209 | 209 | 150 | 124 |
| 2021 | 202 | 202 | 176 | 127 |
| 2022 | 316 | 184 | 142 | 118 |
| 2023 | 316 | 181 | 122 | 100 |
| 2024 | 123 | 123 | 117 | 78 |
| 2025 | 122 | 122 | 113 | 81 |
| 2026 | 137 | 118 | 92 | 87 |

| Event | Sessions | Available transcripts | Sessions with Resources | Sessions with Code snippets |
|-------|----------|-----------------------|--------------------------|-----------------------------|
| Tech Talks (iPhone Duo set) | 6 | 6 | 0 | 5 |

Some Apple Developer entries are Q&A, Meet the Presenter, Study Hall, keynote, ASL, or community activity pages. When Apple publishes no timestamped transcript on the page, the manifest records that entry as `missing` instead of inventing text.

## Refresh The Archive

The crawler remains available for maintaining the dataset:

```sh
# Crawl one year into the published data directory.
node ./bin/wwdc-quick-look.js crawl --year 2026 --locale en --out-dir data/wwdc26

# Crawl selected Tech Talks into the published data directory.
node ./bin/wwdc-quick-look.js crawl \
  --event-id tech-talks \
  --event-short tech-talks \
  --html-url https://developer.apple.com/videos/tech-talks/ \
  --session-codes 111461,111462,111463,111464,111465,111466 \
  --out-dir data/tech-talks

# Rebuild the public event catalog.
node scripts/build-index.mjs
```

The combined crawl fetches public Apple Developer collection cards, enriches each session from its detail page, extracts Resources and Code tab snippets, and writes transcript text files plus a manifest.

Data refreshes are intentionally manual. Run the crawler locally for the year you want to update, rebuild `data/index.json`, review the diff, and commit the changed data files.

Only stable latest data is committed under `data/`: per-year `raw_data.json`, transcript files, transcript manifests, and `data/index.json`. Timestamped `raw_data_*.json` snapshots are local crawl artifacts and are ignored by Git.

## Published URLs

```text
# Catalog of every published year
https://cdn.jsdelivr.net/gh/SwiftGGTeam/wwdc-quick-look@main/data/index.json

# Per-year session metadata
https://cdn.jsdelivr.net/gh/SwiftGGTeam/wwdc-quick-look@main/data/wwdc26/raw_data.json

# Transcript manifest
https://cdn.jsdelivr.net/gh/SwiftGGTeam/wwdc-quick-look@main/data/wwdc26/transcripts-en/_manifest.json

# Single transcript
https://cdn.jsdelivr.net/gh/SwiftGGTeam/wwdc-quick-look@main/data/wwdc26/transcripts-en/339.txt
```

jsDelivr caches paths. Use a commit-pinned URL when byte-stable archival output matters.

## Development

```sh
npm test
npm run check
node ./bin/wwdc-quick-look.js help
```

After cloning this repository for development, initialize the skill submodule with `git submodule update --init --recursive`.

The package has no runtime npm dependencies and requires Node.js 20 or newer.

## Legal

Apple, WWDC, Apple Developer, Swift, Xcode, iOS, macOS, watchOS, tvOS, and visionOS are trademarks of Apple Inc. Apple session metadata, transcripts, videos, images, code snippets, and related resources belong to Apple or their respective rights holders. This repository's MIT license covers only the original code and documentation in this project.

The project logo and banner are WWDC-inspired branding created for this repository. They are not official Apple or WWDC logos. The project logo incorporates the SwiftGG brand mark.
