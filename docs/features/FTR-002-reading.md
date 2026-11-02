# 文本阅读

- **ID：** FTR-002
- **名称：** 文本阅读
- **状态：** active
- **代码：** `src/formats.js`（`parseBook`、`parseBookAsync`、`splitChapters`、`decodeText`）
- **测试：** `tests/formats.test.js`

## 行为

打开一本 txt 或 md 书籍时，Host 读取文件、按 BOM 或 UTF-8/GB18030/Big5 顺序解码，规范化换行与多余空行，再切分章节。txt 以“第 N 章/节/回/卷/篇”、`Chapter N` 行作为章节边界，没有边界时按约 6000 字在段落边界切分；md 以一级、二级标题作为章节边界，并解析文件头 frontmatter 中的 `title` 与 `author`。书名取 frontmatter 的 `title`，没有时使用文件名，不把一级标题当作书名。每章转换为 `p`、`h`、`quote`、`code`、`li` 块，并记录字数。EPUB/PDF 由 `parseBookAsync` 动态分派到各自解析器（见 FTR-006/007）。解析结果缓存在 `$DSH_HOME/dsh-reader/cache/<bookId>.json`，缓存命中要求解析器版本、`mtimeMs` 与 `size` 一致。

## 接口与代码映射

| 入口/符号 | 位置 | 职责 |
|---|---|---|
| `parseBook` | `src/formats.js:parseBook` | 同步解析 txt/md，生成块与字数 |
| `parseBookAsync` | `src/formats.js:parseBookAsync` | 按格式分派 txt/md/epub/pdf |
| `splitChapters` | `src/formats.js:splitChapters` | 按标题或长度切分章节 |
| `decodeText` | `src/formats.js:decodeText` | BOM 与多编码解码 |

## 约束与失败行为

同步 `parseBook` 只接受 txt 与 md；EPUB/PDF 走 `parseBookAsync`，各自的失败行为见 FTR-006/007。单文件超过 100 MB 返回 `book-too-large`。纯文本按段落保留换行，md 仅实现块级结构与常见行内强调、代码、链接；表格、脚注、数学公式不做特殊渲染。文本解码使用严格编码判定，不再回退宽松 UTF-8；详细规则与失败行为见 [FTR-015](FTR-015-text-encoding.md)。

## 验收与测试

- 正常路径：中文 txt 的“第一章”“第二章”被切成独立章节，章节前的内容归入“前言”（`split_chinese_chapters`）。
- 正常路径：md frontmatter 的标题与作者被读出，列表项生成 `li` 块（`parse_markdown_metadata`）。
- 正常路径：md 没有 frontmatter 时，书名取文件名而不是第一个一级标题（`parse_markdown_uses_filename_title`）。
- 边界：GB18030 编码的中文能正确解码（`decode_legacy_chinese`）。
