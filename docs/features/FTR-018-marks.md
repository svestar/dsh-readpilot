# 批注与书签

- **ID：** FTR-018
- **名称：** 批注与书签
- **状态：** active
- **代码：** `src/host/modules/notes/store.ts`（`validateNewNote`、`createNotesStore`）；`src/client/modules/notes/use-notes.ts`（`useNotes`）；`src/client/modules/reader/SelectionNote.ts`（`SelectionToolbar`、`NoteDialog`）；`src/client/modules/reader/use-selection-dismiss.ts`（`useSelectionDismiss`）；`src/client/modules/reader/use-reader-find.ts`（`useReaderFind`）；`src/client/modules/sidebar/use-sidebar-reader.ts`（`useSidebarReader`）；`src/client/modules/notes/NotesBodyView.ts`（`NotesBody`）；`src/client/modules/notes/bookmark-label.ts`（`bookmarkContext`）；`src/client/modules/reader/Header.ts`（`Header`）
- **测试：** `tests/marks.test.ts`；`tests/selection-toolbar.test.ts`；`tests/selection-dismiss.test.ts`

## 行为

选中正文后浮动栏提供五色；点击颜色创建 `kind:'annotation'` 且正文为空的批注，即正文划线。点“批注”打开编辑框，可写/改正文、改颜色或删除；正文为空时保持纯划线外观。批注正文存在 `note`，`annotation` 只保留书签页码。工具栏按选区定位并重测；译文选区不显示划线/批注。工具栏挂 `document.body` 并视口定位，点击外部（含 EPUB iframe）关闭；再次划词只显示工具栏。保存/删除后正文与右栏刷新；失败保留原批注并提示。PDF 划线按文本项几何合并同页相邻/重叠矩形，避免断口或叠色。顶栏书签按钮把当前章节保存为 `kind:'bookmark'`：PDF 优先用当前页所属的 PDF 目录章节名作为标签，页码作为副标题；EPUB/TXT 用章节标题。侧栏“笔记”标签的标记分组按“批注、书签”显示：批注组显示颜色点、引文与正文（可为空）；书签组显示章节名和页码，点击跳转；标签按书签自身章节解析，不随当前阅读页变化。

## 接口与代码映射

| 入口/符号 | 位置 | 职责 |
|---|---|---|
| `createNotesStore` | `src/host/modules/notes/store.ts:createNotesStore` | 同一 JSON 中保存 annotation/bookmark |
| `validateNewNote` | `src/host/modules/notes/store.ts:validateNewNote` | 校验批注正文、颜色与书签标签 |
| `useNotes` | `src/client/modules/notes/use-notes.ts:useNotes` | 加载批注/书签、创建批注、编辑正文与颜色 |
| `SelectionToolbar` | `src/client/modules/reader/SelectionNote.ts:SelectionToolbar` | 五种颜色入口 |
| `useSelectionDismiss` | `src/client/modules/reader/use-selection-dismiss.ts:useSelectionDismiss` | 点击外部清空选区 |
| `useReaderFind` | `src/client/modules/reader/use-reader-find.ts:useReaderFind` | 主阅读接入选区关闭 |
| `useSidebarReader` | `src/client/modules/sidebar/use-sidebar-reader.ts:useSidebarReader` | 侧栏接入选区关闭 |
| `NotesBody` | `src/client/modules/notes/NotesBodyView.ts:NotesBody` | 批注/书签分组列表 |
| `Header` | `src/client/modules/reader/Header.ts:Header` | 当前章节书签按钮 |

## 约束与失败行为

颜色只接受 `yellow|green|blue|pink|purple`，非法值报错。旧记录没有 `kind`/`color` 时按 `annotation`/`yellow` 读取；`kind:'highlight'`/`'note'` 保留兼容，不迁移文件。书签必须有非空标签；当前入口使用章节标题。批注正文最多 4000 字；引用与正文共用锚点字段。删除共用接口。正文为空仍保留颜色与划线；书签只记章节与偏移，不画高亮。

## 验收与测试

- 正常路径：创建多色批注、修改颜色与正文、创建书签并在列表中区分（`highlight_and_bookmark_lifecycle`）。
- 正常路径：正文为空的批注保持合法并显示为划线（`annotation_with_empty_note_is_a_highlight`）。
- 正常路径：PDF 书签按当前页所属目录章节显示章节名（`bookmark_uses_pdf_outline_chapter`）。
- 正常路径：PDF 中英文混排的划线矩形不重叠、相邻项合并（`pdf_highlight_rects_do_not_overlap`、`pdf_highlight_rects_merge_overlap`）。
- 边界：书签标签使用书签自己的章节/页码，不随当前阅读页变化（`bookmark_label_stays_with_its_chapter`）。
- 边界：选区包含译文时不显示批注与划线入口（`selection_toolbar_hides_note_and_highlight_for_translation`）。
- 边界：关闭工具栏后再次划词不恢复提示词子菜单（`selection_toolbar_resets_preset_menu_after_dismiss`）。
- 边界：点击工具栏外清空选区，卸载时移除监听（`selection_dismiss_clears_on_outside_pointerdown_and_detaches_on_cleanup`）。
