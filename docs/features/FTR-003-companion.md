# 伴读与检索

- **ID：** FTR-003
- **名称：** 伴读与检索
- **状态：** active
- **代码：** `src/api.js`（`setCompanionSession`、`search`）；`client.js`（`askCompanion`）
- **测试：** `tests/api.test.js`

## 行为

每本书在 `$DSH_HOME/dsh-reader/sessions.json` 中保存一个伴读会话 id。用户在阅读面板选中文字后点击“解释”“总结”或“翻译”，`askCompanion` 取当前书库的 `workspaceId`：没有会话时用 `uiWorkspace.connectWorkspace` 在该书库工作区创建会话并保存映射，已有会话时打开它；随后通过 `session.prompt` 发送包含书名、章节名、书籍 id、章节 id、引用原文和问题的消息，并切换到对话面板。会话失效时清除映射并重建一次。`search` 在指定书或全库中做字面量检索，返回书名、章节名、片段和 `bookId:chapterId:offset` 定位符。

## 接口与代码映射

| 入口/符号 | 位置 | 职责 |
|---|---|---|
| `setCompanionSession` | `src/api.js:setCompanionSession` | 持久化或清除书籍与会话的映射 |
| `search` | `src/api.js:search` | 返回带稳定定位符的检索结果 |
| `askCompanion` | `client.js:askCompanion` | 创建或复用会话并发送引用提问 |

## 约束与失败行为

没有书库工作区时 `askCompanion` 抛出错误并在面板内显示。会话创建失败、会话已删除或 `session.prompt` 返回失败时先清除旧映射，再创建一次新会话；仍失败则把错误显示在阅读面板。检索词至少 2 个字符，最多返回 50 条；全库检索最多解析 20 本书。定位符中的偏移是章节文本的字符偏移。

## 验收与测试

- 正常路径：写入会话映射后重新加载 API 仍能读到该映射，清除后映射消失（`session_mapping_persists`）。
- 正常路径：检索“再见”返回第二章的命中，定位符包含章节 id（`search_returns_locator`）。
