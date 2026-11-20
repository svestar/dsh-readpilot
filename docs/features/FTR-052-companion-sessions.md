# 伴读对话切换

- **ID：** FTR-052
- **名称：** 伴读对话切换
- **状态：** active
- **代码：** `src/shared/contracts/companion.ts`（`CompanionSessionSummary`、`CompanionSessionList`）；`src/host/modules/companion/service.ts`（`setCompanionSession`）；`src/host/modules/companion/session-list.ts`（`createCompanionSessionList`、`listCompanionSessions`）；`src/host/modules/companion/handlers.ts`（`createCompanionHandlers`）；`src/host/api.ts`（`companionSessions`）；`src/client/modules/companion/use-companion.ts`（`useCompanion`）；`src/client/modules/companion/use-companion-sessions.ts`（`useCompanionSessions`、`createConversation`、`selectConversation`）；`src/client/modules/companion/CompanionSessions.ts`（`CompanionSessions`）；`src/client/modules/reader/ReaderBookView.ts`（`ReaderBookView`）
- **测试：** `tests/companion-sessions.test.ts`；`tests/session-title.test.ts`

## 行为

阅读器“对话”页签顶部显示当前伴读对话与“新对话”。当前标题来自会话列表；列表未就绪时先用 `《书名》· 伴读` 占位。点击标题打开选择弹窗：顶部可新建对话，下方列出当前书库工作区内的会话，显示标题、更新时间和绑定的书。

列表由 Host 的 `listCompanionSessions` 生成：用 `workspaceRegistry` 取当前书库工作区的 `sessionIds`，用 `sessionQuery.listSessions` 与 `readTitleSnapshots` 读取会话和时间；排除已归档、子智能体、没有标题的空白会话，按更新时间倒序，最多 50 条，并带出每篇当前绑定的书。`currentSessionId` 始终返回当前书的绑定，即使它不在列表中。

绑定旧对话会先校验 `sessionAlive`，再调用 `session` RPC 写入 `sessions.json`。同一会话只能属于一本书：绑定到新书时会删除其他书的映射并把被解绑的 bookId 返回给客户端；客户端据此清理本地快照。选择后释放旧引用、保留新会话、清空输入草稿；阅读位置上下文和只读策略由现有的 `use-reading-progress` 与 `bindSession` 重新应用。切换运行中的会话不会停止旧会话。

“新对话”通过 DSH Session controller 创建并立即绑定；不可用时回退 `uiWorkspace.connectWorkspace`。当前会话仍是空白时直接复用，避免堆积空会话；新会话命名为 `《书名》· 伴读`。旧对话保留原标题，不被自动改名。

## 接口与代码映射

| 入口/符号 | 位置 | 职责 |
|---|---|---|
| `CompanionSessionSummary` | `src/shared/contracts/companion.ts:CompanionSessionSummary` | 可选会话的标题、时间与绑定书 |
| `listCompanionSessions` | `src/host/modules/companion/session-list.ts:listCompanionSessions` | 过滤工作区会话并读取标题 |
| `setCompanionSession` | `src/host/modules/companion/service.ts:setCompanionSession` | 写入 1:1 绑定并返回被解绑的书 |
| `CompanionSessions` | `src/client/modules/companion/CompanionSessions.ts:CompanionSessions` | 会话条、选择弹窗与改绑确认 |
| `createConversation` / `selectConversation` | `src/client/modules/companion/use-companion-sessions.ts:useCompanionSessions` | 新建、绑定与刷新列表 |

## 约束与失败行为

列表读取失败或缺少 `sessionQuery` 时返回空列表，不阻塞阅读；当前绑定仍显示。没有标题的会话默认视为空白，只有当前绑定例外。绑定不存在的会话由 `retain` 失败返回错误，不写入映射；归档会话在列表中被排除，绑定前也会被 `sessionAlive` 拦住。改绑只移动映射，不复制消息历史；原书解绑后可以再选别的会话。新建失败或书库工作区缺失时在弹窗内显示错误；DSH 会话已创建但 Host 绑定失败时会留下一个空会话，不自动删除。列表最多 50 条，不提供搜索、归档或删除操作。

## 验收与测试

- 正常路径：列表只含工作区中未归档、非子智能体、有标题的会话，并带出绑定书，按更新时间倒序（`companion_sessions_lists_workspace_sessions`）。
- 正常路径：绑定到另一本书会解除旧书映射并返回被解绑的 bookId（`companion_session_bind_moves_previous_book`）。
- 正常路径：新会话标题为 `《书名》· 伴读`，空白书名回退“未命名书籍”（`companion_session_title_is_stable_and_identifies_book`）。
