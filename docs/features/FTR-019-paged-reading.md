# 分页阅读

- **ID：** FTR-019
- **名称：** 分页阅读
- **状态：** active
- **代码：** `src/client/paging.ts`（`measurePageMetrics`、`pageBounds`、`columnsFor`、`pageWidthForHeight`、`pageSpanWidth`）；`src/client/hooks/use-page-width.ts`（`usePageWidth`）；`src/client/hooks/use-text-pager.ts`（`useTextPager`）；`src/client/hooks/use-visual.ts`（`useVisual`）；`src/client/views/reader-bar.ts`（`ReaderBar`）；`src/client/views/visual-reader.ts`（`VisualReader`）；`src/client/helpers.ts`（`readReadingMode`、`saveReadingMode`、`readPageLayout`、`savePageLayout`）；`src/client/plugin.ts`（`ReaderPanel`）
- **测试：** `tests/paging.test.ts`；`tests/client-assembly.test.ts`

## 行为

打开书籍按格式决定初始视图：PDF 始终分页；EPUB/txt/md 沿用全局记忆的阅读模式与单/双页布局，首次使用默认分页、单页。工具栏提供翻页或章节切换、标题、位置、模式与单/双页切换；PDF 另有页码与缩放。位置显示当前页/栏及总数，双页显示起止范围。

Reflowable 内容用 CSS 多栏：单页一栏、双页两栏。txt/md 由 `useTextPager` 测量内层宽度并把翻页写为 `scrollLeft`；EPUB 在 iframe 的 `html` 上应用同样栏样式，按 iframe 宽度测量。页数由视口、字号、布局与原书 CSS 决定，不是印刷页。

页宽按阅读区高度乘 A4 比例（`210 / 297`）计算并夹取、居中；双页跨度 `2 × 页宽 + 40px`，窄屏 `max-width: 100%`。PDF 保持宽高比适配；尺寸变化重测页宽，EPUB 重测栏宽与页数。

滚轮只在分页模式翻页：文本/EPUB/PDF 分别监听阅读框、iframe、视觉容器；累计超过阈值才翻页，忽略 `ctrl`/`meta`/`alt`。文本/EPUB 在章节边界切到相邻章节；搜索/笔记跳转：PDF 按页，EPUB 切章并在 iframe 内定位，文本分页按块定位并同步页码。

## 接口与代码映射

| 入口/符号 | 位置 | 职责 |
|---|---|---|
| `measurePageMetrics` | `src/client/paging.ts:measurePageMetrics` | 算栏宽、栏数、页数与步长 |
| `pageWidthForHeight` / `pageSpanWidth` | `src/client/paging.ts:pageWidthForHeight`；`src/client/paging.ts:pageSpanWidth` | A4 页宽与单/双页跨度 |
| `pageBounds` | `src/client/paging.ts:pageBounds` | 页索引换算起止栏 |
| `useTextPager` | `src/client/hooks/use-text-pager.ts:useTextPager` | 文本多栏测量、滚动同步与翻页 |
| `useVisual` | `src/client/hooks/use-visual.ts:useVisual` | PDF 取图、EPUB 分页重测 |
| `readReadingMode` / `saveReadingMode` | `src/client/helpers.ts:readReadingMode`；`src/client/helpers.ts:saveReadingMode` | 全局记忆文本模式，默认分页 |
| `readPageLayout` / `savePageLayout` | `src/client/helpers.ts:readPageLayout`；`src/client/helpers.ts:savePageLayout` | 全局记忆布局，默认单页 |
| `ReaderPanel` | `src/client/plugin.ts:ReaderPanel` | 模式/布局记忆、页宽与工具栏 |

## 约束与失败行为

- 模式与布局存 localStorage（`dsh-readpilot.reading-mode`、`dsh-readpilot.page-layout`），换书与重启后沿用；非法或不可用时回退分页、单页。PDF 有效模式始终分页，不覆盖文本模式记忆。
- 页数是布局结果，不是固定 CFI 或印刷页；视口、字号、布局变化会重测并夹取当前页。
- 单页页宽由阅读区高度决定，宽而矮的窗口会收窄并留白；测得 0 时不写内联页宽，退回默认宽度。
- 文本分页按栏宽步长把 `scrollLeft` 四舍五入为页码，平滑滚动中可能短暂显示中间栏。
- PDF 双页选区、笔记与高亮只绑定展开页第一页；第二页可读但不能开选段工具栏；缩放只提高渲染分辨率，显示高度不变。
- EPUB 分页依赖原书 CSS 与浏览器多栏；固定宽高、浮动或分栏可能造成页数或裁切不理想。
- 缩放与页码输入是 PDF 专属；页码提交夹取到 1..pageCount。

## 验收与测试

- 正常：栏数/页数/边界与栏距（`columns_for_layouts`、`measure_single_column`、`measure_gap_accounting`）。
- 正常/边界：页宽/跨度按布局计算夹取，非法输入返回 0（`page_width_from_height`、`page_width_clamps_to_available_width`、`page_span_single`、`page_span_double`、`page_span_invalid_inputs`）。
- 边界：空内容/非法尺寸/越界页索引（`measure_invalid_inputs`、`clamp_page_index`、`page_bounds`）。
- 默认/记忆：首次分页单页；模式和布局全局记忆，非法值回退默认（`reading_preferences_default_single_paged`、`reading_preferences_are_global_and_validate_values`）。
