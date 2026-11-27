# 笔记草稿

- **ID：** FTR-022
- **名称：** 笔记草稿
- **状态：** active
- **代码：** `src/host/modules/notes/drafts.ts`（`createNoteDraftStore`）；`src/host/modules/notes/note-file-handlers.ts`（`toolNoteFiles`）；`src/host/modules/notes/draft-handlers.ts`（`createDraftHandlers`、`noteDrafts`、`noteDraftCreate`）；`src/host/modules/notes/tools.ts`（`reader_notes`）；`src/client/modules/notes/use-long-notes.ts`（`useLongNotes`）；`src/client/modules/notes/apply-state.ts`（`nextActiveOnApply`）；`src/client/modules/notes/DraftNotice.ts`（`DraftNotice`）；`src/client/modules/notes/LongNotesView.ts`（`LongNotes`）；`src/host/api.ts`（`setAutoApplyNotes`）
- **测试：** `tests/note-drafts.test.ts`；`tests/prompt.test.ts`；`tests/note-apply-state.test.ts`；`tests/workspace-skills.test.ts`；`tests/api-library.test.ts`；`tests/api-reading.test.ts`；`tests/api-notes.test.ts`；`tests/api-companion.test.ts`

## 行为

伴读通过 `reader_notes` 工具查看/读取长笔记（`index`、`read`），或在用户明确要求时生成草稿（`create`、`write`、`append`）。草稿保存在 `$DSH_HOME/dsh-readpilot/drafts/<bookId>/<draftId>.json`，包含目标笔记、标题、基准正文、新正文与 `baseHash`；默认只返回草稿，不修改 `notes/` 文件。阅读面板每 4 秒拉取草稿；新草稿自动弹出预览，长笔记页保留草稿卡，显示行级 diff（最多 80 行）与“应用 / 拒绝”。应用时用 `baseHash` 检查冲突，经 `create`/`write` 落盘并写历史，成功后删草稿；冲突时草稿保留、笔记不变。拒绝只删草稿。应用只刷新草稿卡与列表，不自动打开预览；预览只在点击列表项时打开。

长笔记页有全局开关“自动应用伴读笔记”，默认关闭。开启后 `noteDraftCreate` 创建草稿后立即应用，工具结果 `applied=true`，不再弹窗；写入仍经过 `baseHash` 冲突检查并保留历史。失败时草稿保留、工具返回错误，弹窗仍显示草稿。开关存 `companion.json` 的 `autoApplyNotes`，对所有书生效。

`reader_notes` 只在用户明确要求时写；`body`/`text` 就是笔记正文，笔记技能禁止写“未保存”“待确认”等状态行，状态只在回复里说明，不能声称已保存。详细流程见 FTR-060 的 `dsh-readpilot-notes` 技能。伴读会话只读，通用文件工具不能写笔记；应用是唯一落盘路径，历史见 [FTR-025](FTR-025-note-history.md)。

## 接口与代码映射

| 入口/符号 | 位置 | 职责 |
|---|---|---|
| `createNoteDraftStore` | `src/host/modules/notes/drafts.ts:createNoteDraftStore` | 草稿的增删应用与路径安全 |
| `noteDrafts` | `src/host/modules/notes/draft-handlers.ts:noteDrafts` | UI 的 list/apply/reject |
| `noteDraftCreate` | `src/host/modules/notes/draft-handlers.ts:noteDraftCreate` | 工具创建草稿；自动应用开启时立即应用 |
| `toolNoteFiles` | `src/host/modules/notes/note-file-handlers.ts:toolNoteFiles` | 工具的 index/read |
| `reader_notes` | `src/host/modules/notes/tools.ts:reader_notes` | Agent 入口；写操作只出草稿 |
| `useLongNotes` / `LongNotes` | `src/client/modules/notes/use-long-notes.ts:useLongNotes`；`src/client/modules/notes/LongNotesView.ts:LongNotes` | 草稿轮询、应用/拒绝与 diff UI |

## 约束与失败行为

标题 ≤80 字符，正文 ≤200000 字符，每本书最多 50 条草稿。`book` 必须是书库中的书；目标笔记不存在返回 `note-not-found`。应用时 `baseHash` 不一致返回 `note-conflict`，草稿保留；整书笔记重复创建返回 `note-exists`。拒绝或应用后删除。草稿卡不能编辑正文；需改时先拒绝再重写，或应用后用外部编辑器改。自动应用只跳过确认，仍需冲突检查；失败保留草稿。

## 验收与测试

- 正常路径：追加草稿应用后正文包含新内容，草稿消失，拒绝的草稿不写文件（`note_draft_append_apply_and_reject`）。
- 正常路径：整书笔记（id `book`）可生成追加草稿并应用（`note_draft_append_book_note`）。
- 正常路径：新建主题笔记草稿应用后生成文件（`note_draft_create_and_apply`）。
- 边界：基准笔记被改动后应用返回冲突，草稿保留且正文不被覆盖（`note_draft_conflict_keeps_draft`）。
- 边界：笔记技能禁止把“未保存”等状态写进笔记正文（`workspace_skills_created_with_frontmatter`）。
- 边界：应用草稿不自动打开预览；只有已打开的同一篇笔记跟随更新（`note_apply_keeps_preview_closed`、`note_apply_syncs_open_preview`）。
