# EPUB 章节合并

- **ID：** FTR-014
- **名称：** EPUB 章节合并
- **状态：** active
- **代码：** `src/formats/epub.js`（`parseEpub`、`isTitleOnly`）；`src/api.js`（`open` 过滤 `skip`）
- **测试：** `tests/epub.test.js`

## 行为

EPUB 的 spine 是文件清单，不总是逻辑章节：封面、书名页或只有标题的短页常单独成为一个 spine 项。解析时若某项可见文字不超过 60 字且没有超过 40 字的段落，就视为标题页：

- 保留该项的章节槽位与 id，供旧进度/笔记锚点继续解析；
- 把标题页的块前置合并到下一章，下一章成为实际阅读章节；
- 标题页标记 `skip`，`open` 返回的目录和 `reader_open` 工具不显示它；
- 下一个目录标题有效时用它命名合并后的章节；`封面`、`Cover`、`Title Page`、`目录` 等泛化标题不覆盖正文标题。

这样不会出现“点第一章只看到一页标题，翻页就跳下一章”，也不会改写 EPUB 原文件或解压资源。

## 接口与代码映射

| 入口/符号 | 位置 | 职责 |
|---|---|---|
| `parseEpub` | `src/formats/epub.js:parseEpub` | 解析 spine，识别标题页并把块合并到下一章 |
| `isTitleOnly` | `src/formats/epub.js:isTitleOnly` | 按字数与长段落判断标题页 |
| `open` | `src/api.js:open` | 过滤 `skip` 章节，返回可见目录 |

## 约束与失败行为

标题页判定是保守阈值：只有短且有长正文的页面不合并；正文很短的正常章节不会被误合并。标题页槽位保留，旧 `chapterId` 仍能定位；但该槽位不再出现在目录中，旧笔记若恰好落在标题页上，仍可打开但不能从目录跳转。合并后的章节 `chars` 包含标题页文字；`skip` 槽位 `chars` 设为 0，避免全书字数重复统计。解析缓存版本随规则变化递增，旧缓存会自动重建；不修改源 EPUB。

## 验收与测试

- 正常路径：标题页被标记 `skip`，下一章包含标题页文字并保留正文标题（`parse_epub_merges_title_only_spine_page`）。
- 正常路径：普通 EPUB 的目录、块顺序与字数保持原行为（`parse_epub_nav_toc`）。
