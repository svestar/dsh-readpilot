# Markdown 语法

- **ID：** FTR-050
- **名称：** Markdown 语法
- **状态：** active
- **代码：** `src/shared/markdown.ts`（`parseMarkdownBlocks`）；`src/host/modules/reading/formats.ts`（`parseBlocks`）；`src/client/modules/markdown/render.ts`（`inline`、`renderBlocks`）；`src/host/api.ts`（`imageAssetUrl`）；`src/host/modules/reading/markdown-images.ts`（`rewriteInlineImages`）
- **测试：** `tests/markdown.test.ts`；`tests/smoke.test.ts`

## 行为

块模型与架构取舍见 [ADR-023](../decisions/ADR-023-markdown-blocks.md)。

Markdown 文件与聊天/长笔记共用 `parseMarkdownBlocks`。阅读章节由 Host 把解析结果转成 `TextBlock`，客户端继续以 `data-block-index` 渲染，因此分页、搜索和批注锚点仍按块工作。

支持：

- 1–6 级标题、setext 标题、段落、分隔线；
- 有序/无序列表、任务列表、按缩进呈现的嵌套列表；
- 引用（连续行合并）；
- 围栏代码块与语言标记；
- 管道表格；
- 粗体、斜体、删除线、行内代码、链接、自动链接、行内图片；
- 独立图片块与相对行内图片由 Host 的 `book-asset` 重写为书库内资源 URL；
- 脚注引用与定义（支持缩进续行）。

链接只接受 `http:`、`https:`、`mailto:`、`#` 锚点；图片拒绝脚本协议，允许 HTTP、`/api/`、相对路径和图片 data URL。原始 HTML 不执行，按文本显示。

## 接口与代码映射

| 入口/符号 | 位置 | 职责 |
|---|---|---|
| `parseMarkdownBlocks` | `src/shared/markdown.ts:parseMarkdownBlocks` | 共享顶层块解析器 |
| `parseBlocks` | `src/host/modules/reading/formats.ts:parseBlocks` | Markdown 章节转 `TextBlock` |
| `renderBlocks` | `src/client/modules/markdown/render.ts:renderBlocks` | 块渲染与 `data-block-index` |
| `inline` | `src/client/modules/markdown/render.ts:inline` | 行内语法与 URL 白名单 |
| `imageAssetUrl` | `src/host/modules/reading/open.ts:imageAssetUrl` | 图片块转为书库资源 URL |
| `rewriteInlineImages` | `src/host/modules/reading/markdown-images.ts:rewriteInlineImages` | 重写相对行内图片路径 |

## 约束与失败行为

不执行原始 HTML，不支持数学公式、Mermaid 和完整 CommonMark 边界；嵌套列表以缩进展示而非嵌套 DOM。表格和列表的 `text` 是单元格/条目文本拼接，块内字符偏移与旧版纯段落不完全等价。行内图片的相对路径由 Host 改写；外链仍按安全协议校验。章节切分不变；表格与列表会改变块边界，旧批注优先按引文回退定位。

## 验收与测试

- 正常路径：表格、任务列表、嵌套/有序列表、引用和代码语言被正确解析（`markdown_parser_handles_gfm_blocks`）。
- 正常路径：Host 的 Markdown 章节使用同一解析器（`host_markdown_blocks_share_gfm_parser`）。
- 正常路径：渲染保留块索引，支持删除线、自动链接和安全图片（`markdown_renderer_keeps_safe_inline_nodes_and_block_indexes`）。
- 正常路径：相对行内图片被改写，外链保留（`relative_inline_images_are_rewritten`）。
- 正常路径：章节中的相对行内图片重写为 book-asset（`smoke_markdown_inline_images_are_rewritten_to_book_assets`）。
