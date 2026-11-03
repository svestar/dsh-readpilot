# 分页阅读

- **ID：** FTR-019
- **名称：** 分页阅读
- **状态：** active
- **代码：** `src/client/paging.ts`（`measurePageMetrics`、`pageBounds`、`columnsFor`）；`src/client/hooks/use-text-pager.ts`（`useTextPager`）；`src/client/hooks/use-visual.ts`（`useVisual`）；`src/client/views/reader-bar.ts`（`ReaderBar`）；`src/client/views/visual-reader.ts`（`VisualReader`）；`src/client/plugin.ts`（`ReaderPanel`）
- **测试：** `tests/paging.test.ts`；`tests/client-assembly.test.ts`

## 行为

打开书籍时按格式重置：PDF 单页分页，EPUB/txt/md 滚动，布局为单页。PDF 始终分页，没有滚动模式；EPUB/txt/md 可用共享工具栏在滚动与分页间切换。工具栏提供上一页/下一页（滚动模式为上一章/下一章）、章节标题、页或章节位置、模式切换、单/双页切换；PDF 另有页码输入与缩放。分页位置显示当前页或栏及总数，双页时显示起止范围。

Reflowable 内容用 CSS 多栏：单页一栏、双页两栏。txt/md 由 `useTextPager` 测量阅读框内层宽度并把翻页写为 `scrollLeft`；EPUB 在 iframe 的 `html` 上应用同样的栏样式，按 iframe 宽度测量。页数取决于视口、字号（文本）、布局与原书 CSS，不是印刷页。PDF 单页显示一页，双页并排显示两页；空间不足时客户端等比缩小整组页面，缩放按钮仍可用。

滚轮只在分页模式翻页：文本监听阅读框，EPUB 监听 iframe 文档，PDF 监听视觉容器；累计超过阈值才翻页，`ctrl`/`meta`/`alt` 组合被忽略。文本/EPUB 在章节边界切到相邻章节：向前进入下一章落在第一页，向后进入上一章落在最后一页。搜索/笔记跳转：PDF 按页定位；EPUB 切换章节并在 iframe 内定位笔记，分页模式把 iframe 滚动位置同步为页码；文本分页模式按块滚动定位，跳转产生的滚动会同步更新页码。

## 接口与代码映射

| 入口/符号 | 位置 | 职责 |
|---|---|---|
| `measurePageMetrics` | `src/client/paging.ts:measurePageMetrics` | 由视口宽、内容宽、布局与栏距计算栏宽、栏数、页数与步长 |
| `pageBounds` | `src/client/paging.ts:pageBounds` | 把页索引换算为起止栏 |
| `useTextPager` | `src/client/hooks/use-text-pager.ts:useTextPager` | 文本多栏测量、滚动同步、滚轮翻页与章节边界 |
| `useVisual` | `src/client/hooks/use-visual.ts:useVisual` | PDF 单/双页取图、EPUB 分页测量与滚动同步 |
| `ReaderBar` | `src/client/views/reader-bar.ts:ReaderBar` | 共享工具栏及模式、布局、页码控件 |
| `VisualReader` | `src/client/views/visual-reader.ts:VisualReader` | PDF 页面容器、双页适配与滚轮监听 |
| `ReaderPanel` | `src/client/plugin.ts:ReaderPanel` | 模式/布局状态、打开重置与工具栏组装 |

## 约束与失败行为

- 模式与布局只保存在当前阅读面板，打开另一本书会回到格式默认，不跨书持久化。
- 分页页数是浏览器布局结果，不是固定 CFI 或印刷页；窗口、字号或布局变化会重新测量并夹取当前页。
- 文本分页模式按栏宽步长把 `scrollLeft` 四舍五入为页码；平滑滚动未结束时可能短暂显示中间栏，滚动停止后落在最近栏。
- PDF 双页布局的选区入口、笔记层与高亮只绑定展开页的第一页；第二页可阅读，但不能在该页新建选区或笔记。
- EPUB 分页依赖原书 CSS 与浏览器多栏实现；原书的固定宽高、浮动或分栏样式可能造成页数或裁切不理想。
- 缩放与页码输入是 PDF 专属；页码输入提交时夹取到 1..pageCount。

## 验收与测试

- 正常路径：单/双页的栏数、页数与栏边界计算正确（`columns_for_layouts`、`measure_single_column`、`measure_exact_two_column_overflow`）。
- 正常路径：栏距参与栏宽、栏数与页数计算（`measure_gap_accounting`）。
- 边界：空内容、非法尺寸与越界页索引被夹取（`measure_invalid_inputs`、`clamp_page_index`、`page_bounds`）。
