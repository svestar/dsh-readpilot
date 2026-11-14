# 检索与笔记

- **ID：** FTR-008
- **名称：** 检索与笔记
- **状态：** active
- **代码：** `src/host/modules/notes/store.ts`（`createNotesStore`）；`src/host/modules/search/service.ts`（`createSearch`）；`src/host/modules/notes/notes-handlers.ts`（`createNotesHandlers`、`handleNotes`）；`src/host/register-tools.ts`（`registerTools`）；`src/client/modules/reader/use-search.ts`（`useSearch`）；`src/client/modules/notes/SearchPanelView.ts`（`SearchPanel`、`SearchAllDialog`）；`src/client/modules/notes/NotesBodyView.ts`（`NotesBody`）；`src/client/modules/reader/ReaderPanelView.ts`（`ReaderPanelView`）
- **测试：** `tests/notes.test.ts`；`tests/api-library.test.ts`；`tests/api-reading.test.ts`；`tests/api-notes.test.ts`；`tests/api-companion.test.ts`

## 行为

阅读器头部提供搜索：输入关键词调用 `search`，在结果列表中显示章节标题与命中片段；点击结果加载章节并滚动到命中块。笔记由 `createNotesStore` 按书存到 `$DSH_HOME/dsh-readpilot/notes/<bookId>.json`；用户选中正文后点击“批注”，填写正文并保存；批注记录包含章节、块索引、字符偏移、引用原文、正文与颜色，正文为空时就是划线。右栏“笔记”标签列出当前书的批注（长笔记见 [FTR-020](FTR-020-long-notes.md)），超过 40 条标记时按行窗口化；点击可跳回原文对应章节/页并定位；文本块模式会短暂闪烁。删除批注会立即从列表移除。批注引文在正文中高亮显示，点击高亮可编辑、改色或删除，见 [FTR-012](FTR-012-note-highlight.md)。模型通过 `reader_note` 工具的 `add` / `list` / `update` / `delete` 操作使用同一套存储。长笔记的文件与编辑器见 [FTR-020](FTR-020-long-notes.md)，本功能只覆盖批注与标记。

## 接口与代码映射

| 入口/符号 | 位置 | 职责 |
|---|---|---|
| `createNotesStore` | `src/host/modules/notes/store.ts:createNotesStore` | 按书读写笔记文件，校验字段与 bookId |
| `handleNotes` | `src/host/modules/notes/notes-handlers.ts:handleNotes` | 处理 list/add/update/delete 的 RPC 请求 |
| `search` | `src/host/modules/search/service.ts:createSearch` | 返回带章节与字符偏移的命中 |
| `registerTools` | `src/host/register-tools.ts:registerTools` | 注册 `reader_search` 与 `reader_note` |
| `useSearch` | `src/client/modules/reader/use-search.ts:useSearch` | 搜索状态、提交、关闭与重置 |
| `SearchPanel` / `SearchAllDialog` / `NotesBody` | `src/client/modules/notes/SearchPanelView.ts:SearchPanel`；`src/client/modules/notes/SearchPanelView.ts:SearchAllDialog`；`src/client/modules/notes/NotesBodyView.ts:NotesBody` | 搜索结果、全部结果弹窗与笔记列表 |
| `useReaderFind` | `src/client/modules/reader/use-reader-find.ts:useReaderFind` | 组合搜索、笔记与阅读布局 |
| `enqueueWrite` | `src/host/lib/write-queue.ts:enqueueWrite` | 同一文件的读改写串行执行 |

## 约束与失败行为

同一笔记文件的读-改-写按路径串行（`enqueueWrite`），并发新增或更新不会互相覆盖，见 [ADR-013](../decisions/ADR-013-write-serialization.md)。笔记只写自己的数据目录；`bookId` 只允许 `[A-Za-z0-9_-]{1,64}`，防止路径穿越；`quote`/`note` 各不超过 4000 字符，`blockIndex`/`offset` 为非负整数。搜索保持字面量匹配，普通查询默认 20 条、上限 50 条；结果被截断时显示“更多条目”，弹窗以 `limit: 0` 加载当前书全部命中，安全上限 5000 条；全库检索最多扫描 20 本书，结果带 `booksScanned`/`booksTotal`，截断或解析失败分别标记 `truncated`/`unreadable`，不静默漏结果。笔记不存在时删除返回 `false`，更新报错；文件损坏或非数组时报错而不是静默清空。笔记跳转依赖章节内容加载完成，加载失败时保留当前阅读位置并显示错误。

## 验收与测试

- 正常路径：新建笔记会写入对应书籍的文件，并包含 id、章节、块、偏移与时间戳（`add_creates_record_on_disk`）。
- 正常路径：列表按创建时间倒序，更新与删除后数据同步（`list_returns_newest_first`、`update_changes_note_and_quote_only`）。
- 边界：不同书籍的笔记互相隔离（`books_are_isolated`）。
- 正常路径：普通查询截断时 `limit: 0` 返回全部命中（`search_all_returns_all_matches`）。
- 边界：并发新增 5 条笔记后仍保留全部记录，不出现覆盖（`concurrent_adds_keep_every_note`）。
