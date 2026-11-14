# 工具结果卡片

- **ID：** FTR-041
- **名称：** 工具结果卡片
- **状态：** active
- **代码：** `src/client/modules/reader/ReaderToolView.ts`（`ReaderBooksToolView`、`ReaderSearchToolView`、`ReaderOpenToolView`、`parseReaderBooksResult`、`parseReaderSearchResult`、`parseReaderOpenResult`）；`src/client/modules/toolview/register.ts`（`registerToolViews`）；`src/client/modules/reader/resource.ts`（`buildReaderResource`）
- **测试：** `tests/reader-tool-view.test.ts`

## 行为

原生会话里 `reader_books`、`reader_search`、`reader_open` 的结果不再只显示 JSON 文本，而是工具卡：

- `reader_books`：书名、格式、大小与阅读进度，最多 8 本，超出显示 `+N`；只读。
- `reader_search`：书名 · 章节、两行片段，最多 6 条；每条提供“跳转”按钮。
- `reader_open`：书名、作者、目录条数，最多 6 章；提供“跳转”按钮到第一章。

卡片在 `phase !== 'result'` 时显示“加载中…”。结果不是单个 `text` block 时返回 null，交给宿主的通用行；JSON 解析失败时显示原始文本（最多 4000 字符）。“跳转”按钮用 `buildReaderResource(bookId, chapterId, offset)` 生成 `dsh-resource://dsh-readpilot/book/...` 地址，并交给阅读器路由：目标书是主阅读当前书时跳主阅读，否则调用 `ctx.sidebarRight.openResource` 打开侧栏；没有 `openResource` 时不渲染按钮。

## 接口与代码映射

| 入口/符号 | 位置 | 职责 |
|---|---|---|
| `ReaderBooksToolView` | `src/client/modules/reader/ReaderToolView.ts:ReaderBooksToolView` | `reader_books` 卡片 |
| `ReaderSearchToolView` | `src/client/modules/reader/ReaderToolView.ts:ReaderSearchToolView` | `reader_search` 卡片与跳转按钮 |
| `ReaderOpenToolView` | `src/client/modules/reader/ReaderToolView.ts:ReaderOpenToolView` | `reader_open` 卡片与跳转按钮 |
| `buildReaderResource` | `src/client/modules/reader/resource.ts:buildReaderResource` | 由书/章节/偏移生成阅读器资源地址 |
| `apply` | `src/client/plugin.ts:apply` | 注册三个 `tool.call.toolview` cell |

## 约束与失败行为

卡片只读取工具结果，不写笔记、改阅读位置或发请求；点击跳转才发生导航。解析严格依赖结果 JSON 的 `books`/`matches`/`toc` 字段，字段缺失时降级为原始文本，不抛错。结果内容不是单个文本 block（多 block、图片）时不由本插件接管。`reader_books` 不提供跳转，因为该结果不是单个可定位目标。资源地址与打开行为由 [FTR-035](FTR-035-workspace-sidebar-reader.md) 的侧栏 Tab 类型负责；没有侧栏服务时按钮消失，卡片仍可读。

## 验收与测试

- 正常路径：`reader_books` 解析书名、格式、大小与进度，非法 JSON 返回 null（`reader_books_tool_result_parses`）。
- 正常路径：`reader_search` 解析命中与 `truncated`，缺失 book/chapter 的命中被过滤（`reader_search_tool_result_parses`）。
- 正常路径：`reader_open` 解析书名、作者、目录与截断标记（`reader_open_tool_result_parses`）。
- 边界：结果不是单文本 block 或为空时返回 null（`reader_tool_result_text_reads_single_text_block`）。
