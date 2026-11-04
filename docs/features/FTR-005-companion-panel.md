# 伴读面板

- **ID：** FTR-005
- **名称：** 伴读面板
- **状态：** active
- **代码：** `src/client/views/native-companion.ts`（`NativeCompanion`、`createNativeChatBoundary`）；`src/client/views/chat-panel.ts`（`ChatPanel`）；`src/client/hooks/use-companion.ts`（`useCompanion`）；`src/client/plugin.ts`（`ReaderPanel`、`createPlugin`）；`src/client/reader-screen.ts`（`currentReaderScreen`、`rememberReaderScreen`）；`src/client/helpers.ts`（`foldTranscript`、`clampChatWidth`、`parseMarkdownBlocks`）；`src/client/views/chat-content.ts`（`ChatBody`、`ChatCompose`）
- **测试：** `tests/client-chat.test.ts`；`tests/client-assembly.test.ts`

## 行为

打开一本可读的书籍后，正文右侧出现“伴读”栏。书籍已有伴读会话且宿主支持 Conversation Factory 时，面板用 `SessionProvider` 绑定该书会话，并渲染 `conversation.content` 的 embedded occurrence：原生正文、工具卡、推理、审批、队列、模型选择、附件与 Composer 一起出现，和 Chat 面板是同一个会话。面板顶部保留“伴读 / 笔记 / 长笔记 / 记忆”四个标签、关闭按钮与拖动分隔线；阅读器仍提供书名与章节标题。选中正文后的“问伴读”打开伴读标签，并把引用通过原生 `inputActions.setDraft` 写进 Composer，不自动发送；只写引用，不重复书名/章节（阅读上下文已由 FTR-017 注入）。具体解释、翻译或总结由用户输入。原生输入不可用时退回面板内的草稿输入框。还没有会话时，伴读面板打开且当前书有工作区，客户端先创建空白会话并绑定，原生 Composer 的模型与思考强度选择在首条消息发送前即可用；发送只提交首条消息。会话被删除或失效时清除映射并重建一次；仍失败则保留输入并显示错误。

## 接口与代码映射

| 入口/符号 | 位置 | 职责 |
|---|---|---|
| `NativeCompanion` | `src/client/views/native-companion.ts:NativeCompanion` | 在 SessionProvider 内渲染 embedded `conversation.content`，固定 Chat 视图 |
| `createNativeChatBoundary` | `src/client/views/native-companion.ts:createNativeChatBoundary` | 捕获 Factory 渲染失败并退回折叠聊天 |
| `ChatPanel` | `src/client/views/chat-panel.ts:ChatPanel` | 伴读/笔记/长笔记/记忆四个标签、原生聊天或折叠聊天、错误与输入区 |
| `useCompanion` | `src/client/hooks/use-companion.ts:useCompanion` | 会话绑定、折叠兜底、拖动调宽、就绪后应用只读策略 |
| `ReaderPanel` / `createPlugin` | `src/client/plugin.ts:ReaderPanel`；`src/client/plugin.ts:createPlugin` | 组装阅读器、声明 session 子槽、注册原生与折叠两条路径 |
| `askCompanion` | `src/client/plugin.ts:askCompanion` | 选中文字后预填引用并聚焦伴读输入框 |

## 约束与失败行为

`main` 面板注册声明 `dsh-readpilot.companion` 子槽，`scope` 为 `session`；父组件只有在拿到 `SessionProvider`、`renderSlot` 和会话引用时才渲染原生路径。Factory 不存在、注册失败或渲染抛错时，`createNativeChatBoundary` 退回现有折叠：只显示 `user/message` 与 `assistant/message` 的文本块，跳过工具、推理、附件与审批；助手 Markdown 仍按基础子集渲染。原生路径的 Composer 自己处理发送、停止、排队与模型；折叠路径继续使用 `session.prompt(..., 'queue')`。会话就绪后客户端调用 `companionPolicy`，Host 先查 `sandboxPolicy.overrideOf`，必要时追加 `sandbox/mode: read-only`；同一会话只追加一次。窄屏（≤1100px）伴读栏变为覆盖正文的抽屉；宽屏宽度 360–640px，默认 420px，按浏览器记住。没有书库工作区时输入禁用并提示先创建书库。原生会话头不出现，历史与标题操作仍在 Chat 面板。切换 DSH 页面后重新进入阅读面板时，会恢复上次的书与章节；只有主动回到书库或关闭书籍才显示书库。

## 验收与测试

- 正常路径：伴读子组件以 embedded 变体和固定 Chat 视图渲染 conversation.content（`native_companion_renders_embedded_conversation`）。
- 边界：缺少 Factory 时伴读子组件返回传入的 fallback，由外层退回折叠（`native_companion_falls_back_without_factory`）。
- 正常路径：折叠仍只保留真实用户输入与助手文本（`fold_transcript_keeps_text`、`fold_transcript_skips_non_text`、`fold_transcript_skips_context_messages`）。
- 边界：宽度夹取到 360–640px，非法值回退 420px（`clamp_chat_width_bounds`）。
- 正常路径：切换页面后重新挂载阅读面板，仍恢复上次的书/章节画面（`reader_screen_cache_remembers_last_screen`）。
