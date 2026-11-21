# 笔记高亮

- **ID：** FTR-012
- **名称：** 笔记高亮
- **状态：** active
- **代码：** `src/client/modules/notes/anchors.ts`（`findNoteOccurrence`、`noteBlockMatch`、`resolveNoteBlock`）；`src/client/modules/notes/use-notes.ts`（`useNotes`）；`src/client/modules/notes/use-note-marks.ts`（`useNoteMarks`）；`src/client/lib/helpers.ts`（`blockJumpFraction`、`noteLayoutKey`）；`src/client/modules/reader/use-reader-view.ts`（`scrollToBlock`）；`src/client/modules/reader/use-selection-dismiss.ts`（`useSelectionDismiss`）；`src/client/modules/reader/SelectionNote.ts`（`SelectionToolbar`、`NoteDialog`）；`src/client/modules/notes/NotesBodyView.ts`（`NotesBody`）；`src/client/modules/reader/ReaderPanelView.ts`（`ReaderPanelView`）
- **测试：** `tests/highlight.test.ts`；`tests/selection-toolbar.test.ts`；`tests/selection-dismiss.test.ts`

## 行为

保存含引用原文的批注后，阅读界面在正文中高亮该 `quote`；批注记录章节偏移与块哈希，优先按偏移定位，引文兜底。已有批注自动高亮。txt/md、PDF overlay 与 EPUB iframe 都显示高亮。点击高亮打开编辑框；保存走 `notes.update`，删除走 `notes.delete`，完成后刷新高亮与列表。右栏批注提供“跳转”，点击跳到对应章节与块内位置。EPUB 跳转在 iframe 内滚动到 mark 并短暂描边，iframe 自身有滚动条时也能定位。工具栏按选区定位，尺寸变化后重测。译文选区不显示划线/批注。工具栏挂 `document.body`，视口定位。点击外部关闭；再次划词只显示工具栏。源文批注在源文块内按块内偏移匹配，标题/译文不参与；找不到引文时按块索引兜底整块；译文、翻页或布局变化后高亮重测；点击批注跳到引文在块内位置。

## 接口与代码映射

| 入口/符号 | 位置 | 职责 |
|---|---|---|
| `findNoteOccurrence` | `src/client/modules/notes/anchors.ts:findNoteOccurrence` | 在章节文本中定位 quote 的起止位置，优先采用笔记记录的偏移 |
| `useNotes` | `src/client/modules/notes/use-notes.ts:useNotes` | 笔记加载、编辑保存、overlay 与 EPUB mark |
| `useSelectionDismiss` | `src/client/modules/reader/use-selection-dismiss.ts:useSelectionDismiss` | 点击工具栏之外（含 EPUB iframe）清空选区 |
| `SelectionToolbar` / `NoteDialog` / `NotesBody` | `src/client/modules/reader/SelectionNote.ts:SelectionToolbar`；`src/client/modules/reader/SelectionNote.ts:NoteDialog`；`src/client/modules/notes/NotesBodyView.ts:NotesBody` | 选段工具栏、编辑对话框与右栏笔记列表 |
| `ReaderPanelView` | `src/client/modules/reader/ReaderPanelView.ts:ReaderPanelView` | 组合阅读器、笔记层与弹层 |
| `handleNotes` | `src/host/modules/notes/notes-handlers.ts:handleNotes` | 处理 `update` / `delete` 等笔记持久化操作 |

## 约束与失败行为

quote 在章节文本中找不到时先做空白归一化匹配，再尝试块哈希；仍找不到则不高亮，但批注列表点击仍按记录的块与偏移跳转，不报错。高亮使用独立 overlay 或 EPUB iframe 内注入的 mark 元素实现，不修改原书内容与脚本；EPUB 只增加标记与配色样式，不改变原书布局。编辑保存或删除后，正文高亮与右栏列表同步刷新；操作失败时保留原批注并显示错误。高亮颜色取自当前配色的 `--reader-highlight`，切换配色后随之更新。quote 为空或缺少定位信息时不渲染高亮。

## 验收与测试

- 正常路径：定位 quote 时优先命中笔记记录的偏移，返回对应起止位置（`find_note_occurrence_prefers_offset`）。
- 边界：quote 不在文本中时返回空结果且不产生高亮（`find_note_occurrence_missing`）。
- 边界：选区包含译文时不显示批注与划线入口（`selection_toolbar_hides_note_and_highlight_for_translation`）。
- 边界：关闭工具栏后再次划词不恢复提示词子菜单（`selection_toolbar_resets_preset_menu_after_dismiss`）。
- 正常路径：源文批注按块内偏移匹配，越界回退块首，原始 Markdown 块哈希不阻止渲染文本匹配（`note_block_match_uses_intra_block_offset`、`note_block_match_ignores_raw_markdown_block_hash`、`resolve_note_block_falls_back_to_block_index`）。
- 正常路径：批注跳转把块内偏移换算成块内比例，越界回退 0（`block_jump_fraction_maps_intra_block_offset`）。
- 边界：页码、布局就绪或译文版本变化会改变高亮重绘键（`note_layout_key_changes_with_page_and_translation`）。
