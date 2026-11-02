# 划线、批注与书签

- **ID：** FTR-018
- **名称：** 划线、批注与书签
- **状态：** active
- **代码：** `src/notes.js`（`validateNewNote`、`createNotesStore`）；`src/client/hooks/use-notes.js`（`useNotes`）；`src/client/views/selection-note.js`（`SelectionToolbar`、`NoteDialog`）；`src/client/views/notes-search.js`（`NotesBody`）；`src/client/views/header.js`（`Header`）
- **测试：** `tests/marks.test.js`

## 行为

选中正文后浮动栏提供黄、绿、蓝、粉、紫五种划线颜色；点击颜色立即创建 `kind:'highlight'` 的标记。点正文里的彩色划线打开批注框，可改颜色、写/改批注或删除；批注存在 `annotation`，不是独立笔记。顶栏书签按钮把当前章节保存为 `kind:'bookmark'`：PDF 优先用当前页所属的 PDF 目录章节名作为标签，页码作为副标题；EPUB/TXT 用章节标题。侧栏“标记”按“划线、笔记、书签”分组显示：划线组显示颜色点、引文和批注；笔记组保持原有笔记；书签组显示章节名和页码，点击跳转。`kind:'note'` 的笔记仍通过“笔记”按钮创建，与批注互不替代。

## 接口与代码映射

| 入口/符号 | 位置 | 职责 |
|---|---|---|
| `createNotesStore` | `src/notes.js:createNotesStore` | 同一 JSON 中保存 note/highlight/bookmark |
| `validateNewNote` | `src/notes.js:validateNewNote` | 校验 kind、颜色、批注与书签标签 |
| `useNotes` | `src/client/hooks/use-notes.js:useNotes` | 加载标记、创建划线/书签、编辑批注 |
| `SelectionToolbar` | `src/client/views/selection-note.js:SelectionToolbar` | 五种颜色入口 |
| `NotesBody` | `src/client/views/notes-search.js:NotesBody` | 划线/笔记/书签分组列表 |
| `Header` | `src/client/views/header.js:Header` | 当前章节书签按钮 |

## 约束与失败行为

颜色只接受 `yellow|green|blue|pink|purple`，非法值报错。旧笔记没有 `kind`/`color` 时按 `note`/`yellow` 读取，不迁移文件。书签必须有非空标签；当前入口使用章节标题。批注最多 4000 字；划线引用与批注共用现有锚点字段。删除共用同一接口，删除后列表和正文高亮一起刷新。批注为空时仍保留划线，可稍后补写。书签只记章节与偏移，不画正文高亮。

## 验收与测试

- 正常路径：创建多色划线、修改颜色和批注、创建书签并在列表中区分（`highlight_and_bookmark_lifecycle`）。
- 正常路径：PDF 书签按当前页所属目录章节显示章节名（`bookmark_uses_pdf_outline_chapter`）。
