# PDF 文本抽取

- **ID：** FTR-007
- **名称：** PDF 文本
- **状态：** active
- **代码：** `src/host/modules/reading/formats/pdf/index.ts`（`parsePdf`）
- **测试：** `tests/pdf.test.ts`

## 行为

打开 PDF 时，Host 用 `pdfjs-dist` 的 legacy build 逐页读取文本层，按文本项的纵坐标分行、横坐标排序拼接，生成以“第 N 页”为标题的章节，每个章节带 `page` 页码；块按空行拆成段落。书籍标题优先取 PDF metadata 的 `Title`，缺失时用文件名；作者取 `Author`。最多处理 2000 页，超过时抛错；没有文本层时返回空章节，由上层提示“无可提取文本”。文本页继续参与目录、检索、笔记与伴读。

## 接口与代码映射

| 入口/符号 | 位置 | 职责 |
|---|---|---|
| `parsePdf` | `src/host/modules/reading/formats/pdf/index.ts:parsePdf` | 读取 PDF 文本层并生成页章节 |
| `parseBookAsync` | `src/host/modules/reading/formats.ts:parseBookAsync` | 按格式分派到 PDF 解析器 |

## 约束与失败行为

只抽取文本层，不做像素渲染、OCR 或版面还原；扫描版 PDF 没有文本层，返回空章节。双栏、连字、页眉页脚、表格可能导致文本顺序或空格不准确，这是本版接受的限制。超过 2000 页或文件超过 100 MB 抛错；解析失败时释放 PDF 文档对象。PDF.js 的字体/画布警告不影响文本抽取。

## 验收与测试

- 正常路径：单页文本 PDF 抽取出的文本包含原始内容，章节页码为 1（`parse_pdf_extracts_page_text`）。
- 边界：无文本层的 PDF 返回空章节（`parse_pdf_without_text_returns_no_chapters`）。
- 正常路径：多页按阅读顺序编号（`parse_pdf_numbers_pages_in_reading_order`）。
- 失败：超过页数上限的文档被拒绝（`parse_pdf_rejects_documents_over_page_limit`）。
