# 批注与书签

- **ID：** FTR-018
- **名称：** 批注与书签
- **状态：** active
- **代码：** `src/notes/store.ts`（`validateNewNote`、`createNotesStore`）；`src/client/hooks/use-notes.ts`（`useNotes`）；`src/client/reader/selection-note.ts`（`SelectionToolbar`、`NoteDialog`）；`src/client/notes/notes-search.ts`（`NotesBody`）；`src/client/reader/header.ts`（`Header`）
- **测试：** `tests/marks.test.ts`

## 行为

选中正文后浮动栏提供黄、绿、蓝、粉、紫五种颜色；点击颜色立即创建 `kind:'annotation'` 且正文为空的批注，即正文划线。点“批注”打开编辑框，可写/改正文、改颜色或删除；正文为空时保持纯划线外观。批注正文存在 `note`，`annotation` 只保留书签页码。旧 `kind:'highlight'`/`'note'` 记录读取时归一为 `annotation`，正文取原 `note` 或 `annotation`，不重写文件。PDF 划线按文本项几何计算并合并同页相邻/重叠矩形，避免中英文混排、空格和重叠文本项造成的断口或叠色。顶栏书签按钮把当前章节保存为 `kind:'bookmark'`：PDF 优先用当前页所属的 PDF 目录章节名作为标签，页码作为副标题；EPUB/TXT 用章节标题。侧栏“笔记”标签的标记分组按“批注、书签”显示：批注组显示颜色点、引文与正文（可为空）；书签组显示章节名和页码，点击跳转。

## 接口与代码映射

| 入口/符号 | 位置 | 职责 |
|---|---|---|
| `createNotesStore` | `src/notes/store.ts:createNotesStore` | 同一 JSON 中保存 annotation/bookmark |
| `validateNewNote` | `src/notes/store.ts:validateNewNote` | 校验批注正文、颜色与书签标签 |
| `useNotes` | `src/client/hooks/use-notes.ts:useNotes` | 加载批注/书签、创建批注、编辑正文与颜色 |
| `SelectionToolbar` | `src/client/reader/selection-note.ts:SelectionToolbar` | 五种颜色入口 |
| `NotesBody` | `src/client/notes/notes-search.ts:NotesBody` | 批注/书签分组列表 |
| `Header` | `src/client/reader/header.ts:Header` | 当前章节书签按钮 |

## 约束与失败行为

颜色只接受 `yellow|green|blue|pink|purple`，非法值报错。旧记录没有 `kind`/`color` 时按 `annotation`/`yellow` 读取；`kind:'highlight'`/`'note'` 保留兼容，不迁移文件。书签必须有非空标签；当前入口使用章节标题。批注正文最多 4000 字；划线引用与正文共用现有锚点字段。删除共用同一接口，删除后列表和正文高亮一起刷新。批注正文为空时仍保留颜色与划线，可稍后补写；纯划线与带正文批注使用同一记录类型。书签只记章节与偏移，不画正文高亮。

## 验收与测试

- 正常路径：创建多色批注、修改颜色与正文、创建书签并在列表中区分（`highlight_and_bookmark_lifecycle`）。
- 正常路径：正文为空的批注保持合法并显示为划线（`annotation_with_empty_note_is_a_highlight`）。
- 正常路径：PDF 书签按当前页所属目录章节显示章节名（`bookmark_uses_pdf_outline_chapter`）。
- 正常路径：PDF 中英文混排的划线矩形不重叠、相邻项合并（`pdf_highlight_rects_do_not_overlap`、`pdf_highlight_rects_merge_overlap`）。
