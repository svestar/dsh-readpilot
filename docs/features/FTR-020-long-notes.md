# 长笔记

- **ID：** FTR-020
- **名称：** 长笔记
- **状态：** active
- **代码：** `src/note-files.ts`；`src/api-note-files.ts`；`src/api.ts`；`src/library.ts`；`src/client/hooks/use-long-notes.ts`；`src/client/notes/long-notes.ts`；`src/client/common/modal.ts`；`src/client/note-resource.ts`
- **测试：** `tests/note-files.test.ts`；`tests/api.test.ts`；`tests/note-resource.test.ts`

## 行为

长笔记保存在书库工作区的可见目录 `<library>/notes/`。首次创建时写入 `.dsh-readpilot-notes` 标记；`scanLibrary` 只在标记存在时跳过名为 `notes` 的目录，避免把普通书目录误当成笔记。每本书一个子目录 `<书名 slug>-<bookId 前 8 位>`，目录内的 `.book.json` 记录 `bookId`；`book.md` 固定为整书笔记，其余 `.md` 都是主题笔记。笔记使用 front-matter 记录 `id/kind/title/bookId/created/updated`，不生成 `index.md`，索引由 Host 扫描目录与 front-matter 在内存构建。

右栏“长笔记”标签显示整书笔记按钮、新建主题笔记按钮、笔记列表；点开后弹出只读预览窗口，编辑通过“外部编辑器”打开文件。新建整书/主题笔记时先在面板输入标题，创建后立即打开外部编辑器。预览窗口提供刷新、历史、删除和返回列表。预览时通过 note 资源流每 2 秒刷新；无 `useResource` 时手动刷新。列表超过 30 条时窗口化。划线、批注、书签与短笔记仍走 FTR-008/FTR-018 的 JSON 存储，显示在“笔记”标签。伴读通过工具写入或应用长笔记后，列表在当前助手消息结束时立即刷新；打开伴读面板时每 4 秒静默比对列表与草稿，兜底外部改动。

## 接口与代码映射

| 入口/符号 | 位置 | 职责 |
|---|---|---|
| `createNoteFileStore` | `src/note-files.ts:createNoteFileStore` | 长笔记的 list/read/create/write/remove 与历史快照 |
| `parseFrontMatter` / `serializeNote` | `src/note-files.ts:parseFrontMatter`；`src/note-files.ts:serializeNote` | 读写 front-matter 与正文 |
| `handleNoteFiles` | `src/api-note-files.ts:handleNoteFiles` | `noteFiles` RPC 的 list/read/create/write/remove/history/restore 分发 |
| `openNoteFile` | `src/api.ts:openNoteFile` | 校验笔记路径并交给系统默认应用打开 |
| `scanLibrary` | `src/library.ts:scanLibrary` | 书库扫描跳过带 marker 的 `notes/` |
| `useLongNotes` | `src/client/hooks/use-long-notes.ts:useLongNotes` | 列表、编辑器、保存、冲突、删除、历史与外部打开状态 |
| `LongNotes` | `src/client/notes/long-notes.ts:LongNotes` | 长笔记标签的列表、编辑器、历史与导出区 |
| `parseNoteResource` / `buildNoteResource` | `src/client/note-resource.ts:parseNoteResource`；`src/client/note-resource.ts:buildNoteResource` | 活动笔记资源地址的生成与解析 |

## 约束与失败行为

没有书库路径时 `noteFiles` 返回 `no-library`。`bookId` 只允许 `[A-Za-z0-9_-]{1,64}`；标题最多 80 字符，正文最多 200000 字符；文件名中的路径分隔符与 Windows 保留名会被替换。所有写入都限制在书库 `notes/` 内；笔记记录的 `path` 相对书库根（形如 `notes/<bookDir>/<file>`），外部打开按书库根解析。`write` 的 `baseHash` 与当前文件不一致时返回 `note-conflict`，不覆盖；整书笔记重复创建返回 `note-exists`。每次覆盖前把旧内容写入 `.history/<noteId>/`，最多保留 10 份；删除只移除正式文件，历史保留。面板只读预览，不保存正文；用户在外部编辑器改文件后，伴读应用草稿时若 `baseHash` 不一致会返回 `note-conflict`。外部编辑器只打开 `notes/` 内已存在的当前笔记文件，未保存的编辑器修改不会先写入；打开失败返回 `open-failed`，不修改文件。长笔记默认不进入伴读上下文；开启“让伴读知道本书笔记”后由 [FTR-021](FTR-021-note-context.md) 注入。伴读的写操作不直接改文件，只生成 [FTR-022](FTR-022-note-drafts.md) 的待确认草稿；历史与恢复见 [FTR-025](FTR-025-note-history.md)，导出见 [FTR-024](FTR-024-note-export.md)。

## 验收与测试

- 正常路径：创建主题笔记后出现 marker、书籍目录与 front-matter 文件，列表返回标题、hash 与大小（`note_file_create_and_list`）。
- 正常路径：带 `baseHash` 保存成功并留下历史，旧 hash 再保存返回冲突（`note_file_write_conflict_and_history`）。
- 正常路径：整书笔记固定为 `book.md`，重复创建被拒绝，删除后列表为空（`note_file_book_note_and_remove`）。
- 边界：标题中的路径分隔符不会逃出书籍目录（`note_file_title_sanitized`）。
- 正常路径：活动笔记资源地址可往返书与笔记 id，其他协议/形状返回 null（`note_resource_roundtrips_book_and_note`）。
