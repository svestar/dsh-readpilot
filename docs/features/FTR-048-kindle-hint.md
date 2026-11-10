# Kindle 格式提示

- **ID：** FTR-048
- **名称：** Kindle 格式提示
- **状态：** active
- **代码：** `src/formats.ts`（`LibraryFormat`、`libraryFormatOf`）；`src/library.ts`（`scanLibrary`、`Book`）；`src/api.ts`（`open`）；`src/client/views/library-view.ts`（`BookCard`）；`src/client/plugin.ts`（`openBook`）
- **测试：** `tests/library.test.ts`；`tests/api.test.ts`

## 行为

书库扫描识别 `.mobi`、`.azw`、`.azw3`，以 `format: 'kindle'`、`supported: false` 列出，不解析章节、封面或文本。书库卡片显示“需转 EPUB”徽标；点击打开进入不可读页面，提示：

> 请先将 MOBI/AZW/AZW3 转换为 EPUB 后导入；当前不解析该格式。

提示不包含 Calibre 步骤，不调用外部转换器，不处理 DRM。TXT、Markdown、EPUB、PDF 的扫描与打开行为不变；检索和其他工具跳过 `supported: false` 的书。

## 接口与代码映射

| 入口/符号 | 位置 | 职责 |
|---|---|---|
| `LibraryFormat` / `libraryFormatOf` | `src/formats.ts:libraryFormatOf` | 识别受支持格式与 Kindle 扩展名 |
| `scanLibrary` | `src/library.ts:scanLibrary` | 把 Kindle 文件列为不可读书籍 |
| `open` | `src/api.ts:open` | 对不支持格式返回 `supported: false` |
| `BookCard` | `src/client/views/library-view.ts:BookCard` | 显示“需转 EPUB”徽标 |
| `openBook` | `src/client/plugin.ts:openBook` | 显示转换提示而不是进入阅读器 |

## 约束与失败行为

Kindle 文件没有章节、封面、目录、检索、批注或伴读能力；`open` 返回不支持结果，不抛出解析错误。扫描仍计算 `contentKey` 以参与书库身份与去重，但不解析书籍内容。格式识别只按扩展名，不校验真实容器；用户改扩展名可能得到同样的提示。DRM、转换工具和 Calibre 均不在本功能范围。

## 验收与测试

- 正常路径：扫描把 `.mobi`、`.azw3` 列为 `kindle` 且 `supported: false`（`scan_lists_kindle_files_as_unsupported`）。
- 边界：打开 Kindle 书返回不支持，书库仍保留该记录（`kindle_book_is_listed_but_not_opened`）。
