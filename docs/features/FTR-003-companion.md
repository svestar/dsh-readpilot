# 伴读与检索

- **ID：** FTR-003
- **名称：** 伴读与检索
- **状态：** active
- **代码：** `src/api.ts`（`setCompanionSession`、`search`）
- **测试：** `tests/api.test.ts`

## 行为

每本书在 `$DSH_HOME/dsh-reader/sessions.json` 中保存一个伴读会话 id。阅读面板首次向某本书提问时，在该书库工作区创建会话并保存映射；已有映射时直接复用。会话被删除或失效时清除映射并重建一次。`search` 在指定书或全库中做字面量检索，返回书名、章节名、片段和 `bookId:chapterId:offset` 定位符。

## 接口与代码映射

| 入口/符号 | 位置 | 职责 |
|---|---|---|
| `setCompanionSession` | `src/api.ts:setCompanionSession` | 持久化或清除书籍与会话的映射 |
| `search` | `src/api.ts:search` | 返回带稳定定位符的检索结果 |

## 约束与失败行为

没有书库工作区时不能创建伴读会话，阅读面板会提示先创建书库。会话创建失败或映射失效时保留用户输入并显示错误，用户可重试。检索词至少 2 个字符，最多返回 50 条；全库检索最多解析 20 本书。定位符中的偏移是章节文本的字符偏移。面板内的消息展示与发送交互由 FTR-005 负责。

## 验收与测试

- 正常路径：写入会话映射后重新加载 API 仍能读到该映射，清除后映射消失（`session_mapping_persists`）。
- 正常路径：检索“再见”返回第二章的命中，定位符包含章节 id（`search_returns_locator`）。
