# ReadPilot

<img src="icon.svg" width="76" align="right" alt="ReadPilot">

A reading plugin for the DSH (DeepSeek Harness) Web GUI. It supports TXT, Markdown, EPUB and PDF, with original/reflow reading, pagination, annotations, translation, a native companion session, long notes and backups in one workspace.

[![npm version](https://img.shields.io/npm/v/dsh-readpilot.svg)](https://www.npmjs.com/package/dsh-readpilot) [![license](https://img.shields.io/badge/license-MIT-1f6f5c.svg)](LICENSE) · [Usage](USAGE.en.md) · [Changelog](CHANGELOG.md) · [中文](README.md)

## Features

### Reading

- Four formats; original/reflow, scroll/paged, single/double page.
- Table of contents, search, bookmarks and page jumps; scanned PDFs open page by page in original mode.
- Single-page reading in the workspace sidebar; a floating table of contents overlays the text without changing the layout.

### Translation and companion

- Select text to translate; the Translate toggle in the reader bar adds inline bilingual text. A privacy confirmation appears on first use.
- Each book has a native DSH session; create a new one or bind an existing workspace conversation.
- Selection quotes, prompt presets and agent reading actions; tool cards, reasoning and approval stay in the host.
- Translations are cached locally and never written to the companion context.

### Notes and data

- Five highlight colors, annotations, bookmarks, filters and jumps.
- Long notes in Markdown, draft diffs, history restore and export.
- Memory (including an independent role/style card), note context, backup and restore.

## Installation

Search for `dsh-readpilot` in DSH under Plugins → Add plugin, enable it, then refresh the page.

You can also run:

```bash
npm install dsh-readpilot
```

Compatible with DSH `0.2.2-rc.2`–`0.2.x`.

## Quick start

1. Open ReadPilot and choose a local book folder as the library.
2. Open a book and adjust the layout with Aa reader settings.
3. Select text to highlight or annotate; enable Translate in the reader bar for bilingual text; open the companion panel on the right.

Full steps: [USAGE.en.md](USAGE.en.md).

## Data and privacy

- **Books**: not copied or uploaded.
- **Translation**: only the selected or visible paragraphs are sent to the selected online translation service; the source text leaves this device. Translations are cached locally only and are not written to the companion conversation.
- **Local data**: settings, progress, session bindings, parse cache and translation cache live in `$DSH_HOME/dsh-readpilot/`; long notes live in the library `notes/`.
- **Backup**: includes annotations, long notes, prompt presets, memory, reading progress, tags/status/rating and companion settings; excludes books, workspaces, sessions and caches.

## Development and architecture

Requires Node 22.18+ and pnpm.

```bash
pnpm run verify
pnpm run smoke
```

`verify` covers typecheck, boundaries, build, test, sizes, docs, paths and the package check; `smoke` validates installation and the RPC surface in a throwaway `DSH_HOME`.

```text
index.ts                       Host entry
src/host/modules/<feature>/    Host modules: library, reading, notes, companion, translation, etc.
src/client/modules/<feature>/  Client modules: reader, library, notes, sidebar, etc.
src/shared/                    Shared contracts, Markdown, jump links and prompt rendering
```

See [docs/features/index.md](docs/features/index.md) for the feature list and [docs/decisions/](docs/decisions/) for architecture decisions.

## License

[MIT](LICENSE)
