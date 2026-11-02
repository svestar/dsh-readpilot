# PDF 视觉

- **ID：** FTR-009
- **名称：** PDF 视觉
- **状态：** active
- **代码：** `src/visual/pdf.js`（`createPdfPageRenderer`）；`src/api.js`（`pageView`、`pdfPage`）；`src/client/hooks/use-visual.js`（`useVisual`）；`src/client/views/visual-reader.js`（`VisualReader`）；`src/client/plugin.js`（`ReaderPanel`）
- **测试：** `tests/pdf-visual.test.js`

## 行为

打开 PDF 时，Host 用 `pdfjs-dist` 把指定页渲染成 PNG，同时返回该页的文本项坐标；Client 在页面图片上叠加透明文本层，因此页面是视觉的，文字仍可选中、复制和划词。阅读器支持上一页/下一页、页码输入、缩放（100%–300%）；页面与文本项按书籍、页码、缩放缓存。左侧目录优先显示 PDF 书签（outline），按 `level` 缩进；没有书签时回退到页码章节。翻页时同步当前页章节，笔记与进度按当前页记录，避免页码与笔记归属错位。搜索或笔记点击会跳到对应页；选段可预填伴读或在当前页建笔记。txt/md 仍使用文本块阅读，PDF/EPUB 不提供“文本模式”切换。

## 接口与代码映射

| 入口/符号 | 位置 | 职责 |
|---|---|---|
| `createPdfPageRenderer` | `src/visual/pdf.js:createPdfPageRenderer` | 渲染页面 PNG、生成文本项并维护磁盘缓存 |
| `pageView` | `src/api.js:pageView` | 返回页面尺寸、页数与文本项 |
| `pdfPage` | `src/api.js:pdfPage` | 返回页面 PNG 给 `/api/dsh-reader/pdf-page` |
| `useVisual` | `src/client/hooks/use-visual.js:useVisual` | PDF 页状态、翻页、缩放、选段与页章节同步 |
| `VisualReader` | `src/client/views/visual-reader.js:VisualReader` | 页面图片、文本层与页工具栏 |
| `ReaderPanel` | `src/client/plugin.js:ReaderPanel` | 组合阅读器、TOC 与笔记层 |

## 约束与失败行为

缩放范围 0.5–3，页码必须是 1..pageCount；超过 2000 页、渲染失败、非法页码都返回明确错误，不写半截缓存。缓存总量超过 500 MB 时按修改时间淘汰。文本层坐标由 PDF.js 文本项换算，和图片可能有 1–2px 偏差；CJK 字体度量不完美时仍可选择，但高亮可能偏移。页面是 PDF.js 光栅化结果，不是 MuPDF，复杂 PDF 的像素级效果不保证。页面图片本身不参与配色，只有页面周围背景与选区颜色由 FTR-011 控制。书签解析失败或条目没有有效页目标时，该条目不会显示；整本书没有书签时仍显示页码目录。

## 验收与测试

- 正常路径：单页 PDF 渲染出 PNG、页面尺寸与页数正确，文本项包含原文（`render_pdf_page_png`）。
- 正常路径：PDF 书签按层级和页目标解析为 outline（`parse_pdf_outline_hierarchy`）。
- 失败：越界页码或非法缩放被拒绝（`pdf_page_rejects_out_of_range`）。
