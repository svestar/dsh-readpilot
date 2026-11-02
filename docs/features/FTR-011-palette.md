# 阅读配色

- **ID：** FTR-011
- **名称：** 阅读配色
- **状态：** active
- **代码：** `client.js`（`READER_PALETTES`、`resolveReaderPalette`、`ReaderPanel`）
- **测试：** `tests/palette.test.js`

## 行为

阅读界面默认使用 `auto` 配色，正文背景与文字通过 DSH 的 `--dsw-alias-bg-base`、`--dsw-alias-label-primary` 等变量跟随界面深浅色。用户可在书籍视图头部的下拉中切换 `auto`、`light`、`dark`、`sepia`、`green`、`night` 六种方案；选择写入 `localStorage` 的 `dsh-reader.palette`，刷新后保留。配色应用到 txt/md 正文、PDF 页面周围背景、EPUB iframe 的页面背景与基础文字色；PDF 页面图片保持原色，顶部栏、TOC、伴读/笔记栏继续使用 DSH 主题。

## 接口与代码映射

| 入口/符号 | 位置 | 职责 |
|---|---|---|
| `READER_PALETTES` | `client.js:READER_PALETTES` | 六种配色的背景、文字、边框、选区与高亮颜色 |
| `resolveReaderPalette` | `client.js:resolveReaderPalette` | 解析配色 id，非法值回退 auto |
| `ReaderPanel` | `client.js:ReaderPanel` | 应用 CSS 变量、头部选择器与 EPUB iframe 样式注入 |

## 约束与失败行为

`localStorage` 不可用或值非法时回退 `auto`，不抛错。`auto` 的正文颜色是 CSS 变量，DSH 切换深浅色时文本阅读面自动跟随；EPUB iframe 在重新加载章节或重新打开时跟随。显式配色使用固定色值；PDF 页面图片不做反色或滤镜，深色方案下页面仍是白纸，只有周围背景变深。EPUB 只覆盖页面背景和基础文字色，图片、字体、布局保持原书；作者自定义的内联强调色可能被统一。`localStorage` 写入失败不影响当前选择。

## 验收与测试

- 正常路径：六种预设都存在，`auto` 使用 DSH CSS 变量，各预设背景/文字不同（`resolve_reader_palette_defaults`）。
- 边界：未知配色 id 回退到 `auto`（`resolve_reader_palette_fallback`）。
