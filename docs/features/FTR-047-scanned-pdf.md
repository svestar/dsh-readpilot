# 扫描版 PDF

- **ID：** FTR-047
- **名称：** 扫描版 PDF
- **状态：** active
- **代码：** `src/host/modules/reading/formats/pdf/index.ts`（`parsePdf`）；`src/host/modules/reading/formats.ts`（`ParsedBook`）；`src/host/api.ts`（`open`）；`src/client/modules/reader/use-reader-view.ts`（`openBook`）；`src/client/modules/reader/paging.ts`（`readerCapabilities`）；`src/client/modules/reader/Header.ts`（`Header`）；`src/client/modules/sidebar/SidebarReaderView.ts`（`SidebarReader`）
- **测试：** `tests/pdf.test.ts`；`tests/paging.test.ts`；`tests/api-library.test.ts`；`tests/api-reading.test.ts`；`tests/api-notes.test.ts`；`tests/api-companion.test.ts`

## 行为

PDF 解析完成后若没有任何可提取文本、但页数大于 0，解析结果标记 `scanOnly: true` 并保留 `pageCount`。`open` 不再抛 `no-extractable-text`，而是返回 `supported: true`、`scanOnly: true` 和一个合成目录项（id `scan`，第 1 页），让客户端进入原版 PDF 阅读器。

扫描版只提供：

- 原版逐页显示、翻页、页码跳转；
- 缩放；
- PDF 自带 outline（若存在），点击按页码直接跳到对应原版页；
- 阅读进度按 PDF 页码记录。

搜索、书签、重排、划选批注、提示词、摘要和伴读引用不提供；Header 隐藏搜索/书签按钮，阅读设置隐藏来源与字号，快捷键拦截 search/bookmark；阅读界面不显示额外提示，限制说明放在帮助手册 FAQ。有文本层的 PDF 行为不变，仍走原有解析、重排、批注和检索。

## 接口与代码映射

| 入口/符号 | 位置 | 职责 |
|---|---|---|
| `parsePdf` | `src/host/modules/reading/formats/pdf/index.ts:parsePdf` | 返回 `pageCount` 与 `scanOnly` |
| `open` | `src/host/api.ts:open` | 对无文本 PDF 返回 visual-only 结果 |
| `openBook` | `src/client/modules/reader/use-reader-view.ts:openBook` | 合成扫描版章节并初始化 PDF 页码 |
| `readerCapabilities` | `src/client/modules/reader/paging.ts:readerCapabilities` | 扫描版只保留分页、缩放 |
| `Header` | `src/client/modules/reader/Header.ts:Header` | 隐藏搜索与书签入口 |
| `Toc` | `src/client/modules/reader/Toc.ts:Toc` | 扫描版 outline 按 page 跳转，不依赖 chapterId |
| `SidebarReader` | `src/client/modules/sidebar/SidebarReaderView.ts:SidebarReader` | 侧栏原版查看 |

## 约束与失败行为

无文本层且页数为 0、文件损坏或超过 PDF 页数上限时仍返回错误；不能从扫描版生成批注锚点或文本摘要。PDF 页面渲染走现有 `pdfPage`/`pageView`，不执行 OCR，也不把图片页转换为文本。扫描版页数上限沿用 PDF 解析上限；阅读进度以合成章节与页码百分比保存，重新打开时按百分比恢复大致页。

## 验收与测试

- 正常路径：无文本 PDF 不产生章节，但标记 `scanOnly` 并保留页数（`parse_pdf_without_text_returns_no_chapters`）。
- 边界：扫描版能力只保留分页与缩放，不提供文本重排（`scan_only_pdf_has_no_text_reflow`）。
- 正常路径：无文本 PDF 可打开 visual-only 结果，返回 scanOnly、页数与合成目录项（`open_scanned_pdf_returns_visual_only`）。
