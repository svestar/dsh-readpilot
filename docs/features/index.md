# 功能索引

每个功能一行；ID 格式为 `FTR-NNN`，名称不超过 12 字。路径相对仓库根目录，多路径以分号分隔。状态仅用 `active` 或 `deprecated`。

| ID | 名称 | 文档路径 | 代码路径 | 测试路径 | 状态 |
|---|---|---|---|---|---|
| `FTR-001` | 书库配置 | `docs/features/FTR-001-library.md` | `src/api.ts` | `tests/api.test.ts;tests/library.test.ts` | active |
| `FTR-002` | 文本阅读 | `docs/features/FTR-002-reading.md` | `src/formats.ts` | `tests/formats.test.ts;tests/api.test.ts` | active |
| `FTR-003` | 伴读与检索 | `docs/features/FTR-003-companion.md` | `src/api.ts` | `tests/api.test.ts` | active |
| `FTR-004` | Agent 工具 | `docs/features/FTR-004-tools.md` | `src/tools.ts` | `tests/tools.test.ts` | active |
| `FTR-005` | 伴读面板 | `docs/features/FTR-005-companion-panel.md` | `src/client/views/native-companion.ts` | `tests/client-chat.test.ts;tests/client-assembly.test.ts` | active |
| `FTR-006` | EPUB 文本 | `docs/features/FTR-006-epub.md` | `src/formats/epub.ts` | `tests/epub.test.ts` | active |
| `FTR-007` | PDF 文本 | `docs/features/FTR-007-pdf.md` | `src/formats/pdf.ts` | `tests/pdf.test.ts` | active |
| `FTR-008` | 检索与笔记 | `docs/features/FTR-008-search-notes.md` | `src/notes.ts` | `tests/notes.test.ts` | active |
| `FTR-009` | PDF 视觉 | `docs/features/FTR-009-pdf-visual.md` | `src/visual/pdf.ts` | `tests/pdf-visual.test.ts` | active |
| `FTR-010` | EPUB 视觉 | `docs/features/FTR-010-epub-visual.md` | `src/visual/epub.ts` | `tests/epub-visual.test.ts` | active |
| `FTR-011` | 阅读配色 | `docs/features/FTR-011-palette.md` | `src/client/helpers.ts` | `tests/palette.test.ts` | active |
| `FTR-012` | 笔记高亮 | `docs/features/FTR-012-note-highlight.md` | `src/client/helpers.ts` | `tests/highlight.test.ts;tests/selection-toolbar.test.ts;tests/selection-dismiss.test.ts` | active |
| `FTR-013` | 书库整理 | `docs/features/FTR-013-library-organization.md` | `src/library-meta.ts` | `tests/library-organization.test.ts` | active |
| `FTR-014` | EPUB 章节合并 | `docs/features/FTR-014-epub-chapter-merge.md` | `src/formats/epub.ts` | `tests/epub.test.ts` | active |
| `FTR-015` | 文本编码 | `docs/features/FTR-015-text-encoding.md` | `src/formats.ts` | `tests/formats.test.ts` | active |
| `FTR-016` | 阅读锚点 | `docs/features/FTR-016-reading-anchor.md` | `src/client/anchor.ts` | `tests/reading-anchor.test.ts` | active |
| `FTR-017` | 阅读助手 | `docs/features/FTR-017-reading-assistant.md` | `src/workspace-prompt.ts` | `tests/prompt.test.ts` | active |
| `FTR-018` | 批注与书签 | `docs/features/FTR-018-marks.md` | `src/notes.ts` | `tests/marks.test.ts` | active |
| `FTR-019` | 分页阅读 | `docs/features/FTR-019-paged-reading.md` | `src/client/paging.ts` | `tests/paging.test.ts;tests/client-assembly.test.ts;tests/api.test.ts` | active |
| `FTR-020` | 长笔记 | `docs/features/FTR-020-long-notes.md` | `src/note-files.ts` | `tests/note-files.test.ts;tests/api.test.ts;tests/note-resource.test.ts` | active |
| `FTR-021` | 笔记上下文 | `docs/features/FTR-021-note-context.md` | `src/notes-context.ts` | `tests/notes-context.test.ts;tests/api.test.ts` | active |
| `FTR-022` | 笔记草稿 | `docs/features/FTR-022-note-drafts.md` | `src/note-drafts.ts` | `tests/note-drafts.test.ts;tests/api.test.ts` | active |
| `FTR-023` | 记忆 | `docs/features/FTR-023-memory.md` | `src/companion-settings.ts` | `tests/memory.test.ts` | active |
| `FTR-024` | 笔记导出 | `docs/features/FTR-024-note-export.md` | `src/note-export.ts` | `tests/note-export.test.ts;tests/api.test.ts` | active |
| `FTR-025` | 笔记历史 | `docs/features/FTR-025-note-history.md` | `src/note-files.ts` | `tests/note-history.test.ts;tests/api.test.ts` | active |
| `FTR-026` | 对话页码跳转 | `docs/features/FTR-026-chat-jump.md` | `src/jump-url.ts` | `tests/chat-jump.test.ts;tests/sidebar-reader.test.ts` | active |
| `FTR-027` | 阅读状态与评分 | `docs/features/FTR-027-read-status.md` | `src/library-meta.ts` | `tests/library-organization.test.ts` | active |
| `FTR-028` | 真实封面 | `docs/features/FTR-028-covers.md` | `src/visual/epub.ts` | `tests/cover.test.ts` | active |
| `FTR-029` | 键盘快捷键 | `docs/features/FTR-029-shortcuts.md` | `src/client/shortcuts.ts` | `tests/shortcuts.test.ts` | active |
| `FTR-030` | 批注总览 | `docs/features/FTR-030-annotations-overview.md` | `src/client/mark-filters.ts` | `tests/mark-filters.test.ts` | active |
| `FTR-031` | 重排阅读 | `docs/features/FTR-031-reflow.md` | `src/client/reader-screen.ts` | `tests/epub-visual.test.ts;tests/pdf.test.ts;tests/epub.test.ts` | active |
| `FTR-032` | 阅读设置 | `docs/features/FTR-032-reader-settings.md` | `src/client/reader-settings.ts` | `tests/paging.test.ts` | active |
| `FTR-033` | 阅读位置锚点 | `docs/features/FTR-033-reading-anchor.md` | `src/client/paging.ts` | `tests/paging.test.ts;tests/api.test.ts` | active |
| `FTR-034` | 工作区跳转 | `docs/features/FTR-034-workspace-jump.md` | `src/client/views/header.ts` | `tests/api.test.ts` | active |
| `FTR-035` | 工作区侧边栏阅读 | `docs/features/FTR-035-workspace-sidebar-reader.md` | `src/client/views/sidebar-reader.ts` | `tests/api.test.ts;tests/paging.test.ts;tests/client-assembly.test.ts;tests/progress-sync.test.ts;tests/sidebar-reader.test.ts;tests/reader-resource.test.ts` | active |
| `FTR-036` | 伴读对话标题 | `docs/features/FTR-036-companion-title.md` | `src/client/session-title.ts` | `tests/session-title.test.ts` | active |
| `FTR-037` | Agent 阅读上下文 | `docs/features/FTR-037-agent-context.md` | `src/tools.ts` | `tests/api.test.ts` | active |
| `FTR-038` | 阅读感知 | `docs/features/FTR-038-reading-perception.md` | `src/client/plugin.ts` | `tests/api.test.ts` | active |
| `FTR-039` | 全书概括 | `docs/features/FTR-039-whole-book-digest.md` | `src/digest.ts` | `tests/digest.test.ts;tests/tools.test.ts` | active |
| `FTR-040` | 跨模式划线锚点 | `docs/features/FTR-040-cross-mode-anchor.md` | `src/notes.ts` | `tests/anchor.test.ts;tests/notes.test.ts` | active |
| `FTR-041` | 工具结果卡片 | `docs/features/FTR-041-tool-cards.md` | `src/client/views/reader-tool-view.ts` | `tests/reader-tool-view.test.ts` | active |
| `FTR-042` | 提示词预设 | `docs/features/FTR-042-prompt-presets.md` | `src/prompt-presets.ts` | `tests/prompt-presets.test.ts` | active |
| `FTR-043` | Agent 阅读动作 | `docs/features/FTR-043-agent-actions.md` | `src/reader-actions.ts` | `tests/reader-actions.test.ts;tests/tools.test.ts` | active |
| `FTR-044` | 动作回执与撤销 | `docs/features/FTR-044-action-undo.md` | `src/reader-actions.ts` | `tests/reader-actions.test.ts;tests/tools.test.ts` | active |
| `FTR-045` | 书籍身份与迁移 | `docs/features/FTR-045-book-identity.md` | `src/library.ts` | `tests/library-index.test.ts;tests/api.test.ts` | active |
| `FTR-046` | 备份与覆盖恢复 | `docs/features/FTR-046-backup-restore.md` | `src/backup.ts` | `tests/backup.test.ts` | active |
| `FTR-047` | 扫描版 PDF | `docs/features/FTR-047-scanned-pdf.md` | `src/formats/pdf.ts` | `tests/pdf.test.ts;tests/paging.test.ts;tests/api.test.ts` | active |
| `FTR-048` | Kindle 格式提示 | `docs/features/FTR-048-kindle-hint.md` | `src/formats.ts` | `tests/library.test.ts;tests/api.test.ts` | active |
