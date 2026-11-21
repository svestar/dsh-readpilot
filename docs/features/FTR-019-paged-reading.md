# 分页阅读

- **ID：** FTR-019
- **名称：** 分页阅读
- **状态：** active
- **代码：** `src/client/modules/reader/paging.ts`（`measurePageMetrics`、`chapterFractionPercent`）；`src/client/modules/reader/paging-model.ts`（`pageOfAnchor`、`anchorAtPage`、`turnTarget`）；`src/client/modules/reader/page-geometry.ts`（`readPageGeometry`）；`src/client/modules/reader/use-page-width.ts`（`usePageWidth`）；`src/client/modules/reader/use-text-pager.ts`（`useTextPager`）；`src/client/modules/reader/use-visual.ts`（`useVisual`）；`src/client/modules/reader/ReaderPanelView.ts`
- **测试：** `tests/page-anchor.test.ts`；`tests/paging.test.ts`；`tests/client-assembly.test.ts`；`tests/api-library.test.ts`；`tests/api-reading.test.ts`；`tests/api-notes.test.ts`；`tests/api-companion.test.ts`

## 行为

打开书籍按格式决定初始视图：PDF 始终分页；EPUB/txt/md 沿用记忆的阅读模式与单/双页布局，首次默认分页、单页。工具栏提供翻页/章节、标题、位置与 PDF 页码/缩放；阅读模式、单双页与重排由阅读设置面板管理（见 [FTR-032](FTR-032-reader-settings.md)）。

Reflowable 内容用 CSS 多栏：单页一栏、双页两栏。文本分页器保存内容锚点（章节、块、块内比例，或章首/章末），页码只是当前布局的投影。同章翻页是页 ± 1；末页向前落到下一章章首，首页向后落到上一章章末；章末锚点在译文到达后继续跟随布局，直到用户再次翻页。字号、页宽、单双页、图片或译文变化都会重测，屏幕上的首段内容不变。

位置显示：文本与 EPUB 为本章页码与全书百分比；PDF 原版为页/总页数；PDF 重排为章节页；双页显示跨页序号。百分比按章节字数加权，文本页内比例由块锚点计算，不受译文开关影响。

页宽按 A4 比例（210/297）夹取后居中；文本左右 56px（窄屏 22），滚动列内 28px（窄屏 16）。滚轮只在分页模式翻页，累计超阈值才翻页，忽略 `ctrl`/`meta`/`alt`。

## 接口与代码映射

| 入口/符号 | 位置 | 职责 |
|---|---|---|
| `measurePageMetrics` | `src/client/modules/reader/paging.ts:measurePageMetrics` | 栏宽、栏数、页数与步长 |
| `chapterFractionPercent` | `src/client/modules/reader/paging.ts:chapterFractionPercent` | 块比例与章节字数算百分比 |
| `pageOfAnchor` / `anchorAtPage` | `src/client/modules/reader/paging-model.ts:pageOfAnchor` | 锚点与页码互换 |
| `turnTarget` | `src/client/modules/reader/paging-model.ts:turnTarget` | 同章翻页与跨章判定 |
| `readPageGeometry` | `src/client/modules/reader/page-geometry.ts:readPageGeometry` | 测量时抓取块矩形快照 |
| `useTextPager` | `src/client/modules/reader/use-text-pager.ts:useTextPager` | 锚点状态机与翻页 |

## 约束与失败行为

- 页数是布局结果，不是印刷页；视口、字号、布局或译文变化会重测并按锚点换页。
- 布局输入变化时先暂停翻页提交，测量完成后恢复；连续输入合并，不按旧页数跨章。
- 锚点按块内高度比例恢复，长段落跨页时可能有半页以内误差；空块或旧锚点退回最近的块。
- 双页页码按 `floor(栏索引 / 2)` 计算，同一跨页的两栏属于同一页。
- 进度保存 `chapterFraction`（0–1），文本分页按块权重计算，译文开关不改变同一位置的保存值。
- PDF/EPUB 视觉页不受内容锚点影响；仅文本分页使用块锚点。

## 验收与测试

- 正常：同章翻页与回翻（`turn_moves_inside_chapter`、`anchor_at_page_round_trips_through_page_of_anchor`）。
- 边界：跨章前进落到下一章章首，回翻落到上一章章末（`turn_crosses_to_next_chapter_start`、`turn_crosses_to_previous_chapter_end`）。
- 边界：译文使页数增长后章末锚点仍在末页（`chapter_end_survives_layout_growth`）。
- 正常：双页两栏映射到同一页（`double_page_maps_both_columns_to_same_page`）。
- 正常：全书百分比按块比例与章节字数计算（`chapter_fraction_percent_uses_content_fraction`）。
- 正常：进度保存章节内比例，重新打开按比例恢复（`progress_percent_persists`）。
