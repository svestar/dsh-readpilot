# 回答存为批注

- **ID：** FTR-031
- **名称：** 回答存为批注
- **状态：** active
- **代码：** `src/client/answer-note.ts`（`lastAssistantText`、`buildAnswerNote`）；`src/client/plugin.ts`（`ReaderPanel`、`saveAnswer`）；`src/client/views/chat-panel.ts`（`ChatPanel`）
- **测试：** `tests/answer-note.test.ts`

## 行为

伴读面板的聊天页头部提供“存为批注”。点击后把转录中最后一条非空伴读回答写成短笔记：引文取提问时选中的原文，正文为回答，锚点记录章节、块与字符偏移，因此能随笔记在原文中定位与高亮。保存成功后刷新笔记列表并在头部显示“已存为批注”；没有回答或没有选段锚点时按钮不可用，点击给出提示。保存失败显示错误原因，不写入半条笔记。

## 接口与代码映射

| 入口/符号 | 位置 | 职责 |
|---|---|---|
| `lastAssistantText` | `src/client/answer-note.ts:lastAssistantText` | 取转录中最后一条非空伴读回答 |
| `buildAnswerNote` | `src/client/answer-note.ts:buildAnswerNote` | 校验锚点与回答，生成短笔记载荷 |
| `saveAnswer` | `src/client/plugin.ts:saveAnswer` | 调用笔记接口写入并刷新列表 |
| `ChatPanel` | `src/client/views/chat-panel.ts:ChatPanel` | 头部按钮、禁用态与保存结果提示 |

## 约束与失败行为

锚点只在“问伴读”时记录；手动输入的问题不会新建锚点，会沿用上一次选段，因此保存前应确认按钮提示的是当前讨论的段落。回答取最后一次非空伴读消息：如果刚发出新问题、回答尚未产生，保存的仍是上一条回答。重复保存会新增多条短笔记，不做去重或覆盖；已存在的批注不受影响。写入走短笔记接口（`kind=note`），不经过长笔记草稿，也不触发自动应用。空引文、空回答、缺失章节时拒绝保存并提示；接口失败时显示错误，列表不变。

## 验收与测试

- 正常路径：取最后一条非空伴读回答，跳过用户消息与空回答（`last_assistant_answer_is_used`）。
- 边界：锚点或回答缺失时生成空载荷，非法块/偏移归零（`answer_note_payload_is_built`）。
