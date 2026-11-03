# ADR-002：伴读面板采用会话事件折叠

- **状态：** superseded
- **日期：** 2026-11-02
- **范围：** FTR-005

## 背景

FTR-003 的选段提问会发送消息并切换到对话面板，阅读界面本身没有聊天框。用户希望阅读时能在同一界面看到伴读会话历史并直接输入。阅读器是 root-scoped 的 `main` 面板，拿不到 `useChat`；可选方案有嵌入原生 `conversation.content` Factory、把阅读器改成 `conversation.view`、或在面板内自行折叠会话事件。

## 决策

采用面板内折叠：阅读器右侧增加伴读栏，用 `ctx.sessions.retain(sessionId)` 持有会话引用，订阅 `binding.eventSource`，只把 `user/message` 与 `assistant/message` 的文本块折成消息；发送复用 `binding.session.prompt`。选段工具条只预填输入框，不自动发送。宽屏为第三列，窄屏为可折叠抽屉。v1 不显示工具卡片、推理、附件与审批。

## 备选方案

- 嵌入 `conversation.content` Factory：能获得完整原生聊天，但 root 面板没有文档化的 Factory occurrence 渲染入口，失败风险高，放弃。
- 改成 `conversation.view`：可直接使用 `useChat` 与原生 composer，但会把阅读器从全局主面板变成会话视图，用户需要切换 View，改动面更大，暂不采用。
- iframe 或第二套聊天应用：失去主题与草稿联动，且需要重复鉴权，放弃。

## 后果

后续：本决策由 [ADR-009](ADR-009-native-companion.md) 取代；自绘折叠保留为 Conversation Factory 不可用时的降级路径。

收益：阅读与提问在同一面板完成，不离开书籍；只新增 Client 逻辑，不增加 Host 接口；选段不会误发送。

代价：聊天能力与原生 Chat 有差距，工具调用、推理、附件不可见；消息渲染依赖会话事件结构，DSH 升级后需要复核 `user/message` 与 `assistant/message` 的 data 形状；同一会话的完整记录仍应到 Chat 查看。

验证：`foldTranscript` 的单元测试覆盖文本折叠与非文本跳过；手工确认发送、刷新后历史、会话删除重建、窄屏抽屉与选段预填。
