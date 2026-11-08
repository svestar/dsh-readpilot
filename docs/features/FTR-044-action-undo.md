# 动作回执与撤销

- **ID：** FTR-044
- **名称：** 动作回执与撤销
- **状态：** active
- **代码：** `src/reader-actions.ts`（`addReceipt`、`listReceipts`、`markUndone`、`ReaderUndo`）；`src/api.ts`（`readerReceipts`、`recordReaderReceipt`）；`src/tools.ts`（批注/长笔记/标签/状态回执）；`src/notes.ts`（`restore`）；`src/note-files.ts`（`restore`）；`src/client/hooks/use-action-receipts.ts`；`src/client/plugin.ts`（`ReaderPanel`）；`src/client/views/sidebar-reader.ts`（`SidebarReader`）
- **测试：** `tests/reader-actions.test.ts`；`tests/tools.test.ts`

## 行为

写类 Agent 动作在 Host 生成一条回执：新增/重写/删除批注、自动应用的长笔记写入、删除长笔记、修改标签、修改阅读状态。回执包含 `id`、类型、书名、摘要、创建时间、`undoable` 与撤销描述；导航类 `reader_goto`/`reader_open_panel` 不改变数据，不进入撤销历史。

客户端每秒读取当前书最近回执；发现新的可撤销回执时显示 Toast，附带“撤销”按钮。撤销按回执类型执行：

- 新增批注 → 删除该批注；
- 重写/删除批注 → 恢复操作前的完整记录（同一 noteId）；
- 自动应用的长笔记写入 → 恢复旧正文；新建长笔记 → 删除新文件；\n- 删除长笔记 → 用原 `fileName`、标题、正文与 id 恢复文件；
- 标签/状态 → 写回操作前的值。

撤销成功后排入 `notesRefresh` 或 `libraryRefresh`，阅读器/书库随即刷新；撤销本身不再生成新回执。Toast 8 秒后自动消失，每个回执只提示一次。

## 接口与代码映射

| 入口/符号 | 位置 | 职责 |
|---|---|---|
| `addReceipt` / `listReceipts` | `src/reader-actions.ts:addReceipt`；`src/reader-actions.ts:listReceipts` | 内存回执、TTL 10 分钟、最多 100 条 |
| `ReaderUndo` | `src/reader-actions.ts:ReaderUndo` | deleteNote/restoreNote/restoreNoteFile/deleteNoteFile/setTags/setStatus |
| `recordReaderReceipt` | `src/api.ts:recordReaderReceipt` | 工具写操作后记录回执 |
| `readerReceipts` | `src/api.ts:readerReceipts` | 客户端 `list` 与 `undo` |
| `NotesStore.restore` | `src/notes.ts:restore` | 按原 id 恢复批注记录 |
| `NoteFileStore.restore` | `src/note-files.ts:restore` | 按原文件名恢复长笔记 |
| `useActionReceipts` | `src/client/hooks/use-action-receipts.ts:useActionReceipts` | 轮询新回执、去重、Toast 撤销 |

## 约束与失败行为

回执只在 Host 内存中保留 10 分钟，Host 重启后丢失；已过期的回执撤销返回“回执不存在或已过期”。撤销是最后写入者胜出：如果用户在 Agent 动作后又手动改了同一记录，撤销会覆盖为动作前快照，因此只应在回执有效期内、明确点击时执行。长笔记恢复要求原文件未被其他笔记占用同名文件；冲突时撤销失败并保留现状。回执列表按书过滤，不会在另一本书的阅读器里弹出撤销提示。导航动作没有回执/撤销，因为不写数据；其他写动作除非能提供逆操作，否则不应新增为可撤销动作。

## 验收与测试

- 正常路径：回执写入、按书列出、标记已撤销（`reader_receipts_can_be_listed_and_marked_undone`）。
- 正常路径：批注删除后撤销恢复同一条记录，长笔记删除后撤销恢复原 id 文件（`tools_read_bounded`）。
