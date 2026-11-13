# 全书概括

- **ID：** FTR-039
- **名称：** 全书概括
- **状态：** active
- **代码：** `src/reading/digest.ts`（`buildBookDigest`）；`src/api/index.ts`（`toolDigest`）；`src/agent/tools.ts`（`reader_digest`）；`src/agent/workspace-prompt.ts`（`READING_PROMPT`）
- **测试：** `tests/digest.test.ts`；`tests/tools.test.ts`

## 行为

用户明确要求全书概括或通读全书时，Agent 调用 `reader_digest`，不逐章循环 `reader_read`。工具把每章正文归一化，按总字数预算和单章预算选取关键句；短书在预算内返回全文，长书返回抽取式摘录。

返回值包含 `chapters`（章节 id、标题、原字数、摘录、是否截断）、`totalChars`、`returnedChars`、`truncated`、`coverage`（`full` 或 `extractive`）以及一句说明。默认总预算 12000 字、单章 600 字，上限分别为 30000 与 2000。阅读纪律明确要求回答时说明这是抽取式概括，不能声称逐字读完；需要细节时再读取指定章节。

## 接口与代码映射

| 入口/符号 | 位置 | 职责 |
|---|---|---|
| `buildBookDigest` | `src/reading/digest.ts:buildBookDigest` | 按预算生成每章摘录与覆盖信息 |
| `toolDigest` | `src/api/index.ts:toolDigest` | 解析书籍并返回工具结果 |
| `reader_digest` | `src/agent/tools.ts:registerTools` | 暴露给模型的工具定义 |
| `READING_PROMPT` | `src/agent/workspace-prompt.ts:READING_PROMPT` | 全书请求的阅读纪律 |

## 约束与失败行为

摘录是抽取式，不是语义总结，也不保证覆盖每段情节；`truncated` 为 true 时必须告知覆盖不完整。目录不返回完整全文；需要引用原文时用 `reader_read` 校验。空章节返回空摘录。总预算与单章预算会被夹取；短书返回全文，长书按章节数分摊预算。此工具不写笔记、不改阅读进度。

## 验收与测试

- 正常路径：预算足够时返回全文，`coverage` 为 `full`，`returnedChars` 等于总字数（`digest_returns_full_text_for_small_books`）。
- 正常路径：长章节摘录包含首尾句，总返回量与单章摘录不超过预算，`coverage` 为 `extractive`（`digest_budgets_long_chapters_and_keeps_first_and_last`）。
- 边界：空章节与非法预算可处理，不抛错（`digest_handles_empty_and_oversized_inputs`）。
