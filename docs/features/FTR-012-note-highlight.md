# 笔记高亮

- **ID：** FTR-012
- **名称：** 笔记高亮
- **状态：** active
- **代码：** `src/client/helpers.ts`（`findNoteOccurrence`、`collectTextNodes`、`rangeForNote`、`applyEpubNoteMarks`）；`src/client/hooks/use-notes.ts`（`useNotes`）；`src/client/views/selection-note.ts`（`NoteDialog`）；`src/client/views/notes-search.ts`（`NotesBody`）；`src/client/plugin.ts`（`ReaderPanel`）
- **测试：** `tests/highlight.test.ts`

## 行为

保存含引用原文的笔记后，阅读界面在正文中高亮该 `quote`；打开书籍或切换章节时，已有笔记的引用同样自动高亮。txt/md 文本块、PDF 文本层 overlay 与 EPUB iframe 三种阅读面都显示高亮。点击高亮可打开编辑框并预填原笔记，保存通过 `notes` 的 `update` 更新，删除通过 `delete`，完成后立即刷新正文高亮与右栏列表。右栏每条笔记提供“跳转”按钮，点击跳到对应章节与块；点击笔记主体同样跳转。EPUB 跳转会在 iframe 内滚动到对应 mark 并短暂描边，因此 iframe 自身有滚动条时也能定位到引文。

## 接口与代码映射

| 入口/符号 | 位置 | 职责 |
|---|---|---|
| `findNoteOccurrence` | `src/client/helpers.ts:findNoteOccurrence` | 在章节文本中定位 quote 的起止位置，优先采用笔记记录的偏移 |
| `useNotes` | `src/client/hooks/use-notes.ts:useNotes` | 笔记加载、编辑保存、overlay 与 EPUB mark |
| `NoteDialog` / `NotesBody` | `src/client/views/selection-note.ts:NoteDialog`；`src/client/views/notes-search.ts:NotesBody` | 编辑对话框与右栏笔记列表 |
| `ReaderPanel` | `src/client/plugin.ts:ReaderPanel` | 组合阅读器、笔记层与弹层 |
| `handleNotes` | `src/api.ts:handleNotes` | 处理 `update` / `delete` 等笔记持久化操作 |

## 约束与失败行为

quote 在章节文本中找不到时不高亮，但笔记列表点击仍按记录的块与偏移跳转，不报错。高亮使用独立 overlay 或 EPUB iframe 内注入的 mark 元素实现，不修改原书内容与脚本；EPUB 只增加标记与配色样式，不改变原书布局。编辑保存或删除后，正文高亮与右栏列表同步刷新；操作失败时保留原笔记并显示错误。高亮颜色取自当前配色的 `--reader-highlight`，切换配色后随之更新。quote 为空或缺少定位信息时不渲染高亮。

## 验收与测试

- 正常路径：定位 quote 时优先命中笔记记录的偏移，返回对应起止位置（`find_note_occurrence_prefers_offset`）。
- 边界：quote 不在文本中时返回空结果且不产生高亮（`find_note_occurrence_missing`）。
