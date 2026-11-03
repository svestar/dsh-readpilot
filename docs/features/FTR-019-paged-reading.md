# 分页阅读

- **ID：** FTR-019
- **名称：** 分页阅读
- **状态：** active
- **代码：** `src/client/paging.ts`（`measurePageMetrics`、`pageBounds`、`columnsFor`、`pageWidthForHeight`、`pageSpanWidth`）；`src/client/hooks/use-page-width.ts`（`usePageWidth`）；`src/client/hooks/use-text-pager.ts`（`useTextPager`）；`src/client/hooks/use-visual.ts`（`useVisual`）；`src/client/views/reader-bar.ts`（`ReaderBar`）；`src/client/views/visual-reader.ts`（`VisualReader`）；`src/client/plugin.ts`（`ReaderPanel`）
- **测试：** `tests/paging.test.ts`；`tests/client-assembly.test.ts`

## 行为

打开书籍按格式重置：PDF 单页分页，EPUB/txt/md 滚动，布局单页。PDF 始终分页；EPUB/txt/md 可切换滚动与分页。工具栏提供翻页或章节切换、标题、位置、模式与单/双页切换；PDF 另有页码与缩放。位置显示当前页/栏及总数，双页显示起止范围。

Reflowable 内容用 CSS 多栏：单页一栏、双页两栏。txt/md 由 `useTextPager` 测量内层宽度并把翻页写为 `scrollLeft`；EPUB 在 iframe 的 `html` 上应用同样栏样式，按 iframe 宽度测量。页数取决于视口、字号、布局与原书 CSS，不是印刷页。

单页分页与滚动模式下，重排内容的页宽按阅读区内容高度乘 A4 比例（`210 / 297`）算出，夹取到可用宽度并水平居中；双页分页每页不超过该页宽，整组跨度为 `2 × 页宽 + 40px`，居中并在窄屏用 `max-width: 100%` 夹取。txt/md 双页用页框跨度、EPUB 双页用 iframe 跨度；txt/md 滚动用内容栏宽、单页用页框宽，EPUB 滚动/单页用 iframe 宽。PDF 保持自身宽高比，单/双页均在可用宽高内适配并居中。尺寸变化会重新适配页宽，EPUB 分页在 iframe 宽变化后重测栏宽与页数。

滚轮只在分页模式翻页：文本、EPUB、PDF 分别监听阅读框、iframe 文档、视觉容器；累计超过阈值才翻页，`ctrl`/`meta`/`alt` 忽略。文本/EPUB 在章节边界切到相邻章节：向前进入下一章首页，向后进入上一章末页。搜索/笔记跳转：PDF 按页；EPUB 切换章节并在 iframe 内定位；文本分页按块定位并同步页码。

## 接口与代码映射

| 入口/符号 | 位置 | 职责 |
|---|---|---|
| `measurePageMetrics` | `src/client/paging.ts:measurePageMetrics` | 算栏宽、栏数、页数与步长 |
| `pageWidthForHeight` | `src/client/paging.ts:pageWidthForHeight` | 按高度算 A4 页宽并夹取 |
| `pageSpanWidth` | `src/client/paging.ts:pageSpanWidth` | 算单页宽或双页跨度 |
| `pageBounds` | `src/client/paging.ts:pageBounds` | 把页索引换算为起止栏 |
| `usePageWidth` | `src/client/hooks/use-page-width.ts:usePageWidth` | 观察文本容器，返回 A4 页宽 |
| `useTextPager` | `src/client/hooks/use-text-pager.ts:useTextPager` | 文本多栏测量、滚动同步与翻页 |
| `useVisual` | `src/client/hooks/use-visual.ts:useVisual` | PDF 取图、EPUB 分页重测 |
| `ReaderBar` | `src/client/views/reader-bar.ts:ReaderBar` | 共享工具栏与页码控件 |
| `VisualReader` | `src/client/views/visual-reader.ts:VisualReader` | PDF 适配、EPUB 页宽与滚轮 |
| `ReaderPanel` | `src/client/plugin.ts:ReaderPanel` | 模式/布局、重置、页宽与工具栏 |

## 约束与失败行为

- 模式与布局只属于当前面板，换书回到格式默认。
- 页数是浏览器布局结果，不是固定 CFI 或印刷页；窗口、字号或布局变化会重新测量并夹取当前页。
- 单页页宽由阅读区高度决定，宽而矮的窗口会收窄页面并留白；测得 0 时不写内联页宽，退回默认宽度。
- 文本分页按栏宽步长把 `scrollLeft` 四舍五入为页码；平滑滚动中可能短暂显示中间栏。
- PDF 双页选区入口、笔记与高亮只绑定展开页的第一页；第二页可阅读，但不能在该页打开选段工具栏或建笔记。PDF 单/双页受可用高度限制时，缩放只提高渲染分辨率，显示高度不变。
- EPUB 分页依赖原书 CSS 与浏览器多栏实现；原书的固定宽高、浮动或分栏样式可能造成页数或裁切不理想。
- 缩放与页码输入是 PDF 专属；页码输入提交时夹取到 1..pageCount。

## 验收与测试

- 正常：栏数、页数与边界正确，栏距参与计算（`columns_for_layouts`、`measure_single_column`、`measure_exact_two_column_overflow`、`measure_gap_accounting`）。
- 正常/边界：A4 页宽与双页跨度按布局计算并夹取，非法输入返回 0，自定义比例/栏距同规则（`page_width_from_height`、`page_width_clamps_to_available_width`、`page_width_invalid_inputs`、`page_width_custom_ratio`、`page_span_single`、`page_span_double`、`page_span_double_custom_gap`、`page_span_invalid_inputs`）。
- 边界：空内容、非法尺寸与越界页索引被夹取（`measure_invalid_inputs`、`clamp_page_index`、`page_bounds`）。
