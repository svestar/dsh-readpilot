# EPUB 文本

- **ID：** FTR-006
- **名称：** EPUB 文本
- **状态：** active
- **代码：** `src/formats/epub.js`（`parseEpub`）
- **测试：** `tests/epub.test.js`

## 行为

打开 EPUB 时，Host 用 `jszip` 解压，读取 `META-INF/container.xml` 找到 OPF，按 manifest 与 spine 顺序读取章节 XHTML。目录优先使用 manifest 中 `properties` 含 `nav` 的导航文档，其次使用 NCX，最后回退到章节内的首个标题。XHTML 先移除 script/style/noscript/template，再提取 h1–h6、p、blockquote、pre、li 块；实体与空白由 DOM 解析处理。章节标题优先取目录项，缺失时取首个标题或“第 N 章”；没有文本块的 spine 项跳过。书名与作者取 OPF metadata 的 dc:title、dc:creator，书名缺失时用文件名。

## 接口与代码映射

| 入口/符号 | 位置 | 职责 |
|---|---|---|
| `parseEpub` | `src/formats/epub.js:parseEpub` | 解压 EPUB、解析 OPF/spine/目录并生成章节 |
| `parseBookAsync` | `src/formats.js:parseBookAsync` | 按格式分派到 EPUB 解析器 |

## 约束与失败行为

只提取文本，不渲染原书 CSS、图片、字体，不处理 DRM。压缩包条目超过 10000、总解压超过 200 MB、单条超过 50 MB 时抛错；缺少 container.xml、OPF、损坏的 XHTML 或加密压缩包都返回明确错误，不生成空书。目录与 spine 不一致时以 spine 顺序为准，目录只提供标题。

## 验收与测试

- 正常路径：按 nav 目录解析出章节标题、spine 顺序与正文块（`parse_epub_nav_toc`）。
