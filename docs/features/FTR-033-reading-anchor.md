# 阅读位置锚点

- **ID：** FTR-033
- **名称：** 阅读位置锚点
- **状态：** active
- **代码：** `src/client/paging.ts`（`ReadingAnchor`、`anchorPage`）；`src/client/hooks/use-text-pager.ts`（`useTextPager`）；`src/client/hooks/use-visual.ts`（`useVisual`）；`src/client/plugin.ts`（`makeReadingAnchor`、`changeFlow`、`changeSpread`、`changeFontSize`、`applySource`、`openBook`）；`src/api/index.ts`（`saveReadingProgress`）；`src/storage/store.ts`（`ReadingProgress.chapterFraction`）
- **测试：** `tests/paging.test.ts`；`tests/api.test.ts`

## 行为

切换阅读设置（原版/重排、滚动/分页、单页/双页）前，按当前渲染器记录一个位置锚点：章节 id、当前页在章节中的比例、一次性 token。新渲染器完成测量后，如果 token 尚未消费且章节匹配，就把当前页设置为 `anchorPage(比例, 新页数)`；之后用户继续翻页或窗口变化不会再次跳回。

文本渲染器分页时用章节内页比例，滚动时用滚动容器比例；EPUB 原版用 iframe 当前页比例。字号变化同样先记录锚点，避免重排后回到页首。PDF 原版切到 PDF 重排时，按当前 PDF 页找到对应章节并以该章开头为锚点；切回原版时直接恢复 PDF 页号。切换只改变渲染方式，不改变章节。打开书籍时，已保存的 `chapterFraction` 也会作为一次性锚点恢复章节内位置。

## 接口与代码映射

| 入口/符号 | 位置 | 职责 |
|---|---|---|
| `ReadingAnchor` | `src/client/paging.ts:ReadingAnchor` | 章节、比例与一次性 token |
| `anchorPage` | `src/client/paging.ts:anchorPage` | 比例换算为页索引并夹取 |
| `useTextPager` | `src/client/hooks/use-text-pager.ts:useTextPager` | 文本分页消费锚点 |
| `useVisual` | `src/client/hooks/use-visual.ts:useVisual` | EPUB 视觉分页消费锚点 |
| `makeReadingAnchor` | `src/client/plugin.ts:makeReadingAnchor` | 从当前渲染器生成锚点 |
| `changeFlow` / `changeSpread` | `src/client/plugin.ts:changeFlow` | 切换阅读方式/版式前记录锚点 |
| `applySource` | `src/client/plugin.ts:applySource` | 切换原版/重排并处理 PDF 页映射 |

## 约束与失败行为

锚点是页级比例，不是块或字符级锚点；同一页内的位置可能前后偏移一页。章节不匹配时锚点被忽略，不会把用户拉到别的章节。PDF 原版与重排的页不是同一概念，只在切换时按页对应章节，之后各自独立。锚点只消费一次；重复 resize、字体加载或图片加载不会重复跳转。

## 验收与测试

- 正常路径：比例 0/0.5/1 分别落到首页、中间页、末页，非法比例夹取（`anchor_page_restores_fraction`）。
- 正常：阅读进度保存章节内比例，重新打开按比例恢复（`progress_percent_persists`）。
