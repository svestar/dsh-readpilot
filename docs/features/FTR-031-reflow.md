# 重排阅读

- **ID：** FTR-031
- **名称：** 重排阅读
- **状态：** active
- **代码：** `src/client/modules/reader/screen.ts`（`visualForItem`、`visualForChapter`）；`src/client/plugin.ts`（`applySource`、`isTextFormat`、`textLayout`）；`src/client/lib/preferences.ts`（`readReflowBooks`、`saveReflowBooks`）；`src/client/modules/reader/ReaderSettings.ts`（`ReaderSettings`）；`src/host/modules/reading/formats/pdf/index.ts`（`parsePdf`、`pageBlocks`、`stripPageFurniture`、`orderColumns`、`tableRowsAt`）；`src/host/modules/reading/formats/epub/index.ts`（`parseEpub`、`imageBlock`、`tableRows`）；`src/client/modules/markdown/render.ts`（`renderBlocks`）
- **测试：** `tests/epub-visual.test.ts`；`tests/pdf.test.ts`；`tests/epub.test.ts`

## 行为

EPUB 与 PDF 阅读时在阅读设置面板切换“原版/重排”；模式按书记忆，保存在 `localStorage` 的 `dsh-readpilot.reflow-books`。

重排统一走原生文本渲染器（A4 分页），不再使用 iframe；iframe 只保留给“原版”EPUB。EPUB 重排使用 `parseEpub` 抽出的块，正文、标题、列表、引用、代码、图片与表格按 TXT/MD 的版式渲染，字号跟随 A+/A-；图片经 `epub-asset` 加载并参与分页重测。出版社字体、浮动等复杂版式仍不进入重排。

PDF 重排复用同一渲染器：`parsePdf` 过滤页码与重复页眉页脚，按字号识别标题，按命令/路径/符号特征识别代码（等宽字体仅作辅助），按列间距识别简单表格，对双栏页按左右栏重排；解析后返回 0–1 的置信度，按文本覆盖率、每页字数、目录页比例、代码占比、乱码比例扣分。低于 0.6 时阅读区顶部显示「重排识别置信度较低」并附最多两条原因，可关闭。PDF 重排固定单页版式，切回原版恢复页面位图。

## 接口与代码映射

| 入口/符号 | 位置 | 职责 |
|---|---|---|
| `visualForItem` / `visualForChapter` | `src/client/modules/reader/screen.ts:visualForItem` | 重排时对 EPUB/PDF 返回 `null`，走文本渲染器 |
| `applySource` | `src/client/modules/reader/use-reader-view.ts:applySource` | 切换模式、重建当前章节的视觉状态 |
| `readReflowBooks` / `saveReflowBooks` | `src/client/lib/preferences.ts:readReflowBooks` | 读写按书的模式偏好 |
| `ReaderSettings` | `src/client/modules/reader/ReaderSettings.ts:ReaderSettings` | 提供“原版/重排”等内容设置 |
| `parsePdf` | `src/host/modules/reading/formats/pdf/index.ts:parsePdf` | PDF 文本重建，返回 `reflowConfidence` / `reflowNotes` |
| `stripPageFurniture` | `src/host/modules/reading/formats/pdf/index.ts:stripPageFurniture` | 过滤页码与重复页眉页脚 |
| `orderColumns` | `src/host/modules/reading/formats/pdf/index.ts:orderColumns` | 双栏页按左右栏重排 |
| `pageBlocks` | `src/host/modules/reading/formats/pdf/index.ts:pageBlocks` | 段落合并、标题/代码/表格识别 |
| `tableRowsAt` | `src/host/modules/reading/formats/pdf/blocks.ts:tableRowsAt` | 连续同列行合成表格 |
| `renderBlocks` | `src/client/modules/markdown/render.ts:renderBlocks` | 渲染表格块 |

## 约束与失败行为

EPUB 重排保留块级图片与普通行列的简单表格；行内图片、SVG 内嵌图、合并单元格、嵌套表格与依赖出版社 CSS 的浮动/分栏会丢失或被简化。PDF 重排只处理文字层，图片、公式与复杂表格会退化，扫描件没有文本层时仍只能看原版；简单表格要求列数一致且起始 x 对齐，否则按段落处理。PDF 低置信度只提示、不自动禁用重排。切换原版/重排、阅读方式或版式时的位置恢复见 FTR-033。TXT/MD 始终使用该渲染器。

## 验收与测试

- 正常路径：EPUB 与 PDF 开启重排时视觉状态为 `null`，关闭时分别回到 iframe 与页面位图（`visual_target_reflow_flags`）。
- 正常路径：PDF 解析会丢掉页码与重复页眉页脚，并识别简单表格（`parse_pdf_drops_page_numbers_and_running_headers`、`parse_pdf_detects_simple_tables`）。
- 正常路径：PDF 解析返回置信度与原因（`parse_pdf_reports_reflow_confidence`）。
- 正常路径：EPUB 章节图片被解析为 image 块，路径与 alt 保留；简单表格被解析为带 rows 的 table 块（`parse_epub_nav_toc`、`parse_epub_table_blocks`）。
