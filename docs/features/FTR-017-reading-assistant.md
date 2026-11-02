# 阅读助手

- **ID：** FTR-017
- **名称：** 阅读助手
- **状态：** active
- **代码：** `src/prompt.js`（`READING_PROMPT`、`installReadingPrompt`）；`src/api.js`（`toolContext`）；`src/tools.js`（`registerTools`）
- **测试：** `tests/prompt.test.js`

## 行为

插件向宿主系统提示词注册一段阅读助手纪律：用户说“这本书”时先调用 `reader_context`，引用必须逐字并说明章节/页，不剧透未读章节，工具没返回就明确说没找到，写笔记前先确认。新增只读工具 `reader_context`：不传书时返回最近阅读的书，传 `book` 时返回指定书的元数据、进度、前 60 条目录和最近 10 条笔记；没有最近阅读时返回明确错误。现有 `reader_books`、`reader_open`、`reader_read`、`reader_search`、`reader_note` 保持不变。

## 接口与代码映射

| 入口/符号 | 位置 | 职责 |
|---|---|---|
| `READING_PROMPT` | `src/prompt.js:READING_PROMPT` | 阅读助手纪律文本 |
| `installReadingPrompt` | `src/prompt.js:installReadingPrompt` | 可选注册 systemPrompt 段，缺服务时静默降级 |
| `toolContext` | `src/api.js:toolContext` | 当前书、进度、目录与最近笔记 |
| `reader_context` | `src/tools.js:reader_context` | Agent 只读入口 |

## 约束与失败行为

`systemPrompt` 是可选服务：只通过 `ctx.get` 读取并显式 try/catch，不写进 `inject`；缺失时阅读助手仍可用，只是没有附加提示词。提示词段 `order: 9000`、`interpolate: false`，避免与第一方段冲突和 `{{...}}` 插值失败。`reader_context` 不传书时按 `progress.updatedAt` 选择最近一本书；没有进度、书不存在或书无可提取正文时返回错误文本，不抛到宿主。目录与笔记各截断，避免一次注入整本书；写笔记仍需用户明确要求。

## 验收与测试

- 正常路径：提示词段按 name/order/text 注册，且不启用插值（`reading_prompt_section_registered`）。
- 边界：没有 `systemPrompt` 或读取服务抛错时静默降级（`reading_prompt_optional_service_does_not_throw`）。
