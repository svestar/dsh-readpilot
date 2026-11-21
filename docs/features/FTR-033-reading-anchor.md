# 阅读位置锚点

- **ID：** FTR-033
- **名称：** 阅读位置锚点
- **状态：** active
- **代码：** `src/client/modules/reader/paging-model.ts`（`AnchorTarget`、`anchorOfFraction`、`fractionOfAnchor`、`pageOfAnchor`）；`src/client/modules/reader/page-geometry.ts`（`readPageGeometry`）；`src/client/modules/reader/use-text-pager.ts`（`useTextPager`）；`src/client/modules/reader/use-visual.ts`（`useVisual`）；`src/client/modules/reader/use-reader-view.ts`（`makeReadingAnchor`、`changeFlow`、`changeSpread`、`changeFontSize`、`openBook`）；`src/host/api.ts`（`saveReadingProgress`）；`src/shared/contracts/library.ts`（`ReadingProgress.chapterFraction`）
- **测试：** `tests/page-anchor.test.ts`；`tests/paging.test.ts`；`tests/api-library.test.ts`；`tests/api-reading.test.ts`；`tests/api-notes.test.ts`；`tests/api-companion.test.ts`

## 行为

切换阅读设置（原版/重排、滚动/分页、单页/双页）前，按当前渲染器记录一个位置锚点：章节 id、章节内比例、一次性 token。文本分页在消费锚点时按章节字重把比例换成块锚点（块索引 + 块内比例），新布局测量完成后把块锚点投影成页码；用户继续翻页或窗口变化不会再次跳回。滚动模式与 EPUB 原版仍用滚动容器比例和 iframe 页比例。

字号变化同样先把当前块锚点转成章节比例再重排，避免回到页首。PDF 原版切到 PDF 重排时，按当前 PDF 页找到对应章节并以该章锚点恢复；切回原版时直接恢复 PDF 页号。切换只改变渲染方式，不改变章节。打开书籍时，已保存的 `chapterFraction` 也会作为一次性锚点恢复章节内位置。

## 接口与代码映射

| 入口/符号 | 位置 | 职责 |
|---|---|---|
| `AnchorTarget` | `src/client/modules/reader/paging-model.ts:AnchorTarget` | 块锚点与章首/章末锚点 |
| `anchorOfFraction` | `src/client/modules/reader/paging-model.ts:anchorOfFraction` | 章节比例换成块锚点 |
| `fractionOfAnchor` | `src/client/modules/reader/paging-model.ts:fractionOfAnchor` | 块锚点换成章节比例 |
| `pageOfAnchor` | `src/client/modules/reader/paging-model.ts:pageOfAnchor` | 块锚点投影成页码 |
| `readPageGeometry` | `src/client/modules/reader/page-geometry.ts:readPageGeometry` | 抓取块矩形快照 |
| `useTextPager` | `src/client/modules/reader/use-text-pager.ts:useTextPager` | 文本分页消费锚点 |
| `makeReadingAnchor` | `src/client/modules/reader/use-reader-view.ts:makeReadingAnchor` | 从当前渲染器生成锚点 |
| `changeFlow` / `changeSpread` | `src/client/modules/reader/use-reader-view.ts:changeFlow` | 切换阅读方式/版式前记录锚点 |
| `openBook` | `src/client/modules/reader/use-reader-view.ts:openBook` | 打开书籍并按保存比例定位 |

## 约束与失败行为

- 文本分页的锚点是块级位置，块内用高度比例近似；同一段落跨页时可能前后偏移半页以内。
- 同一块的原文与译文片段共享块索引，锚点用 part 区分。同一会话内可凭 part 恢复到译文页；保存的 `chapterFraction` 不含 part，重新打开只能恢复到源块末尾之后。
- 译文部分的进度比例记到源块末尾，避免停在译文页时进度回跳到块起点。
- 空块或旧锚点不在当前几何快照时，退回最近的前一个块，不会直接回到章首。
- 锚点章节不匹配时忽略，不会把用户拉到别的章节；token 只消费一次，重复 resize、字体或图片加载不会重复跳转。
- `anchorPage` 仍用于 EPUB 原版视觉分页；文本分页不再用页比例。
- 旧进度值仍是 0–1 的章节比例，按内容比例重新解释后可以近似恢复原位置。

## 验收与测试

- 正常：章节比例与块锚点往返（`fraction_round_trips_block_anchor`）。
- 边界：比例正好落在块边界时进入下一块（`fraction_at_block_boundary_moves_to_next_block`）。
- 边界：锚点块缺失时退回最近块（`page_of_anchor_falls_back_to_nearest_block`）。
- 边界：译文锚点的进度在源块末尾之后，不回跳到块起点（`fraction_of_translation_anchor_is_after_source`）。
- 正常：比例 0/0.5/1 分别落到首页、中间页、末页（`anchor_page_restores_fraction`）。
- 正常：阅读进度保存章节内比例，重新打开按比例恢复（`progress_percent_persists`）。
