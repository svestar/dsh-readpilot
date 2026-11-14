# 分页阅读

- **ID：** FTR-019
- **名称：** 分页阅读
- **状态：** active
- **代码：** `src/client/modules/reader/paging.ts`（`chapterPercent`、`pdfPagePercent`、`columnsFor`、`pageSpanWidth`）；`src/client/modules/reader/use-page-width.ts`（`usePageWidth`）；`src/client/modules/reader/use-text-pager.ts`（`useTextPager`）；`src/client/modules/reader/use-visual.ts`（`useVisual`）；`src/client/modules/reader/ReaderPanelView.ts`
- **测试：** `tests/paging.test.ts`；`tests/client-assembly.test.ts`；`tests/api-library.test.ts`；`tests/api-reading.test.ts`；`tests/api-notes.test.ts`；`tests/api-companion.test.ts`

## 行为

打开书籍按格式决定初始视图：PDF 始终分页；EPUB/txt/md 沿用记忆的阅读模式与单/双页布局，首次默认分页、单页。工具栏只提供翻页/章节、标题、位置与 PDF 页码/缩放；阅读模式、单双页与重排由阅读设置面板管理（见 [FTR-032](FTR-032-reader-settings.md)）。

位置显示：文本与 EPUB 为本章页码与全书百分比；PDF 原版为页/总页数；PDF 重排为章节页；双页显示跨页序号。百分比按章节字数加权，翻页即更新；进度另记章节内比例，供重新打开或工作区侧边栏恢复同一位置。

Reflowable 内容用 CSS 多栏：单页一栏、双页两栏。txt/md 由 `useTextPager` 测宽、把翻页写为 `scrollLeft`；EPUB 在 iframe 的 `html` 上同样处理。

页宽按 A4 比例（210/297）夹取后居中；文本左右 56px（窄屏 22），滚动列内 28px（窄屏 16）；PDF/EPUB 视觉页保持原样。分页步长用实际栏宽。

滚轮只在分页模式翻页：文本/EPUB/PDF 分别监听阅读框、iframe 与视觉容器，累计超阈值才翻页，忽略 `ctrl`/`meta`/`alt`。

## 接口与代码映射

| 入口/符号 | 位置 | 职责 |
|---|---|---|
| `measurePageMetrics` | `src/client/modules/reader/paging.ts:measurePageMetrics` | 算栏宽、栏数、页数与步长 |
| `pageWidthForHeight` / `pageSpanWidth` | `src/client/modules/reader/paging.ts:pageWidthForHeight`；`pageSpanWidth` | A4 页宽与单/双页跨度 |
| `pageBounds` | `src/client/modules/reader/paging.ts:pageBounds` | 页索引换算起止栏 |
| `chapterPercent` | `src/client/modules/reader/paging.ts:chapterPercent` | 按章节字数与页进度算全书百分比 |
| `pdfPagePercent` | `src/client/modules/reader/paging.ts:pdfPagePercent` | PDF 原版按绝对页算百分比 |
| `useTextPager` | `src/client/modules/reader/use-text-pager.ts:useTextPager` | 文本多栏测量、滚动同步与翻页 |
| `useVisual` | `src/client/modules/reader/use-visual.ts:useVisual` | PDF 取图、EPUB 分页重测 |
| `ReaderBar` | `src/client/modules/reader/ReaderBar.ts:ReaderBar` | 页码、百分比与布局控件 |
| `useReaderView` | `src/client/modules/reader/use-reader-view.ts:useReaderView` | 模式/布局记忆、页宽与工具栏 |

## 约束与失败行为

- 模式与布局存 localStorage，换书与重启后沿用；非法值回退分页、单页。PDF 始终分页，不覆盖文本模式记忆。
- 页数是布局结果，不是印刷页；视口、字号、布局变化会重测并夹取页号。
- 进度保存 `chapterFraction`（0–1）作为跨视图位置；`percent` 只用于显示。
- 单页页宽由阅读区高度决定；测得 0 时不写内联页宽。
- 文本分页把 `scrollLeft` 四舍五入为页码，平滑滚动中可能短暂显示中间栏。
- PDF 双页两页均可划选，笔记/高亮覆盖层分别渲染到左右页；缩放只提高渲染分辨率。
- EPUB 分页依赖原书 CSS 与浏览器多栏；固定宽高、浮动或分栏可能造成页数或裁切不佳。
- 缩放与页码输入是 PDF 专属；页码提交夹取到 1..pageCount。

## 验收与测试

- 正常：栏数/页数/边界与栏距（`columns_for_layouts`、`measure_single_column`、`measure_gap_accounting`）。
- 正常/边界：页宽/跨度夹取与非法输入（`page_width_from_height`、`page_width_clamps_to_available_width`、`page_span_single`、`page_span_double`、`page_span_invalid_inputs`）。
- 正常：页宽取整到整像素（`page_width_aligns_to_whole_pixels`）。
- 边界：空内容/非法尺寸/越界页索引（`measure_invalid_inputs`、`clamp_page_index`、`page_bounds`）。
- 正常：章节页码与全书百分比按字数加权，PDF 页百分比从第一页 0% 到最后一页 100%（`chapter_percent_weights_chapters_and_pages`、`pdf_page_percent_spans_first_to_last_page`）。
- 正常：进度同时保存章节内比例，重新打开按该比例定位（`progress_percent_persists`）。
