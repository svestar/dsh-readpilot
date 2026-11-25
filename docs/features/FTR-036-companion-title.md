# 伴读对话标题

- **ID：** FTR-036
- **名称：** 伴读对话标题
- **状态：** active
- **代码：** `src/client/modules/companion/session-title.ts`（`companionSessionTitle`、`renameCompanionSession`）；`src/client/modules/companion/use-companion.ts`（`useCompanion`）；`src/client/modules/companion/use-companion-sessions.ts`（`useCompanionSessions`）
- **测试：** `tests/session-title.test.ts`

## 行为

插件新建的伴读会话按工作区语言使用统一标题：

```text
中文：《书名》· 伴读
英文：Book Title · Companion
```

书名取书库中的标题并去掉首尾空白；中文无标题时用“未命名书籍”，英文用“Untitled book”。创建新会话并绑定后立即改名。已有绑定或用户手动绑定的旧对话保留原标题，不再由插件自动改名；用户可以在 DSH 侧栏重命名。标题写入通过 DSH Session controller 的 `rename`，与工作区手动重命名走同一路径，因此会固定标题，避免被首条消息的自动标题覆盖。改名失败不阻塞阅读、伴读或跳转。

## 接口与代码映射

| 入口/符号 | 位置 | 职责 |
|---|---|---|
| `companionSessionTitle` | `src/client/modules/companion/session-title.ts:companionSessionTitle` | 生成统一的伴读标题 |
| `renameCompanionSession` | `src/client/modules/companion/session-title.ts:renameCompanionSession` | 通过 Session controller 改名 |
| `useCompanion` | `src/client/modules/companion/use-companion.ts:useCompanion` | 新建会话时命名，切换时保留旧标题 |

## 约束与失败行为

只有插件新建并绑定的会话自动命名；已有绑定、旧对话和用户自定义标题不会被覆盖。标题只包含书名，不含作者或章节；同一本书新建的多个会话标题相同。改名失败静默忽略，不弹出错误，也不阻止后续操作。标题只会被固定，不会被自动标题生成覆盖。

## 验收与测试

- 正常路径：中文/英文书名分别生成对应标题，空白书名回退本地化占位（`companion_session_title_is_stable_and_identifies_book`）。
