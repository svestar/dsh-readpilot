# 笔记草稿

- **ID：** FTR-022
- **名称：** 笔记草稿
- **状态：** active
- **代码：** `src/note-drafts.ts`（`createNoteDraftStore`）；`src/api.ts`（`noteDrafts`、`noteDraftCreate`、`toolNoteFiles`）；`src/tools.ts`（`reader_notes`）；`src/client/hooks/use-long-notes.ts`（`useLongNotes`）；`src/client/views/long-notes.ts`（`LongNotes`）；`src/client/helpers.ts`（`diffLines`）
- **测试：** `tests/note-drafts.test.ts`；`tests/api.test.ts`

## 行为

伴读通过 `reader_notes` 工具查看/读取长笔记（`index`、`read`），或在用户明确要求时生成草稿（`create`、`write`、`append`）。草稿保存在 `$DSH_HOME/dsh-reader/drafts/<bookId>/<draftId>.json`，包含目标笔记、标题、基准正文、新正文和 `baseHash`；工具只返回草稿，不修改 `notes/` 文件。笔记标签在激活时每 4 秒拉取一次草稿；每张草稿显示新增/删除行数、行级 diff（最多 80 行）和“应用 / 拒绝”。应用时 Host 用 `baseHash` 检查冲突，通过 `create`/`write` 落盘并写历史，成功后删除草稿；冲突时草稿保留，笔记不变。拒绝只删除草稿。应用后若“让伴读知道本书笔记”已开启，会重建笔记上下文。

`reader_notes` 的写操作只在用户明确要求时使用，提示词要求伴读生成草稿后提醒用户在笔记面板确认，不能声称已保存。伴读会话是只读的，通用文件工具不能直接写笔记；应用是唯一落盘路径。

## 接口与代码映射

| 入口/符号 | 位置 | 职责 |
|---|---|---|
| `createNoteDraftStore` | `src/note-drafts.ts:createNoteDraftStore` | 草稿的 list/create/apply/reject 与路径安全 |
| `noteDrafts` | `src/api.ts:noteDrafts` | UI 的 list/apply/reject RPC |
| `noteDraftCreate` | `src/api.ts:noteDraftCreate` | 工具创建草稿 |
| `toolNoteFiles` | `src/api.ts:toolNoteFiles` | 工具的 index/read |
| `reader_notes` | `src/tools.ts:reader_notes` | Agent 入口；写操作只出草稿 |
| `useLongNotes` / `LongNotes` | `src/client/hooks/use-long-notes.ts:useLongNotes`；`src/client/views/long-notes.ts:LongNotes` | 草稿轮询、应用/拒绝与 diff UI |
| `diffLines` | `src/client/helpers.ts:diffLines` | 基准/新正文的行级差异 |

## 约束与失败行为

标题最多 80 字符，正文最多 200000 字符；每本书最多列出 50 条草稿。`book` 必须是书库中的书；目标笔记不存在返回 `note-not-found`。应用时 `baseHash` 不一致返回 `note-conflict`，草稿保留；整书笔记重复创建返回 `note-exists`。草稿只写数据目录，不进入书库扫描；拒绝或应用后删除。用户不能在草稿卡片内编辑正文；需要修改时先拒绝再让伴读重新生成，或应用后在笔记编辑器修改。草稿只覆盖长笔记，不处理划线/批注/书签；记忆仍是后续功能。

## 验收与测试

- 正常路径：追加草稿应用后正文包含新内容，草稿消失，拒绝的草稿不写文件（`note_draft_append_apply_and_reject`）。
- 正常路径：新建主题笔记草稿应用后生成文件（`note_draft_create_and_apply`）。
- 边界：基准笔记被改动后应用返回冲突，草稿保留且正文不被覆盖（`note_draft_conflict_keeps_draft`）。
