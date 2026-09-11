<p align="center">
  <img src="assets/wwdc-quick-look-logo.png" alt="WWDC Quick Look Logo" width="180" />
</p>

![WWDC Quick Look banner](assets/wwdc-quick-look-banner.png)

# WWDC Quick Look Skill

[README-中文](README-CN.md)
[README-English](README.md)
[README-日本語](README-JP.md)
[HomePage](https://wwdc-quick-look.swiftgg.team)

WWDC Quick Look 是一个面向 Agent 的本地 skill，用来快速查询 Apple WWDC session 的元数据、视频逐字稿、Code tab 代码片段和 Resources 链接。

推荐通过 skills.sh 一条命令分发和安装，然后让 Agent 在遇到 WWDC 问题时直接调用 `wwdc-quick-look`。可安装的 skill 已拆到轻量仓库 `SwiftGGTeam/wwdc-quick-look-skill`。当前仓库保留支撑该 skill 的爬取脚本、网站和发布数据。默认工作流是 local-first、no-key：从公开 Apple Developer 页面读取内容，写成结构化 JSON 和 transcript 文本，并通过 jsDelivr 提供最新归档。

## 通过 skills.sh 安装

```sh
npx skills add SwiftGGTeam/wwdc-quick-look-skill
```

skills CLI 会从独立的 `SwiftGGTeam/wwdc-quick-look-skill` 仓库安装，因此用户不需要 clone 当前这个更大的数据和网站仓库。当前仓库通过 Git submodule 在 `skills/wwdc-quick-look` 引用同一份 skill，方便本地开发同步。

## 这个 Skill 能做什么

当用户询问 WWDC session、Apple 平台新特性、示例代码、demo 工程、Code tab、Resources 链接或逐字稿时，使用 `wwdc-quick-look`。

它可以：

- 列出可用 WWDC 年份和主题
- 搜索 session 标题、描述、Resources 和 Code snippets
- 展示单个 session 摘要，包括资源数量和代码片段数量
- 展示 Resources 链接，例如文档、sample-code 页面、GitHub 仓库和 demo 工程
- 展示带时间戳和跳转链接的 Code tab 代码片段
- 读取本地或 CDN 数据中的 transcript 文本

## 仓库结构

```text
skills/
└── wwdc-quick-look/          # Submodule: SwiftGGTeam/wwdc-quick-look-skill
    ├── README.md
    ├── scripts/query.mjs    # 本地 workflow 兼容入口
    └── wwdc-quick-look/     # 可安装的 skill 目录
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

`skills/wwdc-quick-look` 是指向独立 skill 仓库的 submodule。可安装的 skill 实际位于 `skills/wwdc-quick-look/wwdc-quick-look`，这样 skills CLI 会安装完整目录，包括 bundled scripts 和 references，而不是只安装 `SKILL.md`。`playground` 下的两个软链接让需要 `.agents/skills` 或 `.claude/skills` 的 Agent 运行时都能加载这个可安装目录。

## 直接运行查询脚本

安装 skill 后，Agent 会按需调用这个脚本。调试或本地验证时，也可以在仓库根目录直接运行：

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

查询脚本默认读取公开 CDN 数据：

```text
https://cdn.jsdelivr.net/gh/SwiftGGTeam/wwdc-quick-look@main/data/
```

本地测试时可以覆盖数据源：

```sh
WWDC_QUICK_LOOK_BASE_URL=http://127.0.0.1:8765 \
  node skills/wwdc-quick-look/scripts/query.mjs list-years
```

## 数据覆盖

本地已提交的数据覆盖 WWDC 2020 到 WWDC 2026，以及部分 Apple Developer Tech Talks。

| 年份 | Sessions | 可用 transcripts | 含 Resources 的 sessions | 含 Code snippets 的 sessions |
|------|----------|------------------|---------------------------|------------------------------|
| 2020 | 209 | 209 | 150 | 124 |
| 2021 | 202 | 202 | 176 | 127 |
| 2022 | 316 | 184 | 142 | 118 |
| 2023 | 316 | 181 | 122 | 100 |
| 2024 | 123 | 123 | 117 | 78 |
| 2025 | 122 | 122 | 113 | 81 |
| 2026 | 137 | 118 | 92 | 87 |

| 事件 | Sessions | 可用 transcripts | 含 Resources 的 sessions | 含 Code snippets 的 sessions |
|------|----------|------------------|---------------------------|------------------------------|
| Tech Talks（iPhone Duo 系列） | 6 | 6 | 0 | 5 |

部分 Apple Developer 条目是 Q&A、Meet the Presenter、Study Hall、keynote、ASL 或社区活动页面。Apple 页面没有公开 timestamp transcript 时，manifest 会把该条目标记为 `missing`，不会伪造文本。

## 刷新数据

爬取脚本仍然保留，用于维护数据集：

```sh
# 爬取某一年并写入发布数据目录。
node ./bin/wwdc-quick-look.js crawl --year 2026 --locale en --out-dir data/wwdc26

# 爬取选定的 Tech Talks 并写入发布数据目录。
node ./bin/wwdc-quick-look.js crawl \
  --event-id tech-talks \
  --event-short tech-talks \
  --html-url https://developer.apple.com/videos/tech-talks/ \
  --session-codes 111461,111462,111463,111464,111465,111466 \
  --out-dir data/tech-talks

# 重建事件索引。
node scripts/build-index.mjs
```

组合爬取流程会读取公开 Apple Developer collection cards，进入每个 session 详情页补充 Resources 和 Code tab 代码片段，并写入 transcript 文本和 manifest。

数据刷新改为纯手动维护。需要更新哪一年，就在本地运行爬取命令，重建 `data/index.json`，检查 diff 后再提交对应数据文件。

仓库发布数据只提交稳定 latest：每年的 `raw_data.json`、transcript 文件、transcript manifest，以及 `data/index.json`。时间戳形式的 `raw_data_*.json` 是本地爬取快照，已被 Git 忽略。

## 发布地址

```text
# 所有已发布年份目录
https://cdn.jsdelivr.net/gh/SwiftGGTeam/wwdc-quick-look@main/data/index.json

# 单年 session 元数据
https://cdn.jsdelivr.net/gh/SwiftGGTeam/wwdc-quick-look@main/data/wwdc26/raw_data.json

# Transcript manifest
https://cdn.jsdelivr.net/gh/SwiftGGTeam/wwdc-quick-look@main/data/wwdc26/transcripts-en/_manifest.json

# 单个 transcript
https://cdn.jsdelivr.net/gh/SwiftGGTeam/wwdc-quick-look@main/data/wwdc26/transcripts-en/339.txt
```

jsDelivr 会缓存路径。需要字节级稳定归档时，请使用绑定 commit 的 URL。

## 开发

```sh
npm test
npm run check
node ./bin/wwdc-quick-look.js help
```

开发者 clone 当前仓库后，需要运行 `git submodule update --init --recursive` 初始化 skill submodule。

项目没有运行时 npm 依赖，需要 Node.js 20 或更高版本。

## 法律说明

Apple、WWDC、Apple Developer、Swift、Xcode、iOS、macOS、watchOS、tvOS 和 visionOS 是 Apple Inc. 的商标。Apple session 元数据、transcript、视频、图片、代码片段和相关资源归 Apple 或对应权利方所有。本仓库的 MIT license 只覆盖项目原创代码和文档。

项目 Logo 与头图是为本仓库创作的 WWDC 风格品牌视觉，不是 Apple 或 WWDC 官方 Logo。项目 Logo 中使用了 SwiftGG 品牌标志。
