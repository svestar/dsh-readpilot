# 笔记草稿

- **ID：** FTR-022
- **名称：** 笔记草稿
- **状态：** active
- **代码：** `src/note-drafts.ts`（`createNoteDraftStore`）；`src/api.ts`（`ensureNoteDraftStore`）；`src/api-note-files.ts`（`toolNoteFiles`）；`src/api-drafts.ts`（`createDraftHandlers`、`noteDrafts`、`noteDraftCreate`）；`src/tools.ts`（`reader_notes`）；`src/client/hooks/use-long-notes.ts`（`useLongNotes`）；`src/client/views/draft-notice.ts`（`DraftNotice`）；`src/client/views/long-notes.ts`（`LongNotes`）；`src/client/helpers.ts`（`diffLines`）
- **测试：** `tests/note-drafts.test.ts`；`tests/api.test.ts`

## 行为

伴读通过 `reader_notes` 工具查看/读取长笔记（`index`、`read`），或在用户明确要求时生成草稿（`create`、`write`、`append`）。草稿保存在 `$DSH_HOME/dsh-readpilot/drafts/<bookId>/<draftId>.json`，包含目标笔记、标题、基准正文、新正文和 `baseHash`；默认工具只返回草稿，不修改 `notes/` 文件。阅读面板打开时每 4 秒拉取草稿；伴读生成新草稿会自动弹出预览窗口，长笔记页也保留草稿卡片。窗口和卡片显示新增/删除行数、行级 diff（最多 80 行）和“应用 / 拒绝”。应用时 Host 用 `baseHash` 检查冲突，通过 `create`/`write` 落盘并写历史，成功后删除草稿；冲突时草稿保留，笔记不变。拒绝只删除草稿。应用后若“让伴读知道本书笔记”已开启，会重建笔记上下文。

长笔记页有全局开关“自动应用伴读笔记”，默认关闭。开启后 `noteDraftCreate` 在创建草稿后立即应用，工具结果 `applied=true`，不再弹窗要求确认；写入仍经过 `baseHash` 冲突检查并保留历史。自动应用失败时草稿保留，工具返回错误，弹窗仍会显示待确认草稿。开关状态存 `companion.json` 的 `autoApplyNotes`，对所有书生效。

`reader_notes` 的写操作只在用户明确要求时使用，提示词要求伴读生成草稿后提醒用户在笔记面板确认，不能声称已保存。伴读会话是只读的，通用文件工具不能直接写笔记；应用是唯一落盘路径，历史与恢复见 [FTR-025](FTR-025-note-history.md)。

## 接口与代码映射

| 入口/符号 | 位置 | 职责 |
|---|---|---|
| `createNoteDraftStore` | `src/note-drafts.ts:createNoteDraftStore` | 草稿的 list/create/apply/reject 与路径安全 |
| `noteDrafts` | `src/api-drafts.ts:noteDrafts` | UI 的 list/apply/reject RPC |
| `noteDraftCreate` | `src/api-drafts.ts:noteDraftCreate` | 工具创建草稿；自动应用开启时立即应用 |
| `setAutoApplyNotes` | `src/api.ts:setAutoApplyNotes` | 切换全局自动应用开关 |
| `toolNoteFiles` | `src/api-note-files.ts:toolNoteFiles` | 工具的 index/read |
| `reader_notes` | `src/tools.ts:reader_notes` | Agent 入口；写操作只出草稿 |
| `useLongNotes` / `LongNotes` | `src/client/hooks/use-long-notes.ts:useLongNotes`；`src/client/views/long-notes.ts:LongNotes` | 草稿轮询、应用/拒绝与 diff UI |
| `diffLines` | `src/client/helpers.ts:diffLines` | 基准/新正文的行级差异 |

## 约束与失败行为

标题最多 80 字符，正文最多 200000 字符；每本书最多列出 50 条草稿。`book` 必须是书库中的书；目标笔记不存在返回 `note-not-found`。应用时 `baseHash` 不一致返回 `note-conflict`，草稿保留；整书笔记重复创建返回 `note-exists`。草稿只写数据目录，不进入书库扫描；拒绝或应用后删除。用户不能在草稿卡片内编辑正文；需要修改时先拒绝再让伴读重新生成，或应用后用外部编辑器修改。自动应用只跳过确认，不跳过冲突检查；失败时草稿保留。草稿只覆盖长笔记，不处理划线/批注/书签；记忆仍是后续功能。

## 验收与测试

- 正常路径：追加草稿应用后正文包含新内容，草稿消失，拒绝的草稿不写文件（`note_draft_append_apply_and_reject`）。
- 正常路径：整书笔记（id `book`）可生成追加草稿并应用（`note_draft_append_book_note`）。
- 正常路径：开启自动应用后追加直接落盘，工具返回 applied（API 集成测试覆盖）。
- 正常路径：新建主题笔记草稿应用后生成文件（`note_draft_create_and_apply`）。
- 边界：基准笔记被改动后应用返回冲突，草稿保留且正文不被覆盖（`note_draft_conflict_keeps_draft`）。
