# 笔记历史

- **ID：** FTR-025
- **名称：** 笔记历史
- **状态：** active
- **代码：** `src/notes/files.ts`（`listHistory`、`readHistory`、`restoreHistory`、`removeHistory`、`clearHistory`）；`src/api/note-files.ts`（`createNoteFileHandlers`、`handleNoteFiles`）；`src/client/hooks/use-long-notes.ts`（`useLongNotes`）；`src/client/notes/long-notes.ts`（`LongNotes`）
- **测试：** `tests/note-history.test.ts`；`tests/api.test.ts`

## 行为

每次覆盖长笔记前，`note-files` 把旧文件存入 `<bookDir>/.history/<noteId>/<timestamp>-<random>.md`，最多保留 10 份。只读预览弹窗提供“历史”按钮：打开后用历史列表替换正文区域，避免长文把入口压到滚动底部；列表显示时间与正文字符数，支持恢复、删除单条和清空本书该笔记的全部历史。恢复前先把当前内容写入历史，再把所选快照原子写回笔记文件；恢复后预览正文、标题与 `baseHash` 同步刷新，历史列表也重新加载。删除和清空只移除历史快照，不改当前笔记。恢复本身可再次撤销，因为恢复前的当前内容已经进入历史。

历史只覆盖长笔记文件，不覆盖短笔记、划线、书签、草稿或记忆；删除笔记后不暴露孤立历史。历史文件不参与书库扫描，也不是导出内容。

## 接口与代码映射

| 入口/符号 | 位置 | 职责 |
|---|---|---|
| `listHistory` | `src/notes/files.ts:listHistory` | 按时间倒序列出快照，最多 10 条 |
| `readHistory` | `src/notes/files.ts:readHistory` | 读取快照正文与原始内容 |
| `restoreHistory` | `src/notes/files.ts:restoreHistory` | 先快照当前，再原子恢复所选版本 |
| `removeHistory` / `clearHistory` | `src/notes/files.ts:removeHistory`；`src/notes/files.ts:clearHistory` | 删除单条或清空当前笔记历史 |
| `handleNoteFiles` | `src/api/note-files.ts:handleNoteFiles` | `history` / `restore` / `historyRemove` / `historyClear` RPC，恢复后重建笔记上下文 |
| `useLongNotes` | `src/client/hooks/use-long-notes.ts:useLongNotes` | 历史展开、加载、恢复与错误状态 |
| `LongNotes` | `src/client/notes/long-notes.ts:LongNotes` | 历史按钮、版本列表与恢复确认 |

## 约束与失败行为

历史 id 只接受 `<数字>-<十六进制>.md`，所有路径都限制在对应笔记的历史目录内。笔记不存在返回 `note-not-found`，快照不存在返回 `history-not-found`，非法 id 返回 `invalid-history`。恢复、删除和清空都是用户动作，不在后台自动执行；删除/清空只处理当前笔记的历史目录，不修改当前正文。历史保留数量由 `maxHistory` 控制，默认 10；列表超出上限时只返回最新条目。恢复写入的是快照原始字节，所以恢复后的 `updated` 也是快照时间；当前内容已先进入历史，不会丢失。

## 验收与测试

- 正常路径：连续写入后历史按时间倒序，读取旧正文，恢复后正文回到旧版本且当前版本进入历史（`note_history_list_read_restore`）。
- 边界：非法历史 id、缺失笔记与未知快照被拒绝，失败不改变文件（`note_history_rejects_invalid_id_and_missing_note`）。
- 边界：历史数量受 `maxHistory` 限制（`note_history_respects_max_history`）。
- 正常路径：可删除单条历史并清空当前笔记历史，当前正文不受影响（`note_history_remove_and_clear`）。
