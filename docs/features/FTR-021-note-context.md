# 笔记上下文

- **ID：** FTR-021
- **名称：** 笔记上下文
- **状态：** active
- **代码：** `src/host/modules/notes/context.ts`（`buildReadingNotes`）；`src/host/modules/prompt/context-budget.ts`（`CONTEXT_BUDGET`）；`src/shared/contracts/companion.ts`（`effectiveNotesEnabled`）；`src/host/api.ts`（`setNoteContext`、`setNoteContextState`、`setNotesGlobal`、`notesContextFor`）；`src/host/modules/notes/context-service.ts`（`rebuildNotesContext`、`setNoteContextState`、`setNotesGlobal`）；`index.ts`（`apply`）；`src/client/modules/notes/LongNotesView.ts`（`LongNotes`）
- **测试：** `tests/notes-context.test.ts`；`tests/api-library.test.ts`；`tests/api-reading.test.ts`；`tests/api-notes.test.ts`；`tests/api-companion.test.ts`

## 行为

长笔记页有“让伴读知道本书笔记”卡片：“默认”关闭/开启，“本书”跟随/始终开启/始终关闭。状态存 `$DSH_HOME/dsh-readpilot/companion.json` 的 `notes[bookId]`/`notesGlobal`：无值为跟随，true/false 为始终开/关。有效开启时，Host 读取全部长笔记与有正文的批注，按工作区语言生成 `<reading_notes>` 并缓存；只注入当前阅读该书的会话；关闭返回空串。默认注入索引：标题、id、路径与字数，正文由 `reader_notes` 的 `read` 按需读取；有批注的划线仍注入引文与批注。预算由 `CONTEXT_BUDGET` 统一：索引 3k、完整模式 6k、批注 2k；超出省略并列出未注入项。开关、笔记变更和打开书都会重建缓存；开关在下次打开时恢复。

## 接口与代码映射

| 入口/符号 | 位置 | 职责 |
|---|---|---|
| `buildReadingNotes` | `src/host/modules/notes/context.ts:buildReadingNotes` | 按索引/完整模式与预算拼装笔记、批注 |
| `setNoteContext` | `src/host/api.ts:setNoteContext` | 切换开关并重建该书的上下文 |
| `setNoteContextState` | `src/host/api.ts:setNoteContextState` | 按书设置跟随/开/关并返回生效值 |
| `setNotesGlobal` | `src/host/api.ts:setNotesGlobal` | 切换全局笔记开关并刷新活动会话 |
| `effectiveNotesEnabled` | `src/shared/contracts/companion.ts:effectiveNotesEnabled` | 全局或按书开关的有效值 |
| `notesContextFor` | `src/host/api.ts:notesContextFor` | 按会话取缓存的 `<reading_notes>` 文本 |
| `rebuildNotesContext` | `src/host/modules/notes/context-service.ts:rebuildNotesContext` | 读取长笔记与批注、构建并缓存 |
| `apply` | `index.ts:apply` | 注册笔记动态上下文 |
| `LongNotes` | `src/client/modules/notes/LongNotesView.ts:LongNotes` | 笔记开关 UI |

## 约束与失败行为

只有 `setCompanionContext` 记录过书籍的会话才命中；其他会话、全局关闭、始终关闭或无笔记的书返回空字符串。全局关闭优先并清空缓存；`companion.json` 损坏按空设置读取。缓存按书最多 50 本；重建失败为空，不影响笔记文件。外部编辑不会自动进缓存，打开书或切换开关时刷新。关闭只停止自动注入，不禁止伴读用文件工具读取。上下文是持久 user-role 快照，章节或开关变化下一轮生效；裸划线不注入。

## 验收与测试

- 正常路径：长笔记与批注被拼进 `<reading_notes>`，含书名、标题、索引与批注（`notes_context_builds_notes_and_highlights`）。
- 正常路径：默认索引含 id/路径与划线，不含正文（`notes_context_index_prefers_ids_and_paths`）；共享预算为各块留出空间（`context_budget_leaves_room_for_all_blocks`）。
- 正常路径：上下文按工作区语言生成（`notes_context_uses_workspace_language`）。
- 正常路径：全局开关打开后活动会话的笔记上下文可用，关闭后又恢复空（`notes_context_global_toggle`）。
- 边界：完整模式下单篇超长时截断、总量超限时省略并列出未注入路径（`notes_context_truncates_and_lists_paths`）。
- 边界：没有笔记和批注时返回空字符串（`notes_context_empty_returns_empty`）。
- 正常路径：默认开关为开时跟随/始终开启生效，始终关闭退出；默认为关时始终开启也不注入（`notes_context_book_state_inherit`）。
