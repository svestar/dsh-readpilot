# 阅读配色

- **ID：** FTR-011
- **名称：** 阅读配色
- **状态：** active
- **代码：** `src/client/helpers.ts`（`READER_PALETTES`、`READER_PALETTE_IDS`、`resolveReaderPalette`、`applyPaletteToFrame`）；`src/client/views/header.ts`（`Header`）；`src/client/plugin.ts`（`ReaderPanel`、`data-palette`）
- **测试：** `tests/palette.test.ts`

## 行为

阅读界面默认使用 `auto` 配色，正文背景与文字通过 DSH 的 `--dsw-alias-bg-base`、`--dsw-alias-label-primary` 等变量跟随界面深浅色。用户可在书籍视图头部的下拉中切换 `auto`、`light`、`dark`、`sepia`、`green`、`night`、`glass` 七种方案；选择写入 `localStorage` 的 `dsh-readpilot.palette`，刷新后保留。配色应用到 txt/md 正文、PDF 页面周围背景、EPUB iframe 的页面背景与基础文字色；PDF 页面图片保持原色；`glass` 方案在 `auto` 的基础上只增加毛玻璃：正文背景与书库遮罩同色、文字与选区跟随 DSH，正文区额外启用 `backdrop-filter: blur(25px)`，PDF 与 EPUB 视觉区保持与 `auto` 相同的普通底色（iframe 不做半透明，避免页面发灰），选中该方案后头部出现“模糊”滑杆（0–80px），拖动即时改变模糊强度；顶部栏、TOC、伴读栏保持 DSH 主题。`auto` 方案下正文背景与书库遮罩同色（浅色 `rgba(240,243,248,.5)`、深色 `rgba(0,0,0,.5)`），不加模糊。书库背景在所有配色下保持一致：遮罩跟随 DSH 深浅色：浅色主题用偏白磨砂底色（`rgba(240,243,248,.5)`），深色主题用黑色遮罩（`rgba(0,0,0,.5)`，由 `body[data-ds-dark-theme]` 判定）；书库另带约 4px 模糊与内描边，设置页不带模糊；卡片、工具栏等组件仍使用 DSH 主题。

## 接口与代码映射

| 入口/符号 | 位置 | 职责 |
|---|---|---|
| `READER_PALETTES` | `src/client/helpers.ts:READER_PALETTES` | 七种配色的背景、文字、边框、选区与高亮颜色 |
| `resolveReaderPalette` | `src/client/helpers.ts:resolveReaderPalette` | 解析配色 id，非法值回退 auto |
| `normalizeGlassBlur` | `src/client/helpers.ts:normalizeGlassBlur` | 把模糊值收敛到 0–80px，非法值回退默认 |
| `applyPaletteToFrame` | `src/client/helpers.ts:applyPaletteToFrame` | 向 EPUB iframe 注入背景/文字/选区样式 |
| `Header` | `src/client/views/header.ts:Header` | 配色选择器与阅读器头部 |
| `ReaderPanel` | `src/client/plugin.ts:ReaderPanel` | 应用面板 CSS 变量与配色状态 |

## 约束与失败行为

`localStorage` 不可用或值非法时回退 `auto`，不抛错。`auto` 的正文颜色是 CSS 变量，DSH 切换深浅色时文本阅读面自动跟随；EPUB iframe 在重新加载章节或重新打开时跟随。除 `glass` 外，显式配色使用固定色值；PDF 页面图片不做反色或滤镜，深色方案下页面仍是白纸，只有周围背景变深。EPUB 只覆盖页面背景和基础文字色，图片、字体、布局保持原书；作者自定义的内联强调色可能被统一。`localStorage` 写入失败不影响当前选择。玻璃模糊值同样写入 `localStorage`（`dsh-readpilot.glass-blur`），非法或缺失时回退 25px，超出 0–80 会被收敛；滑杆只在毛玻璃方案的书籍视图出现。`glass` 的模糊只作用于文本阅读面，依赖 `backdrop-filter`；浏览器不支持时退化为半透明纯色背景，文字对比度仍按该方案固定。视觉阅读区不使用模糊，避免在 PDF 页面上叠加开销。

## 验收与测试

- 正常路径：七种预设都存在，`auto` 使用 DSH CSS 变量，各预设背景/文字不同（`resolve_reader_palette_defaults`）。
- 边界：未知配色 id 回退到 `auto`（`resolve_reader_palette_fallback`）。
- 边界：模糊值缺失回退 25px，超界收敛到 0–80（`glass_blur_is_clamped`）。
