# 伴读与检索

- **ID：** FTR-003
- **名称：** 伴读与检索
- **状态：** active
- **代码：** `src/host/api.ts`（`setCompanionSession`、`sessionAlive`、`search`）
- **测试：** `tests/api-library.test.ts`；`tests/api-reading.test.ts`；`tests/api-notes.test.ts`；`tests/api-companion.test.ts`

## 行为

每本书在 `$DSH_HOME/dsh-readpilot/sessions.json` 中保存一个伴读会话 id。阅读面板首次向某本书提问时，在该书库工作区创建会话并保存映射；已有映射时直接复用。发送前通过 `sessionAlive` 检查会话是否已归档；已归档则清除映射、新建会话后再发送。归档会话的请求不会报错（DSH 的归档门禁直接拒绝该步骤），因此不能依赖发送后的异常来恢复。会话就绪后客户端调用 `companionPolicy`：Host 在 live Session 上检查 `sandboxPolicy.overrideOf`，必要时追加 `sandbox/mode: read-only`，同一会话只应用一次。`search` 在指定书或全库中做字面量检索，返回书名、章节名、片段和 `bookId:chapterId:offset` 定位符。

## 接口与代码映射

| 入口/符号 | 位置 | 职责 |
|---|---|---|
| `setCompanionSession` | `src/host/api.ts:setCompanionSession` | 持久化或清除书籍与会话的映射 |
| `sessionAlive` | `src/host/api.ts:sessionAlive` | 检查会话是否已被归档 |
| `setCompanionPolicy` | `src/host/api.ts:setCompanionPolicy` | 把伴读会话切到只读沙箱，已只读时跳过 |
| `search` | `src/host/modules/search/service.ts:createSearch` | 返回带稳定定位符的检索结果 |

## 约束与失败行为

没有书库工作区时不能创建伴读会话，阅读面板会提示先创建书库。会话创建失败或映射失效时保留用户输入并显示错误，用户可重试。只读策略只影响该会话的文件效果；笔记工具由 Host 直接写盘。会话不在 store 中或缺少 `append` 时返回 `mode: null`，客户端继续使用对话，不阻断。检索词至少 2 个字符，最多返回 50 条；全库检索最多解析 20 本书，并受 128MB 总字节与 3 秒解析预算限制，预算耗尽时 `truncated` 为 true 且 `booksScanned` 为实际尝试数；指定书检索不受预算限制。定位符中的偏移是章节文本的字符偏移。面板内的消息展示与发送交互由 FTR-005 负责。

## 验收与测试

- 正常路径：写入会话映射后重新加载 API 仍能读到该映射，清除后映射消失（`session_mapping_persists`）。
- 正常路径：首次调用追加 `sandbox/mode`，再次调用不重复追加，非 live 会话返回空模式（`companion_policy_sets_read_only_once`）。
- 正常路径：检索“再见”返回第二章的命中，定位符包含章节 id（`search_returns_locator`）。
- 边界：会话被归档后 `sessionAlive` 返回 `alive=false`，刷新状态时该映射被过滤（`archived_session_is_reported_and_filtered_from_state`）。
