# 伴读对话标题

- **ID：** FTR-036
- **名称：** 伴读对话标题
- **状态：** active
- **代码：** `src/client/session-title.ts`（`companionSessionTitle`、`renameCompanionSession`）；`src/client/hooks/use-companion.ts`（`useCompanion`）；`src/client/plugin.ts`（`ReaderPanel`）
- **测试：** `tests/session-title.test.ts`

## 行为

每本有伴读会话的书，其 DSH 会话标题统一为：

```text
《书名》· 伴读
```

书名取书库中的标题并去掉首尾空白；没有标题时使用“未命名书籍”。创建新会话时立即改名，已有映射在阅读器挂载或打开时改名；插件加载后也会遍历 `sessions` 映射补一次。

标题写入通过 DSH Session controller 的 `rename`，与工作区手动重命名走同一路径，因此会固定标题，避免被首条消息的自动标题覆盖。改名失败不阻塞阅读、伴读或跳转。

## 接口与代码映射

| 入口/符号 | 位置 | 职责 |
|---|---|---|
| `companionSessionTitle` | `src/client/session-title.ts:companionSessionTitle` | 生成统一的伴读标题 |
| `renameCompanionSession` | `src/client/session-title.ts:renameCompanionSession` | 通过 Session controller 改名 |
| `useCompanion` | `src/client/hooks/use-companion.ts:useCompanion` | 新建/绑定会话时改标题 |
| `ReaderPanel` | `src/client/plugin.ts:ReaderPanel` | 加载映射后补齐已有会话标题 |

## 约束与失败行为

只改 `sessions` 映射中确实关联书籍的会话，不改普通对话。标题使用书名，不包含作者或章节；同一本书的多个会话标题相同。改名失败静默忽略，不弹出错误，也不阻止后续操作。用户手动改成其它标题后，下一次插件加载或重新绑定会再次统一为本书格式。标题只会被固定，不会被自动标题生成覆盖。

## 验收与测试

- 正常路径：书名生成 `《书名》· 伴读`，空白书名回退“未命名书籍”（`companion_session_title_is_stable_and_identifies_book`）。
- 正常路径：同步只改有书籍映射的会话，未知 bookId 跳过（`sync_companion_session_titles_renames_linked_sessions`）。
