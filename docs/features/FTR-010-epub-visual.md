# EPUB 视觉

- **ID：** FTR-010
- **名称：** EPUB 视觉
- **状态：** active
- **代码：** `src/visual/epub.ts`（`createEpubVisual`）；`src/formats/epub.ts`（`parseEpub` 的 `href`）；`src/api.ts`（`epubDocument`、`epubAsset`）；`src/client/hooks/use-visual.ts`（`useVisual`）；`src/client/reader/visual-reader.ts`（`VisualReader`）；`src/client/plugin.ts`（`ReaderPanel`）
- **测试：** `tests/epub-visual.test.ts`

## 行为

打开 EPUB 时，Host 把资源解压到 `$DSH_HOME/dsh-readpilot/assets/<bookId>/`，按 OPF 解析目录与 spine。Client 用 iframe 加载 `/api/dsh-readpilot/epub-doc`，Host 返回清洗后的章节 XHTML，并把 CSS、图片、字体 URL 改写为 `/api/dsh-readpilot/epub-asset`，因此原书 CSS/图片/字体得以保留。章节与资源 URL 带书文件 mtime 版本，书替换后不会复用旧文档或旧资源。打开时默认滚动阅读；共享工具栏可切到分页，分页在 iframe 内按一或两栏排版，并用滚轮或按钮翻页，章节边界切到相邻章节。滚动与单页分页时 iframe 采用按阅读区内容高度推导的 A4 页宽并水平居中；双页分页的 iframe 跨度为 `2 × A4 页宽 + 40px`，居中并在窄屏用 `max-width: 100%` 夹取。iframe 宽度变化后分页重新测量栏宽与页数。目录点击切换 iframe；滚动模式下上一章/下一章切换章节。父页面读取 iframe 选区，选段可预填伴读或建笔记。搜索/笔记点击切换到对应章节，笔记在 iframe 内高亮并滚动定位。分页布局、页码与滚轮行为见 [FTR-019](FTR-019-paged-reading.md)。面板重新挂载（例如切到其他 DSH 页面再返回）时，按恢复的当前章节重建 iframe，不会退回纯文本阅读。

## 接口与代码映射

| 入口/符号 | 位置 | 职责 |
|---|---|---|
| `createEpubVisual` | `src/visual/epub.ts:createEpubVisual` | 解压、清洗 XHTML、改写资源 URL、返回资源字节 |
| `parseEpub` | `src/formats/epub.ts:parseEpub` | 在章节上写入相对 OPF 的 `href` |
| `epubDocument` | `src/api.ts:epubDocument` | 返回清洗后的章节 HTML |
| `epubAsset` | `src/api.ts:epubAsset` | 返回 CSS/图片/字体字节 |
| `useVisual` | `src/client/hooks/use-visual.ts:useVisual` | EPUB iframe 状态、章节切换、选区桥与配色注入 |
| `VisualReader` | `src/client/reader/visual-reader.ts:VisualReader` | iframe 与分页容器 |
| `ReaderPanel` | `src/client/plugin.ts:ReaderPanel` | 组合阅读器、TOC 与笔记层 |

## 约束与失败行为

iframe 使用 `sandbox="allow-same-origin"`，不启用 `allow-scripts`；原书 script、事件属性、iframe/object/form 等被移除，`javascript:` 与远程 URL 被清空。资源路径必须在解压根内，`..`/绝对路径被拒绝。CSS 中的 `url()` 会改写为同一资源路由；远程 CSS 资源被置空。EPUB 加密、缺 container/OPF、路径穿越或损坏章节返回明确错误。分页由浏览器多栏 CSS 基于原书样式实现，不生成 CFI 或印刷页码；原书固定宽高、浮动或分栏样式可能使分栏不理想。A4 页宽只是 iframe 的阅读框宽度，不是 EPUB 页面尺寸，原书 CSS 仍决定内部排版；双页每栏按跨度均分，窄屏会小于 A4 页宽。搜索跳转按章节，笔记点击在 iframe 内定位并高亮。共享工具栏的翻页按钮固定，章节名在中间截断，长标题不会推动按钮。页面背景与基础文字色由 FTR-011 覆盖，图片、字体与布局保持原书。

## 验收与测试

- 正常路径：解压 EPUB 后得到标题、作者与 spine href（`epub_visual_prepare_spine`）。
- 安全：章节 HTML 中的 script/onclick 被移除，图片与章节链接被改写（`epub_visual_sanitizes_document`）。
- 正常路径/边界：CSS 内 `url()` 改写为资源路由，图片字节可读取，`../` 路径被拒绝（`epub_visual_asset_urls_and_path_guard`）。
- 正常路径：按章节恢复 EPUB 的 iframe 目标，无 href 时返回空（`visual_target_restores_epub_frame`）。
