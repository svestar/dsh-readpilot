# 笔记上下文

- **ID：** FTR-021
- **名称：** 笔记上下文
- **状态：** active
- **代码：** `src/host/modules/notes/context.ts`（`buildReadingNotes`）；`src/host/modules/companion/settings-store.ts`（`loadCompanionSettings`、`saveCompanionSettings`）；`src/shared/contracts/companion.ts`（`effectiveNotesEnabled`）；`src/host/api.ts`（`setNoteContext`、`setNoteContextState`、`setNotesGlobal`、`notesContextFor`）；`src/host/modules/notes/context-service.ts`（`rebuildNotesContext`、`setNoteContextState`、`setNotesGlobal`）；`index.ts`（`apply`）；`src/client/modules/reader/use-reader-composer.ts`（`useReaderComposer`）；`src/client/modules/notes/LongNotesView.ts`（`LongNotes`）
- **测试：** `tests/notes-context.test.ts`；`tests/api-library.test.ts`；`tests/api-reading.test.ts`；`tests/api-notes.test.ts`；`tests/api-companion.test.ts`

## 行为

长笔记页有“让伴读知道本书笔记”卡片：“默认”关闭/开启，“本书”跟随/始终开启/始终关闭，并显示生效。默认关闭时全部停止；开启后跟随/始终开启生效，始终关闭退出。状态存 `$DSH_HOME/dsh-readpilot/companion.json` 的 `notes[bookId]`/`notesGlobal`：无值为跟随，true/false 为始终开/关。有效开启时，Host 读取全部长笔记与有正文的批注，按工作区语言生成 `<reading_notes>` 并缓存；只注入当前阅读该书卷的会话，关闭时返回空串。总量约 24k，单篇 4k，批注 4k；超出截断并写明 `notes/...` 路径，未注入项列在“未注入”下。开关、笔记变更和打开书都会重建缓存；开关在下次打开时恢复。

## 接口与代码映射

| 入口/符号 | 位置 | 职责 |
|---|---|---|
| `buildReadingNotes` | `src/host/modules/notes/context.ts:buildReadingNotes` | 按预算拼装笔记、批注与未注入路径 |
| `loadCompanionSettings` / `saveCompanionSettings` | `src/host/modules/companion/settings-store.ts:loadCompanionSettings`；`src/host/modules/companion/settings-store.ts:saveCompanionSettings` | 读取/保存按书的笔记开关 |
| `setNoteContext` | `src/host/api.ts:setNoteContext` | 切换开关并重建该书的上下文 |
| `setNoteContextState` | `src/host/api.ts:setNoteContextState` | 按书设置跟随/开/关并返回生效值 |
| `setNotesGlobal` | `src/host/api.ts:setNotesGlobal` | 切换全局笔记开关并刷新活动会话 |
| `effectiveNotesEnabled` | `src/shared/contracts/companion.ts:effectiveNotesEnabled` | 全局或按书开关的有效值 |
| `notesContextFor` | `src/host/api.ts:notesContextFor` | 按会话取缓存的 `<reading_notes>` 文本 |
| `rebuildNotesContext` | `src/host/modules/notes/context-service.ts:rebuildNotesContext` | 读取长笔记与批注、构建并缓存 |
| `apply` | `index.ts:apply` | 注册笔记动态上下文 |
| `LongNotes` / `useReaderComposer` | `src/client/modules/notes/LongNotesView.ts:LongNotes`；`src/client/modules/reader/use-reader-composer.ts:useReaderComposer` | 开关 UI 与快照更新 |

## 约束与失败行为

只有 `setCompanionContext` 记录过书籍的会话才命中；其他会话、全局关闭、始终关闭或无笔记的书返回空字符串。全局关闭优先，按书 true 在全局关闭时不注入；全局关闭会清空笔记缓存。`companion.json` 损坏时按空设置读取。缓存按书保存，最多 50 本；重建失败时缓存为空，不影响笔记文件。外部编辑器改笔记不会自动进缓存，打开书或切换开关时刷新。关闭开关只停止自动注入，不禁止伴读用文件工具读取笔记。上下文是持久 user-role 快照，章节或开关变化下一轮生效；记忆未加入。划线/批注的改动只有带非空批注的划线会进入上下文，裸划线不注入。

## 验收与测试

- 正常路径：长笔记与有正文的批注被拼进 `<reading_notes>`，包含书名、标题、正文与批注（`notes_context_builds_notes_and_highlights`）。
- 正常路径：上下文按工作区语言生成（`notes_context_uses_workspace_language`）。
- 正常路径：全局开关打开后活动会话的笔记上下文可用，关闭后又恢复空（`notes_context_global_toggle`）。
- 边界：单篇超长时截断、总量超限时省略并列出未注入路径（`notes_context_truncates_and_lists_paths`）。
- 边界：没有笔记和批注时返回空字符串（`notes_context_empty_returns_empty`）。
- 正常路径：默认开关为开时跟随/始终开启生效，始终关闭退出；默认为关时始终开启也不注入（`notes_context_book_state_inherit`）。
