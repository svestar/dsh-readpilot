# 伴读面板

- **ID：** FTR-005
- **名称：** 伴读面板
- **状态：** active
- **代码：** `client.js`（`foldTranscript`、`ReaderPanel`）
- **测试：** `tests/client-chat.test.js`

## 行为

打开一本可读的书籍后，正文右侧出现“伴读”栏，默认显示该书伴读会话中已落定的用户消息与助手文本消息。用户在输入框中输入并发送，消息通过 `session.prompt` 进入同一会话，回答随会话事件更新；运行中显示“思考中…”，发送中显示“发送中…”。会话尚未创建时，首次发送在书库工作区中创建会话并保存映射。选中正文文字后，工具条的“解释 / 总结 / 翻译”只把书名、章节、引用原文和对应问题预填到输入框，不自动发送。窄屏下伴读栏变为覆盖在正文上的可折叠抽屉；宽屏下是第三列，可折叠。

## 接口与代码映射

| 入口/符号 | 位置 | 职责 |
|---|---|---|
| `foldTranscript` | `client.js:foldTranscript` | 从会话事件窗口折叠出用户/助手文本消息 |
| `ReaderPanel` | `client.js:ReaderPanel` | 持有会话引用、订阅事件、发送消息与渲染伴读栏 |

## 约束与失败行为

只显示 `user/message` 与 `assistant/message` 中的 `text` 块；工具卡片、推理、附件、审批、命令与图片不显示。历史默认显示最近 50 条，`hasMore` 时可加载更早。未配置书库工作区时输入框禁用并提示先创建书库。会话被删除时清除旧引用并重建一次；仍失败则保留输入内容并显示错误，用户可重试。发送使用 `queue` 模式，运行中仍可继续排队。会话事件来自 `ctx.sessions.retain(sessionId).binding.eventSource`，不新增 Host 接口。

## 验收与测试

- 正常路径：用户文本与助手文本被折叠为两条消息，助手内容中的工具块被跳过（`fold_transcript_keeps_text`）。
- 边界：工具结果、系统事件、纯工具消息和空白文本不产生消息（`fold_transcript_skips_non_text`）。
