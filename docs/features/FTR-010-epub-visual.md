# EPUB 视觉

- **ID：** FTR-010
- **名称：** EPUB 视觉
- **状态：** active
- **代码：** `src/visual/epub.ts`（`createEpubVisual`）；`src/formats/epub.ts`（`parseEpub` 的 `href`）；`src/api.ts`（`epubDocument`、`epubAsset`）；`src/client/hooks/use-visual.ts`（`useVisual`）；`src/client/views/visual-reader.ts`（`VisualReader`）；`src/client/plugin.ts`（`ReaderPanel`）
- **测试：** `tests/epub-visual.test.ts`

## 行为

打开 EPUB 时，Host 把资源解压到 `$DSH_HOME/dsh-reader/assets/<bookId>/`，按 OPF 解析目录与 spine。Client 用 iframe 加载 `/api/dsh-reader/epub-doc`，Host 返回清洗后的章节 XHTML，并把 CSS、图片、字体 URL 改写为 `/api/dsh-reader/epub-asset`，因此原书 CSS/图片/字体得以保留。目录点击或上一章/下一章切换 iframe；父页面读取 iframe 选区，选段可预填伴读或建笔记。搜索/笔记点击切换到对应章节。

## 接口与代码映射

| 入口/符号 | 位置 | 职责 |
|---|---|---|
| `createEpubVisual` | `src/visual/epub.ts:createEpubVisual` | 解压、清洗 XHTML、改写资源 URL、返回资源字节 |
| `parseEpub` | `src/formats/epub.ts:parseEpub` | 在章节上写入相对 OPF 的 `href` |
| `epubDocument` | `src/api.ts:epubDocument` | 返回清洗后的章节 HTML |
| `epubAsset` | `src/api.ts:epubAsset` | 返回 CSS/图片/字体字节 |
| `useVisual` | `src/client/hooks/use-visual.ts:useVisual` | EPUB iframe 状态、章节切换、选区桥与配色注入 |
| `VisualReader` | `src/client/views/visual-reader.ts:VisualReader` | iframe 与章节工具栏 |
| `ReaderPanel` | `src/client/plugin.ts:ReaderPanel` | 组合阅读器、TOC 与笔记层 |

## 约束与失败行为

iframe 使用 `sandbox="allow-same-origin"`，不启用 `allow-scripts`；原书 script、事件属性、iframe/object/form 等被移除，`javascript:` 与远程 URL 被清空。资源路径必须在解压根内，`..`/绝对路径被拒绝。CSS 中的 `url()` 会改写为同一资源路由；远程 CSS 资源被置空。EPUB 加密、缺 container/OPF、路径穿越或损坏章节返回明确错误。v1 为滚动阅读，不做分页和精确 CFI；搜索/笔记在视觉模式只做章节跳转，精确高亮留待后续。章节工具栏左右按钮固定，章节名在中间截断，长标题不会推动翻页按钮。页面背景与基础文字色由 FTR-011 覆盖，图片、字体与布局保持原书。

## 验收与测试

- 正常路径：解压 EPUB 后得到标题、作者与 spine href（`epub_visual_prepare_spine`）。
- 安全：章节 HTML 中的 script/onclick 被移除，图片与章节链接被改写（`epub_visual_sanitizes_document`）。
- 正常路径/边界：CSS 内 `url()` 改写为资源路由，图片字节可读取，`../` 路径被拒绝（`epub_visual_asset_urls_and_path_guard`）。
