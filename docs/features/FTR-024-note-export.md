# 笔记导出

- **ID：** FTR-024
- **名称：** 笔记导出
- **状态：** active
- **代码：** `src/note-export.ts`（`buildNotesMarkdown`）；`src/api.ts`（`exportNotes`）；`src/client/hooks/use-long-notes.ts`（`exportNotes`）；`src/client/views/long-notes.ts`（`LongNotes`）；`src/client/helpers.ts`（`downloadText`）
- **测试：** `tests/note-export.test.ts`；`tests/api.test.ts`

## 行为

笔记标签的导出区提供“导出”和“保存到书库”。Host 的 `exportNotes` 读取当前书的整书笔记、主题笔记、短笔记/划线/批注/书签，生成一篇 markdown：标题为 `# 《书名》阅读笔记`，引用块包含作者、标签、当前进度与导出时间；`## 整书笔记`、`## 主题笔记`、`## 划线、批注与书签` 三个区块按内容有无出现，标记按章节分组。导出不包含记忆、草稿、书库索引或进度文件。

“导出”把 markdown 作为文件下载，文件名是 `<书名>-阅读笔记.md`；“保存到书库”写入 `<library>/notes/.exports/<书名>-阅读笔记.md` 并返回相对路径。书名为空或含路径分隔符时做安全替换；导出的时间固定为调用时的 ISO 字符串，导出是快照，不随后续编辑自动更新。

## 接口与代码映射

| 入口/符号 | 位置 | 职责 |
|---|---|---|
| `buildNotesMarkdown` | `src/note-export.ts:buildNotesMarkdown` | 纯函数拼装标题、元数据、长笔记与标记 |
| `exportNotes` | `src/api.ts:exportNotes` | 解析书、读取笔记与标记、选择下载或保存 |
| `exportNotes`（hook） | `src/client/hooks/use-long-notes.ts:exportNotes` | 调用 Host、触发下载或显示保存路径 |
| `LongNotes` | `src/client/views/long-notes.ts:LongNotes` | 导出/保存按钮与状态 |
| `downloadText` | `src/client/helpers.ts:downloadText` | 浏览器端 Blob 下载 |

## 约束与失败行为

导出只覆盖当前书；找不到书时返回 `book-not-found`，未配置书库时保存返回 `no-library`。文件名只做分隔符与 Windows 保留字符替换，不改变标题正文。`.exports/` 是隐藏目录，不参与书库扫描。单篇正文原样输出；标记区块按章节稳定排序。空书只输出标题与元数据，不出现空区块。导出不修改任何笔记、记忆或草稿；保存失败不产生半成品（一次写入）。下载在非浏览器环境静默跳过，不影响 Host 返回。

## 验收与测试

- 正常路径：整书笔记、主题笔记、划线/批注/书签与元数据都进入导出，章节顺序稳定（`note_export_full_export_includes_sections_and_metadata`、`note_export_orders_marks_and_escapes_markdown_text`）。
- 边界：空书只有标题与时间，空区块不输出，缺字段不出现 `undefined`（`note_export_empty_book_has_only_title_and_metadata`、`note_export_omits_empty_sections_and_handles_missing_text`）。
- 正常路径：`exportedAt` 固定时输出确定（`note_export_time_is_deterministic_with_exported_at`）。
- 集成：Host 读取长笔记与标记并返回 markdown 与文件名（API 集成测试覆盖）。
