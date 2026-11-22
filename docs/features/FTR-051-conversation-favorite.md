# 对话收藏

- **ID：** FTR-051
- **名称：** 对话收藏
- **状态：** active
- **代码：** `src/host/modules/notes/favorite.ts`（`findFavoriteTurn`、`renderFavoriteNote`、`createFavoriteHandler`）；`src/host/modules/notes/service.ts`（`favoriteConversation`）；`src/host/api.ts`（`favoriteConversation`）；`src/shared/contracts/notes.ts`（`NOTES_ENDPOINTS.favoriteConversation`）；`src/client/modules/companion/ConversationFavorite.ts`（`ConversationFavorite`）；`src/client/modules/companion/register-conversation-favorite.ts`（`registerConversationFavorite`）；`src/client/plugin.ts`（`apply`）；`src/client/modules/notes/LongNotesView.ts`（`LongNotes`）
- **测试：** `tests/conversation-favorite.test.ts`

## 行为

伴读会话里每条已完成的助手回答，动作行多一个“收藏”按钮。按钮只在当前 DSH 会话已经绑定到一本书时出现；其他会话不显示。

点击后，Host 通过 `sessionQuery.readSession` 读取该会话的完整事件日志，按 `messageId` 定位这条助手消息，并回溯同一 turn 的用户消息，拼成一篇**主题长笔记**。笔记标题为 `对话收藏 YYYY-MM-DD HH-mm`，正文先写来源引用，再写 `## 我的问题` 与 `## 伴读回答`；回答按原文 markdown 保存，不做改写。

笔记直接写入书库 `notes/`，不经过草稿确认。创建后如果这本书的笔记上下文开关开启，会立即重建上下文；之后它和普通长笔记一样出现在“长笔记”页，可编辑、看历史、导出、删除。它也会参与“让伴读知道本书笔记”的注入，受现有单篇 4000 字、总预算 24000 字的限制。

收藏不修改会话、不新建会话、不触发模型调用；每次点击都会新建一篇笔记，不做去重。按钮在本次页面内保存成功后变为“已收藏”，刷新后重新可点。

## 接口与代码映射

| 入口/符号 | 位置 | 职责 |
|---|---|---|
| `findFavoriteTurn` | `src/host/modules/notes/favorite.ts:findFavoriteTurn` | 从会话事件中配对助手回答与同轮用户输入 |
| `renderFavoriteNote` | `src/host/modules/notes/favorite.ts:renderFavoriteNote` | 生成标题与带来源、问答的 markdown 正文 |
| `createFavoriteHandler` | `src/host/modules/notes/favorite.ts:createFavoriteHandler` | 校验 ID、解析书籍、读取会话、落盘长笔记 |
| `favoriteConversation` | `src/host/api.ts:favoriteConversation` | RPC 门面 |
| `ConversationFavorite` | `src/client/modules/companion/ConversationFavorite.ts:ConversationFavorite` | 动作行按钮、会话归属检查与保存状态 |
| `registerConversationFavorite` | `src/client/modules/companion/register-conversation-favorite.ts:registerConversationFavorite` | 注册 `conversation.chat.assistant-actions` |
| `LongNotes` | `src/client/modules/notes/LongNotesView.ts:LongNotes` | 复用长笔记列表与预览 |

## 约束与失败行为

- 会话未绑定书籍：`not-reading-session`；按钮隐藏。
- 消息已不在会话日志：`message-not-found`；回答没有文本块：`favorite-empty`。
- 会话已不存在：`session-not-found`。
- Host 缺少 `sessionQuery`：`favorite-unavailable`。
- 书库未配置或笔记写入失败：沿用 `no-library`、`note-conflict` 等长笔记错误码。
- 正文只取 `text` 块；图片、文件、工具调用和推理不进入笔记。用户消息只取 `source.kind === 'user'` 的记录。
- 标题只用于文件名与列表，不截断正文；文件名由现有 `sanitizeTitle`/`uniqueFileName` 处理。

## 验收与测试

- 正常路径：同轮问题与回答被正确配对，时间取助手消息时间（`conversation_favorite_pairs_question_and_answer`）。
- 边界：未知消息、空回答分别报 `message-not-found`、`favorite-empty`（`conversation_favorite_rejects_missing_message`、`conversation_favorite_rejects_empty_answer`）。
- 正常路径：标题、来源、问题、回答进入正文（`conversation_favorite_renders_topic_note`）。
- 正常路径：Handler 以 `topic` 创建长笔记并刷新上下文（`conversation_favorite_handler_creates_long_note`）。
- 失败路径：非书籍会话拒绝收藏（`conversation_favorite_requires_reading_session`）。
