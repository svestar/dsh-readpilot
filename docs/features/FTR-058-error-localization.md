# 错误消息本地化

- **ID：** FTR-058
- **名称：** 错误消息本地化
- **状态：** active
- **代码：** `src/client/lib/helpers.ts`（`messageOf`）；`src/client/lib/rpc.ts`（`createRpc`、`codedError`）；`src/client/locale/errors.ts`（`zhErrors`、`enErrors`）；`src/client/locale/zh.ts`、`src/client/locale/en.ts`（合并错误字典）
- **测试：** `tests/client-rpc.test.ts`

## 行为

Host 的用户可见错误通过 RPC 响应的 `error.code` 暴露稳定错误码；客户端不按中文 message 匹配。`messageOf(error, t)` 优先把 `error.<code>` 交给当前 UI 的翻译函数，命中时显示当前语言文案；没有翻译或没有 code 时回退到原始 message。错误码覆盖阅读、书库、笔记、记忆、提示词、翻译、备份、工作区和会话收藏等域。

客户端自身错误也带 code：连接服务不可用为 `client-offline`，连接失败为 `client-connect-failed`，无效响应为 `client-invalid-response`，请求失败为 `client-request-failed`，状态为空为 `client-invalid-state`，空导出为 `export-empty`。这些 code 与 Host code 走同一个 `messageOf` 映射。

映射使用**当前 UI 语言**，不使用工作区语言：英文 UI 打开中文工作区时，界面错误是英文；Agent 上下文和其他工作区生成内容仍按工作区语言。未知 code 保留 Host message，避免吞掉未登记的错误细节。

## 接口与代码映射

| 入口/符号 | 位置 | 职责 |
|---|---|---|
| `messageOf` | `src/client/lib/helpers.ts:messageOf` | 按 code 选择当前 UI 文案，失败回退原始 message |
| `createRpc` | `src/client/lib/rpc.ts:createRpc` | 保留 Host code；给客户端连接/响应错误补 code |
| `zhErrors` / `enErrors` | `src/client/locale/errors.ts:zhErrors`；`enErrors` | 稳定错误码的中英文文案 |
| `zh` / `en` | `src/client/locale/zh.ts:zh`；`en` | 把错误字典合并进插件文案 |

## 约束与失败行为

错误码是跨端契约，新增 Host 错误必须使用 `ReaderError`/`PluginError`（或带 `code` 的既有错误类），不能依赖 message。客户端映射是通用的，不改变 RPC envelope、HTTP 状态或 Host 的兼容性。`messageOf` 没有 `t` 时保持旧行为，供会话恢复等按文本判断的调用使用；资源打开失败仍返回原始 message。

已映射的 code 使用不带动态值的简短文案（例如不显示书籍 ID、字符上限或 HTTP 状态），避免把 Host 的中文参数格式带进英文 UI；需要精确细节的调用方仍可读取原始 message。中英字典必须保持相同 key 集合。

## 验收与测试

- 正常路径：RPC 失败保留 Host `code`，并可由当前 UI 翻译（`client_rpc_unwraps_the_envelope_and_keeps_error_codes`、`client_error_message_uses_the_current_ui_language`）。
- 边界：未知 code/无 code 回退原始 message（`client_error_message_uses_the_current_ui_language`）。
- 一致性：中英错误字典 key 集合一致，且都以 `error.` 开头（`client_error_dictionaries_cover_the_same_codes`）。
