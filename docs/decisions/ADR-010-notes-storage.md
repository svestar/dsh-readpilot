# ADR-010：笔记分层与工作区存储

- **状态：** accepted
- **日期：** 2026-11-03
- **范围：** FTR-008、FTR-018、FTR-020

## 背景

现有笔记是 `$DSH_HOME/dsh-readpilot/notes/<bookId>.json` 的单一数组，kind 为 note/highlight/bookmark，正文上限 4000 字符，按块与偏移锚定原文。它适合划线、批注与短评，但不适合章节长笔记、整书笔记和自由主题笔记；这些内容需要 markdown、可由用户直接编辑、可由伴读按上下文读取。用户要求笔记目录位于书库工作区内且可见。

## 决策

1. 两层存储：锚定短笔记（note/highlight/bookmark）继续用现有 JSON 与 `src/notes.ts`；长笔记与整书笔记用书库工作区的 markdown 文件。
2. 可见目录 `<library>/notes/`，首次创建时写入 `.dsh-readpilot-notes` 标记；`scanLibrary` 只在标记存在时跳过该目录，避免误吞用户已有的同名书目录。
3. 每本书一个子目录（`<book-slug>-<bookId8>`），`book.md` 固定为整书笔记，其余 `.md` 都是自由主题笔记；不生成 `index.md`，索引由 Host 扫描文件名与 front-matter 在内存构建。
4. front-matter 记录 `id`、`title`、`bookId`、`created`、`updated`；文件名用于展示，`id` 用于链接，重命名由 UI 更新引用。
5. `.history/` 存版本快照，`.pending/` 存伴读草稿，`.exports/` 存一次性导出；三者隐藏，不参与笔记列表与上下文。
6. 一次性导出为单篇 markdown：整书笔记、主题笔记、划线/批注/书签摘要；默认下载，可保存到 `.exports/`；不含记忆与草稿。
7. 记忆不放在 `notes/`，见 ADR-011。

## 备选方案

- 全部放 `$DSH_HOME`：不污染书库，但用户无法在文件树中直接看到与编辑，违背“阅读工作区的笔记目录”。
- 每本书一个 `book.md` 分章节：文件少，但自由主题与并发编辑冲突，整书笔记和主题笔记混在一起。
- 保持单一 JSON：改动最小，但 markdown、长文、外部编辑与 agent 工具都不合适。
- 把记忆也放 `notes/_memory`：可见，但会混入导出与上下文，且记忆是 agent 状态而非用户文稿。

## 后果

收益：短笔记保持锚点、高亮与跳转；长笔记可被用户、编辑器和伴读共同读写；导出简单；笔记随书库一起搬走。

代价：书库目录被写入；书改名或移动导致 `bookId` 变化后目录成孤儿；用户可能在 UI 外重命名文件导致链接失效；可见目录需要 marker 保护；导出文件若不排除会被当成笔记。

验证：marker 存在与缺失时的扫描行为；主题笔记 CRUD、front-matter 解析、重命名与冲突；导出内容与排除项；旧 JSON 笔记导出。
