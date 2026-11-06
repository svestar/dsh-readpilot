# 重排阅读

- **ID：** FTR-031
- **名称：** 重排阅读
- **状态：** active
- **代码：** `src/visual/epub.ts`（`readDocument` 的 `reflow`）；`src/api.ts`（`epubDocument`）；`index.ts`（`epub-doc` 路由）；`src/client/helpers.ts`（`readReflowMode`、`saveReflowMode`）；`src/client/reader-screen.ts`（`visualForItem`、`visualForChapter`）；`src/client/plugin.ts`（`toggleReflow`）；`src/client/views/header.ts`（`Header`）；`src/client/views/visual-reader.ts`（`VisualReader`）
- **测试：** `tests/epub-visual.test.ts`

## 行为

EPUB 阅读时顶栏出现“重排/原版”切换。重排模式仍在 iframe 中渲染，但 Host 返回的章节文档会去掉出版社的 `<link rel="stylesheet">`、`<style>` 与元素 `style` 属性，改为注入统一排版样式（正文、标题、引用、代码、表格、图片）；字体、行高、首行缩进与图片约束由重排样式固定。原版模式保持出版社 CSS 不变。

分页沿用视觉模式的 CSS 多列：`useVisual` 给 iframe 的 `html` 注入列数与列间距，横向滚动翻页；切换模式后按当前章节重建 iframe。选择保存在 `localStorage` 的 `dsh-readpilot.reflow`，跨书生效。

## 接口与代码映射

| 入口/符号 | 位置 | 职责 |
|---|---|---|
| `readDocument` | `src/visual/epub.ts:readDocument` | `reflow=true` 时清洗样式并注入重排 CSS |
| `epubDocument` | `src/api.ts:epubDocument` | 透传 `reflow` 到视觉层 |
| `readReflowMode` / `saveReflowMode` | `src/client/helpers.ts:readReflowMode`；`src/client/helpers.ts:saveReflowMode` | 读写模式偏好 |
| `visualForItem` / `visualForChapter` | `src/client/reader-screen.ts:visualForItem` | 在视觉状态上带 `reflow` |
| `toggleReflow` | `src/client/plugin.ts:toggleReflow` | 切换模式并重建当前章节 |
| `Header` | `src/client/views/header.ts:Header` | 仅 EPUB 显示“重排/原版”按钮 |
| `VisualReader` | `src/client/views/visual-reader.ts:VisualReader` | iframe URL 带 `reflow=1` |

## 约束与失败行为

只对 EPUB 生效；PDF、TXT、MD 不显示该按钮。清洗会丢失出版社的字体、分栏、浮动等复杂版式；依赖 `style` 属性定位的图片/表格可能变形。页内位置目前只到章节级，切换模式回到章节首屏；视觉模式下的短笔记仍以章节为锚点，没有字符级偏移。iframe 保持 `sandbox="allow-same-origin"`，脚本仍被禁止。

## 验收与测试

- 正常路径：重排文档不再含 `rel="stylesheet"` 与 `style` 属性，并包含 `data-dsh-reflow` 与统一排版规则（`epub_visual_reflow_drops_publisher_styles`）。
- 正常路径：视觉状态携带重排标记（`visual_target_reflow_flag`）。
- 手动验证：Gutenberg《Alice》重排后单列 760px、56px 页边距可正常分页，图片与标题按统一版式显示。
