# Usage

[中文](USAGE.md)

## 1. Installation and compatibility

Choose one installation method:

- In DSH, open Plugins → Add plugin, search for `dsh-readpilot`, enable it, then refresh the page;
- Run `npm install dsh-readpilot`, then enable it in plugin management;
- Ask a DSH agent: “Install the dsh-readpilot plugin.”

Compatible with DSH `0.2.2-rc.2`–`0.2.x`. Refresh the page after upgrading; read [CHANGELOG.md](CHANGELOG.md) before a major upgrade.

## 2. Create a library

Open ReadPilot and choose a local book folder as the library. Books are not copied; after adding a book, refresh or wait for the watcher to update.

- Supports `.txt`, `.md`, `.epub` and `.pdf`;
- Scanned PDFs can be read page by page in original mode, but have no text layer: search, reflow, annotations and summaries are unavailable;
- When the same content appears at multiple paths, the library header shows Review copies. Deleting removes the selected file from disk permanently. Copies with annotations, progress or notes cannot be deleted; when the primary record is deleted, a copy with no user data inherits the original `bookId`.

## 3. Open and read

Click a book in the library to open the reader. The top bar provides Original/Reflow, Scroll/Paged, Single/Double page, plus Table of contents, Search, Bookmarks, Translate and Aa Reader settings.

- **Reader settings**: font size, palette and glass intensity; reflow pagination and layout adapt to the window size.
- **PDF**: original double-page mode supports selection on both pages; when an outline exists, the table of contents jumps by page; scanned PDFs also support page jumps, but only in original mode.
- **EPUB**: original mode preserves the book's styles; reflow uses chapter text; short title-only chapters merge with the adjacent chapter.
- **Markdown**: GFM headings, tables, task/nested lists, quotes, code, footnotes, strikethrough, autolinks and inline images; raw HTML is displayed as text.
- **Sidebar reading**: a workspace conversation can open a single-page sidebar reader; progress stays in sync with the main reader. The top-bar Table of contents floats over the text: chapters in text mode, pages for PDF originals and scans, without taking layout space. The companion panel can be widened while keeping the minimum space for the table of contents and text.
- **Paging and translations**: changing font size, page width, single/double page or inline translations repaginates and keeps the current content anchor.

Shortcuts: `F` or `Ctrl/Cmd+F` for search, `B` for a bookmark, arrow keys / `PageUp` / `PageDown` / Space to turn pages in paged mode, `Esc` to close search or clear the selection. The search and bookmark combinations can be changed in DSH shortcut settings.

## 4. Selection, annotations and notes

Selecting text opens a floating toolbar:

- **Color dots**: create a highlight immediately;
- **Annotate**: open an editor where you can add text and change color; leaving the body empty keeps it a highlight;
- **Ask companion**: insert the selected text as a quote into the current companion conversation;
- **Translate**: view a translation through the host translation service without entering the companion context;
- **Prompts**: apply a template (see section 5).

Annotations and bookmarks share the Notes tab: filter by chapter/color, collapse, jump and delete. A bookmark label stays on the page where it was created and does not follow the current page; highlights are restored between reflow and original modes by quote and anchor.

When search results are truncated, More results opens a dialog with every match in the current book and supports jumps (up to 5,000 results).

### Translation

- Reader-bar Translate toggle: off by default when a book opens; the first toggle or first selection translation shows a privacy confirmation, and translation only starts after confirmation; cancel leaves it off. Temporarily switching panels preserves the toggle. The text is shown inline as bilingual text and translates visible paragraphs; TXT / Markdown / EPUB / PDF reflow are supported; both the main reader and the workspace sidebar reader have the button. In paged mode, inserted translations repaginate and restore the position by block;
- Translation selections cannot create body highlights or annotations; only Translate and Ask companion remain;
- The Translate ▾ popover switches target language and provider (Bing by default), shows the privacy notice and clears the cache; the source text is sent to the selected online translation service, so it leaves this device, while translations are cached locally only;
- Selected text can still be translated separately and copied from the card near the selection;
- Anonymous Google/Bing providers need no conversation token and are not written to the companion context; the paid DeepSeek provider needs the current companion conversation;
- PDF and EPUB originals do not insert inline translations; only selection translation is available;
- Translations are cached by text hash in `$DSH_HOME/dsh-readpilot/translations.json`;
- When you need tone or terminology explanations, use the AI translation prompt.

## 5. Prompts

There are 12 built-in templates for explanation, terms, AI translation, follow-up, summary and more. `{{selection}}`, `{{book}}`, `{{chapter}}` and `{{notes}}` are replaced with the selection, book title, chapter and this book's annotations, then filled into the companion composer; review or edit before sending.

Prompt preset management lets you create, edit and delete templates or restore defaults. Presets are stored in `$DSH_HOME/dsh-readpilot/presets.json`; titles are limited to 40 characters and templates to 4,000 characters.

## 6. Companion and Agent

Each book has its own companion conversation. The right panel switches between Chat, Notes, Long notes, Memory and Role. You can ask questions directly or let the Agent operate the reader and library.

The top of the Chat tab shows the current companion conversation. Click the title to create a new conversation or bind an old one from the current library workspace; a conversation belongs to one book at a time, and rebinding unbinds the previous book. Switching to a running conversation does not stop its original task.

| Goal | Say | What the Agent does |
|---|---|---|
| Open, locate | “Open Book Title and jump to chapter 3” | Opens the book and moves the reading position |
| Find in book | “Find ... in this book” | Searches the library or the book text |
| Read a passage | “Read the first 2,000 characters of chapter 2” | Reads by chapter and offset, returning the continuation point |
| Annotate | “Highlight this sentence and annotate: ...” | Creates a highlight or annotation |
| Edit or delete | “Change the previous annotation to ...” | Rewrites or deletes by noteId |
| Tags, status | “Tag: to read; mark as reading” | Changes library metadata |
| Long note | “Turn this chapter into a topic note” | Creates a draft or writes a long note |
| Whole book | “Summarize the whole book” | Answers from an extractive whole-book digest |
| Sidebar reading | “Open this book on the right” | Opens the single-page sidebar reader |
| Memory | “Remember that I dislike spoilers” | Writes a long-term preference when memory is on |

Include the book title when several books are in play. Before editing an existing annotation, ask the Agent to list annotations or provide a noteId so it does not create a similar new record.

### Writes and drafts

Annotations, tags and reading status are written directly and refresh the reader. Long notes produce a draft by default: review the diff, then apply; only Auto-apply companion notes writes directly. Note bodies contain only document content; status reminders are explained by the companion in its reply, and applying a draft does not automatically open the preview. Confirm before deleting annotations or long notes; deleted items can be undone from History, but clearing history cannot be undone.

### Note context

“Let the companion know this book's notes” is off by default. When enabled, notes are injected into the companion conversation as `<reading_notes>` context: by default an index (title, id, path, character count and annotated highlights) with a budget of about 3,000 characters. Use `reader_notes` action `read` with the id when the full body is needed. Index entries that do not fit are omitted and paths are listed at the end where possible.

When globally off, no book injects notes; when globally on, each book can follow, always enable or always disable. This switch only controls default injection and does not restrict the `reader_notes` tool: with it off, the Agent can still find and read notes through `index` / `read`.

### Memory

Memory is off by default. The Memory tab sets the default and lets this book follow, always enable or always disable it. When on, the companion can record stable reading preferences, views about the book or author, long-term questions and similar facts; the Reader card records cross-book preferences. Keep each item concise (about 60 characters); each card is limited to 600 characters. Memory stores only durable information and does not record plot details, one-off questions or reading progress.

Every overwrite or clear keeps a history snapshot, up to 10 entries. Expand an entry to view the old body; Book memory and the Reader card both support restoring a selected version, deleting one entry or clearing all history. Restoring first saves the current body to history; deleting and clearing require confirmation and do not change the current card.

### Role

The Role tab sets whose identity the companion answers as. A global role is reusable across books; a per-book role can override it. When this book’s switch is on and its card is non-empty, it is used; otherwise the global role applies, and an empty global role falls back to the original reading-assistant identity prompt without role-play. Sessions not bound to a book receive no role prompt. A role card holds identity, name, tone and way of thinking; the companion answers directly in the first person and does not say it is playing a role. The character background and knowledge limits only shape style and never block tasks or tool use. It only states its real identity when you explicitly ask or ask it to stop. Up to 600 characters, with history, undo and restore. The default role includes a concise, no-spoiler style; a custom role may change that style but never overrides system rules, tool permissions or quotation rules.

### History and undo

Reader-bar History lists Agent writes for the current book from the last 10 minutes: annotation add/change/delete, long-note write/delete, tags and reading status. Each undoable item has an Undo button; after undoing, refresh the reader or library. Chapter jumps and sidebar opens write no data and do not enter History.

## 7. Long notes

The Long notes tab supports:

- Creating a whole-book note or a topic note;
- Using Favorite on an assistant answer to save that question and answer as a topic long note;
- Opening the Markdown file in an external editor;
- Reviewing an Agent draft diff, then applying or rejecting it;
- Writing directly when auto-apply is on;
- Viewing history, restoring versions, deleting or clearing history;
- Hiding the export, note-context and auto-apply sections in Long-note display settings.

Long notes live in the library `notes/` directory and can be edited with any file editor; the preview is read-only and refreshes after reopening the tab or clicking refresh. If the file was changed externally when applying a draft, the operation returns a conflict and keeps the draft.

## 8. Export

- **Export Markdown**: merge the current book's whole-book notes, topic notes, annotations and bookmarks into `《Book Title》-阅读笔记.md` and download it;
- **Export ZIP**: package the original long-note files under `notes/` and the manifest as `《Book Title》-长笔记.zip`.

Exports download directly and are not written into the library; they do not include memory, drafts, history or the library index.

## 9. Backup and migration

Backup and restore in Settings exports a ReadPilot data zip. Backups include annotations, long notes, prompt presets, memory, role cards, reading progress, tags/status/rating and companion settings; they exclude book files, workspaces, sessions and caches.

When moving machines, copy the book folder to the new machine, choose the backup zip and target library, then confirm Overwrite restore:

- Books are matched by file content, not path or title;
- Data for matched books is overwritten; books missing from the backup are skipped, and extra books in the target library remain unchanged;
- A snapshot is created before restoring, with rollback attempted on failure;
- Sessions are not migrated; the target's currently bound companion conversation is kept.

## 10. Data and privacy

Books are not copied or uploaded. Settings, progress, session bindings and parse cache live in `$DSH_HOME/dsh-readpilot/`; the translation cache is `translations.json` in the same directory; EPUB assets are in `assets/` and PDF page cache in `cache/pages/`; long notes and exports are in the library `notes/`. Translation sends only the selected paragraph or currently visible paragraphs to the selected online translation service, and the source text leaves this device.

## 11. Help and FAQ

The top-bar “?” opens the help manual: browse setup, reading, annotations/prompts, translation and bilingual reading, companion, role, long notes, history, shortcuts and FAQ. The footer links to the full USAGE and GitHub.

- **Scanned PDF cannot be searched or annotated?** It can only be viewed page by page in original mode; use an OCR tool to create a PDF with a text layer first.
- **Does translation upload the whole book?** No; only the selected paragraph or currently visible paragraphs are sent, and the translation cache can be cleared from Translate ▾.
- **Companion conversation expired?** Sending a message creates a new one automatically; archiving an old conversation does not affect book data. The top of the chat can also bind an old conversation from the workspace.
- **Search results incomplete?** Use More results to open every match in the current book.
- **Note conflict?** When an external editor changed the file, refresh or reapply the draft first.
