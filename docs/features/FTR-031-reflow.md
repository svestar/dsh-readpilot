# 重排阅读

- **ID：** FTR-031
- **名称：** 重排阅读
- **状态：** active
- **代码：** `src/visual/epub.ts`（`readDocument` 的 `reflow`）；`src/api.ts`（`epubDocument`）；`index.ts`（`epub-doc` 路由）；`src/formats/pdf.ts`（`parsePdf`、`pageBlocks`、`stripPageFurniture`、`orderColumns`）；`src/client/helpers.ts`（`readReflowMode`、`saveReflowMode`）；`src/client/reader-screen.ts`（`visualForItem`、`visualForChapter`）；`src/client/plugin.ts`（`toggleReflow`）；`src/client/views/header.ts`（`Header`）；`src/client/views/visual-reader.ts`（`VisualReader`）
- **测试：** `tests/epub-visual.test.ts`；`tests/pdf.test.ts`

## 行为

EPUB 与 PDF 阅读时顶栏出现“重排/原版”切换。EPUB 重排仍在 iframe 中渲染：Host 去掉出版社的 `<link rel="stylesheet">`、`<style>` 与元素 `style` 属性，注入统一排版样式（正文、标题、引用、代码、表格、图片），原版模式保持出版社 CSS 不变。PDF 重排复用文本阅读器：`parsePdf` 过滤页码与重复页眉页脚，按字号识别标题、按等宽字体识别代码、对双栏页按左右栏重排，然后把块交给与 TXT/MD 相同的分页渲染器。

EPUB 重排的分页沿用视觉模式的 CSS 多列：`useVisual` 给 iframe 的 `html` 注入列数与列间距，横向滚动翻页。PDF 重排按 PDF 页做章节分页，切回原版恢复页面位图。模式保存在 `localStorage` 的 `dsh-readpilot.reflow`，跨书生效。

## 接口与代码映射

| 入口/符号 | 位置 | 职责 |
|---|---|---|
| `readDocument` | `src/visual/epub.ts:readDocument` | `reflow=true` 时清洗样式并注入重排 CSS |
| `epubDocument` | `src/api.ts:epubDocument` | 透传 `reflow` 到视觉层 |
| `readReflowMode` / `saveReflowMode` | `src/client/helpers.ts:readReflowMode`；`src/client/helpers.ts:saveReflowMode` | 读写模式偏好 |
| `visualForItem` / `visualForChapter` | `src/client/reader-screen.ts:visualForItem` | 在视觉状态上带 `reflow` |
| `toggleReflow` | `src/client/plugin.ts:toggleReflow` | 切换模式并重建当前章节 |
| `Header` | `src/client/views/header.ts:Header` | 仅 EPUB 显示“重排/原版”按钮 |
| VisualReader | src/client/views/visual-reader.ts:VisualReader | iframe URL 带 `reflow=1` |
| `parsePdf` | `src/formats/pdf.ts:parsePdf` | PDF 文本重建入口 |
| `stripPageFurniture` | `src/formats/pdf.ts:stripPageFurniture` | 过滤页码与重复页眉页脚 |
| `orderColumns` | `src/formats/pdf.ts:orderColumns` | 双栏页按左右栏重排 |
| `pageBlocks` | `src/formats/pdf.ts:pageBlocks` | 段落合并、标题与代码识别 |

## 约束与失败行为

EPUB 与 PDF 生效；TXT、MD 暂不显示该按钮。EPUB 清洗会丢失出版社字体、分栏、浮动等复杂版式；PDF 重排只处理纯文字，图片、表格、公式会退化，扫描件没有文本层时仍只能看原版。PDF 目前没有置信度提示，低质量页面由用户切回原版；页内位置只到章节级，切换模式回到章节首屏。iframe 保持 `sandbox="allow-same-origin"`，脚本仍被禁止。

## 验收与测试

- 正常路径：重排文档不再含 `rel="stylesheet"` 与 `style` 属性，并包含 `data-dsh-reflow` 与统一排版规则（`epub_visual_reflow_drops_publisher_styles`）。PDF 解析会丢掉页码与重复页眉页脚（PDF 测试 parse_pdf_drops_page_numbers_and_running_headers）。
- 正常路径：视觉状态携带重排标记（`visual_target_reflow_flag`）。
- 手动验证：Gutenberg《Alice》重排后单列 760px、56px 页边距可正常分页，图片与标题按统一版式显示。
