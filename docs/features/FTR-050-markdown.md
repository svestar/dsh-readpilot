# Markdown 语法

- **ID：** FTR-050
- **名称：** Markdown 语法
- **状态：** active
- **代码：** `src/markdown/blocks.ts`（`parseMarkdownBlocks`）；`src/books/formats.ts`（`parseBlocks`）；`src/client/markdown/render.ts`（`inline`、`renderBlocks`）；`src/api/index.ts`（`imageAssetUrl`）
- **测试：** `tests/markdown.test.ts`

## 行为

Markdown 文件与聊天/长笔记共用 `parseMarkdownBlocks`。阅读章节由 Host 把解析结果转成 `TextBlock`，客户端继续以 `data-block-index` 渲染，因此分页、搜索和批注锚点仍按块工作。

支持：

- 1–6 级标题、段落、分隔线；
- 有序/无序列表、任务列表、按缩进呈现的嵌套列表；
- 引用（连续行合并）；
- 围栏代码块与语言标记；
- 管道表格；
- 粗体、斜体、删除线、行内代码、链接、自动链接、行内图片；
- 独立图片块由 Host 的 `book-asset` 重写为书库内资源 URL。

链接只接受 `http:`、`https:`、`mailto:`、`#` 锚点；图片拒绝脚本协议，允许 HTTP、`/api/`、相对路径和图片 data URL。原始 HTML 不执行，按文本显示。

## 接口与代码映射

| 入口/符号 | 位置 | 职责 |
|---|---|---|
| `parseMarkdownBlocks` | `src/markdown/blocks.ts:parseMarkdownBlocks` | 共享顶层块解析器 |
| `parseBlocks` | `src/books/formats.ts:parseBlocks` | Markdown 章节转 `TextBlock` |
| `renderBlocks` | `src/client/markdown/render.ts:renderBlocks` | 块渲染与 `data-block-index` |
| `inline` | `src/client/markdown/render.ts:inline` | 行内语法与 URL 白名单 |
| `imageAssetUrl` | `src/api/index.ts:imageAssetUrl` | 图片块转为书库资源 URL |

## 约束与失败行为

不执行原始 HTML，不支持脚注、数学公式、Mermaid 和完整 CommonMark 边界；嵌套列表以缩进展示而非嵌套 DOM。表格和列表的 `text` 是单元格/条目文本拼接，块内字符偏移与旧版纯段落不完全等价。行内图片只校验 URL，不保证相对路径能被浏览器解析；独立图片块走 Host 资源路由。章节切分不变；表格与列表会改变块边界，旧批注优先按引文回退定位。

## 验收与测试

- 正常路径：表格、任务列表、嵌套/有序列表、引用和代码语言被正确解析（`markdown_parser_handles_gfm_blocks`）。
- 正常路径：Host 的 Markdown 章节使用同一解析器（`host_markdown_blocks_share_gfm_parser`）。
- 正常路径：渲染保留块索引，支持删除线、自动链接和安全图片（`markdown_renderer_keeps_safe_inline_nodes_and_block_indexes`）。
