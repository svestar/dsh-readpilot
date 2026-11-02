# 检索与笔记

- **ID：** FTR-008
- **名称：** 检索与笔记
- **状态：** active
- **代码：** `src/notes.js`（`createNotesStore`）；`src/api.js`（`search`、`handleNotes`）；`src/tools.js`（`registerTools`）；`src/client/hooks/use-search.js`（`useSearch`）；`src/client/views/notes-search.js`（`SearchPanel`、`NotesBody`）；`src/client/plugin.js`（`ReaderPanel`）
- **测试：** `tests/notes.test.js`

## 行为

阅读器头部提供搜索入口：输入关键词后调用 `search`，在结果列表中显示章节标题与命中片段；点击结果加载对应章节并滚动到命中字符偏移对应的块。笔记由 `createNotesStore` 按书存到 `$DSH_HOME/dsh-reader/notes/<bookId>.json`；用户选中正文后点击“笔记”，填写笔记内容并保存，笔记记录包含章节、块索引、字符偏移、引用原文与笔记正文。右栏“笔记”标签列出当前书的笔记，点击可跳回原文对应章节/页并定位；文本块模式会短暂闪烁。删除笔记会立即从列表移除。笔记引文在正文中高亮显示，点击高亮可编辑或删除，见 [FTR-012](FTR-012-note-highlight.md)。模型通过 `reader_note` 工具的 `add` / `list` 操作使用同一套存储。

## 接口与代码映射

| 入口/符号 | 位置 | 职责 |
|---|---|---|
| `createNotesStore` | `src/notes.js:createNotesStore` | 按书读写笔记文件，校验字段与 bookId |
| `handleNotes` | `src/api.js:handleNotes` | 处理 list/add/update/delete 的 RPC 请求 |
| `search` | `src/api.js:search` | 返回带章节与字符偏移的命中 |
| `registerTools` | `src/tools.js:registerTools` | 注册 `reader_search` 与 `reader_note` |
| `useSearch` | `src/client/hooks/use-search.js:useSearch` | 搜索状态、提交、关闭与重置 |
| `SearchPanel` / `NotesBody` | `src/client/views/notes-search.js:SearchPanel`；`src/client/views/notes-search.js:NotesBody` | 搜索结果列表与笔记列表 |
| `ReaderPanel` | `src/client/plugin.js:ReaderPanel` | 组合搜索、笔记与阅读布局 |

## 约束与失败行为

笔记只写自己的数据目录；`bookId` 只允许 `[A-Za-z0-9_-]{1,64}`，防止路径穿越；`quote`/`note` 各不超过 4000 字符，`blockIndex`/`offset` 为非负整数。搜索保持字面量匹配，最多 50 条；无命中返回空列表。笔记不存在时删除返回 `false`，更新报错；文件损坏或非数组时报错而不是静默清空。笔记跳转依赖章节内容加载完成，加载失败时保留当前阅读位置并显示错误。

## 验收与测试

- 正常路径：新建笔记会写入对应书籍的文件，并包含 id、章节、块、偏移与时间戳（`add_creates_record_on_disk`）。
- 正常路径：列表按创建时间倒序，更新与删除后数据同步（`list_returns_newest_first`、`update_changes_note_and_quote_only`）。
- 边界：不同书籍的笔记互相隔离（`books_are_isolated`）。
