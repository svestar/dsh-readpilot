# 笔记上下文

- **ID：** FTR-021
- **名称：** 笔记上下文
- **状态：** active
- **代码：** `src/notes-context.ts`（`buildReadingNotes`）；`src/companion-settings.ts`（`loadCompanionSettings`、`saveCompanionSettings`）；`src/api.ts`（`setNoteContext`、`notesContextFor`、`rebuildNotesContext`）；`index.ts`（`apply`）；`src/client/plugin.ts`（`ReaderPanel`）；`src/client/views/long-notes.ts`（`LongNotes`）
- **测试：** `tests/notes-context.test.ts`；`tests/api.test.ts`

## 行为

右栏“长笔记”顶部有按书的开关“让伴读知道本书笔记”，默认关闭；状态保存在 `$DSH_HOME/dsh-readpilot/companion.json` 的 `notes[bookId]`。开关打开时，Host 读取该书全部长笔记与有批注的划线，生成 `<reading_notes>` 文本并缓存；`systemPrompt.context` 的笔记条目只向当前阅读该书卷的伴读会话注入，关闭时返回空字符串。注入总量上限约 24k 字符，单篇长笔记 4k，批注合计 4k；超出的单篇截断并写明 `notes/...` 路径，未注入的笔记列在“未注入的笔记”下。开关、长笔记增删改、短笔记增删改和打开书籍都会重建缓存；开关状态在下次打开阅读器时从设置恢复。

## 接口与代码映射

| 入口/符号 | 位置 | 职责 |
|---|---|---|
| `buildReadingNotes` | `src/notes-context.ts:buildReadingNotes` | 按预算拼装笔记、批注与未注入路径 |
| `loadCompanionSettings` / `saveCompanionSettings` | `src/companion-settings.ts:loadCompanionSettings`；`src/companion-settings.ts:saveCompanionSettings` | 读取/保存按书的笔记开关 |
| `setNoteContext` | `src/api.ts:setNoteContext` | 切换开关并重建该书的上下文 |
| `notesContextFor` | `src/api.ts:notesContextFor` | 按会话取缓存的 `<reading_notes>` 文本 |
| `rebuildNotesContext` | `src/api.ts:rebuildNotesContext` | 读取长笔记与批注、构建并缓存 |
| `apply` | `index.ts:apply` | 注册笔记动态上下文 |
| `LongNotes` / `ReaderPanel` | `src/client/views/long-notes.ts:LongNotes`；`src/client/plugin.ts:ReaderPanel` | 开关 UI 与快照更新 |

## 约束与失败行为

只有 `setCompanionContext` 记录过书籍的会话才会命中；其他会话、未开启的书或没有笔记的书返回空字符串。`companion.json` 损坏时按空设置读取。缓存按书保存，最多 50 本；重建失败时缓存为空，不影响笔记文件。外部编辑器直接改笔记不会自动进入缓存，打开书或再次切换开关时刷新。关闭开关只停止自动注入，不禁止伴读用文件工具读取笔记。上下文是持久 user-role 快照，章节或开关变化在下一轮生效；记忆尚未加入。划线/批注的改动只有带非空批注的划线会进入上下文，裸划线不注入。

## 验收与测试

- 正常路径：长笔记与有批注的划线被拼进 `<reading_notes>`，包含书名、标题、正文与批注（`notes_context_builds_notes_and_highlights`）。
- 边界：单篇超长时截断、总量超限时省略并列出未注入路径（`notes_context_truncates_and_lists_paths`）。
- 边界：没有笔记和批注时返回空字符串（`notes_context_empty_returns_empty`）。
