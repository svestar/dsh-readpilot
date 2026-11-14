# EPUB 文本

- **ID：** FTR-006
- **名称：** EPUB 文本
- **状态：** active
- **代码：** `src/host/modules/reading/formats/epub/index.ts`（`parseEpub`）
- **测试：** `tests/epub.test.ts`

## 行为

打开 EPUB 时，Host 用 `jszip` 解压，读取 `META-INF/container.xml` 找到 OPF，按 manifest 与 spine 顺序读取章节 XHTML。目录优先使用 manifest 中 `properties` 含 `nav` 的导航文档，其次使用 NCX，最后回退到章节内的首个标题。XHTML 先移除 script/style/noscript/template，再提取 h1–h6、p、blockquote、pre、li、img、table 块；图片保留 zip 内相对路径与 alt，供阅读器通过 `epub-asset` 显示；表格提取普通行列的单元格文本；实体与空白由 DOM 解析处理。章节标题优先取目录项，缺失时取首个标题或“第 N 章”；没有文本块的 spine 项跳过。书名与作者取 OPF metadata 的 dc:title、dc:creator，书名缺失时用文件名。

## 接口与代码映射

| 入口/符号 | 位置 | 职责 |
|---|---|---|
| `parseEpub` | `src/host/modules/reading/formats/epub/index.ts:parseEpub` | 解压 EPUB、解析 OPF/spine/目录并生成章节 |
| `parseBookAsync` | `src/host/modules/reading/formats.ts:parseBookAsync` | 按格式分派到 EPUB 解析器 |
| `imageBlock` | `src/host/modules/reading/formats/epub/html.ts:imageBlock` | 解析章节内图片的相对路径与 alt |
| `tableRows` | `src/host/modules/reading/formats/epub/html.ts:tableRows` | 把表格普通行列提取为二维文本 |

## 约束与失败行为

不渲染原书 CSS、字体，不处理 DRM；图片提取为 image 块，由阅读器按需加载；表格忽略 rowspan/colspan、嵌套表格与 caption。压缩包条目超过 10000、总解压超过 200 MB、单条超过 50 MB 时抛错；缺少 container.xml、OPF、损坏的 XHTML 或加密压缩包都返回明确错误，不生成空书。目录与 spine 不一致时以 spine 顺序为准，目录只提供标题。

## 验收与测试

- 正常路径：按 nav 目录解析出章节标题、spine 顺序、正文块、图片块与表格块（`parse_epub_nav_toc`）。
