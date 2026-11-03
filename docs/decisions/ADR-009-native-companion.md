# ADR-009：伴读嵌入原生会话

- **状态：** accepted
- **日期：** 2026-11-03
- **范围：** FTR-003、FTR-005

## 背景

伴读栏目前自行折叠会话事件，只显示用户与助手的文本块，工具卡、推理、审批、附件、模型选择与队列都不可见；ADR-002 因当时没有文档化的 Factory occurrence 入口而选择自绘。现在 DSH 的 `conversation.content` 是可嵌入的 Component Factory：渲染位置声明 session 子槽后，可用 `SessionProvider` 绑定指定会话，并以 `variant:'embedded'` 覆盖 `views` 固定 Chat，Composer、审批与队列随 Factory 一起出现；本机 DSH 的右侧栏子会话聊天与同类阅读插件都使用这一形态。阅读器必须继续是 `main` 面板（ADR-001），不能改成 `conversation.view`。

## 决策

1. 阅读器仍是 `main[key=dsh-reader]`。注册时声明一个 `session` 子槽；面板用 `SessionProvider` 绑定该书会话，子槽组件调用 `renderFactorySlot('conversation.content', { variant: 'embedded', phase, hero }, { slots: { views: FixedChatView } })`，`FixedChatView` 固定渲染 `conversation.session` 的 `chat` 视图。
2. 每书一个会话，懒创建，与 Chat 面板共享同一会话；不渲染原生会话 Header，由阅读器提供书名/章节标题栏，历史与标题操作在 Chat 面板完成。
3. Factory 缺失、注册失败或抛错时退回现有折叠（`foldTranscript` 与 `ChatBody`/`ChatCompose`），错误边界不白屏。
4. 伴读会话使用 `read-only` 沙箱：通用 `write`/`edit`/shell 不能改工作区，笔记与记忆只能由阅读器宿主工具落盘（见 ADR-012）。
5. 伴读栏宽度改为 360–640px，默认 420px；窄屏仍为抽屉。
6. ADR-002 由本记录取代；ADR-001 继续有效。

## 备选方案

- 改成 `conversation.view`：能拿 `useChat`/`useInput`，但阅读器变成会话 tab，与 Chat 互斥，失去同屏阅读。
- 继续自绘：改动最小，但工具、推理、审批、模型、附件与队列永远缺失，且长期维护两套聊天 UI。
- iframe 或第二套聊天应用：失去主题、草稿与会话绑定，放弃。

## 后果

收益：伴读获得完整原生能力；阅读器与 Chat 共享同一会话记录；删除自绘 Markdown 与大部分折叠状态。

代价：依赖 Factory 内部契约（子槽名、owner props、`views` 覆盖），DSH 升级可能漂移；嵌入形态没有会话 Header、历史操作与 View 标签；同一会话可同时出现在阅读器与 Chat，两个 Composer 共享草稿；原生 Composer 在 360px 以下会拥挤。

验证：子槽声明与 `SessionProvider` 可渲染；工具卡/推理/审批/队列/模型/停止可用；同会话双开一致；Factory 失败退回折叠；`read-only` 下通用写入被拒、宿主工具可写；`systemPrompt.context` 只对本书会话生效；360–640px、窄屏与 PDF/EPUB 同屏性能；记录 DSH 版本与 Factory 契约形状并加装配断言。
