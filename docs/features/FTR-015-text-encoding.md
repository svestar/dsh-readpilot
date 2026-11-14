# 文本编码

- **ID：** FTR-015
- **名称：** 文本编码
- **状态：** active
- **代码：** `src/host/modules/reading/formats.ts`（`decodeText`、`decodeStrict`、`assertReadableText`）
- **测试：** `tests/formats.test.ts`

## 行为

TXT/MD 读取原始字节后按 BOM 和严格解码器判定编码：UTF-8 BOM、UTF-16LE/BE BOM 优先；否则依次尝试 UTF-8、GB18030、Big5，全部使用 `fatal: true`。解码成功后再检查替换字符和异常控制字符比例；任何候选失败都不会回退到宽松 UTF-8，也不会把乱码写入解析缓存。

## 接口与代码映射

| 入口/符号 | 位置 | 职责 |
|---|---|---|
| `decodeText` | `src/host/modules/reading/formats.ts:decodeText` | 按 BOM/严格候选解码文本 |
| `decodeStrict` | `src/host/modules/reading/formats.ts:decodeStrict` | 使用 `TextDecoder(..., { fatal: true })` |
| `assertReadableText` | `src/host/modules/reading/formats.ts:assertReadableText` | 拒绝替换符与异常控制字符 |

## 约束与失败行为

UTF-16 BOM 解码失败、UTF-8/GB18030/Big5 全部失败、替换字符出现、控制字符比例超过 1% 时都抛出“无法识别文本编码”。GB18030 优先于 Big5；两者都能解码的短文本仍可能被识别为 GB18030，这是当前已知限制。解码结果只进入内存与解析缓存，不覆写源文件；缓存仍按 `mtimeMs`、大小与解析器版本失效。单文件超过 100 MB 的限制不变。

## 验收与测试

- 正常路径：GB18030 中文 txt 解码为“第一章”（`decode_legacy_chinese`）。
- 边界：无法被 UTF-8/GB18030/Big5 解码的字节被拒绝（`decode_invalid_text_rejected`）。
- 正常路径：带 BOM 的 UTF-8/UTF-16 文本可解码（由 `decodeText` 的 BOM 分支保证）。
