# Agent 阅读动作

- **ID：** FTR-043
- **名称：** Agent 阅读动作
- **状态：** active
- **代码：** `src/host/modules/actions/store.ts`（`createReaderActionStore`）；`src/host/api.ts`（`readerActions`、`pushReaderAction`）；`src/host/modules/actions/tools.ts`（`reader_goto`、`reader_mark`、`reader_open_panel`）；`src/host/modules/notes/tools.ts`（`reader_note`、`reader_notes`）；`src/host/modules/library/tools.ts`（`reader_tag`、`reader_status`）；`src/client/modules/reader/use-reader-actions.ts`（`useReaderActions`）；`src/client/modules/reader/ReaderPanelView.ts`（`ReaderPanelView`）；`src/client/modules/sidebar/SidebarReaderView.ts`（`SidebarReader`）
- **测试：** `tests/reader-actions.test.ts`；`tests/tools.test.ts`

## 行为

Agent 可通过七个工具改变阅读状态并收到回执：

- `reader_goto`：按 book + chapter/page/offset 跳转；当前书跳主阅读，其他书打开侧栏。
- `reader_open_panel`：打开阅读面板；路由规则同上。
- `reader_mark`：创建批注（空正文即划线），立即写入并排队刷新。
- `reader_note` 的 `update`/`delete`：按 noteId 重写或删除批注（书签也可删除）；写操作排队刷新。
- `reader_notes` 的 `delete`：删除长笔记文件；重写仍走 `write`/`append` 草稿，避免覆盖用户文稿。
- `reader_tag`：整体替换书籍标签，立即写入并刷新书库。
- `reader_status`：设置 want/reading/done/none，立即写入并刷新书库。

导航与刷新动作进入 Host 内存队列。主阅读与侧栏每秒轮询 `readerActions.take`：导航动作先到先执行；`notesRefresh` 只被当前书匹配的阅读器取走；`libraryRefresh` 由主阅读执行。动作取出即移除。工具返回值含 `actionId`、`queued`、目标书/章节或已写入的标签/状态，以及按工作区语言生成的“1 秒内响应”说明；回执摘要同样本地化。

## 接口与代码映射

| 入口/符号 | 位置 | 职责 |
|---|---|---|
| `createReaderActionStore` | `src/host/modules/actions/store.ts:createReaderActionStore` | 内存队列、TTL、按类型/书过滤取出 |
| `readerActions` | `src/host/api.ts:readerActions` | 客户端轮询 `take` |
| `pushReaderAction` | `src/host/api.ts:pushReaderAction` | 工具入队并返回动作 id |
| `reader_goto` / `reader_open_panel` | `src/host/modules/actions/tools.ts:reader_goto`；`src/host/modules/actions/tools.ts:reader_open_panel` | 解析书名/章节/页并排队导航 |
| `reader_mark` / `reader_note` | `src/host/modules/actions/tools.ts:reader_mark`；`src/host/modules/notes/tools.ts:reader_note` | 新增、重写、删除批注并排队刷新 |
| `reader_notes` | `src/host/modules/notes/tools.ts:reader_notes` | 长笔记草稿与显式删除 |
| `reader_tag` / `reader_status` | `src/host/modules/library/tools.ts:reader_tag`；`src/host/modules/library/tools.ts:reader_status` | 写库元数据并排队刷新 |
| `useReaderActions` | `src/client/modules/reader/use-reader-actions.ts:useReaderActions` | 每秒轮询并串行执行动作 |
| `ReaderPanel` / `SidebarReader` | `src/client/plugin.ts`、`src/client/modules/sidebar/SidebarReaderView.ts` | 执行跳转、开侧栏、重载批注/书库 |

## 约束与失败行为

队列只存在 Host 内存，TTL 120 秒、最多 100 条；Host 重启或超时后未取走的动作消失，工具仍会返回已入队回执。没有阅读器挂载时动作保持等待，直到有阅读器轮询；侧栏不处理 `libraryRefresh`，避免抢走主阅读的刷新。`reader_mark` 失败时不入队刷新；`reader_tag`/`reader_status` 的书名解析或校验失败直接返回工具错误。标签整体替换而非追加；状态 `none` 清空。批注与长笔记删除直接删记录/文件；写动作生成 FTR-044 一键撤销回执，导航动作不进入历史。只在用户明确要求时执行写动作。轮询失败只写 `console.warn`，不阻塞阅读。

## 验收与测试

- 正常路径：队列按类型和书过滤、取出后移除（`reader_actions_take_filters_and_removes`）。
- 正常路径：导航动作可一次取出全部类型（`reader_actions_take_all_returns_every_type`）。
- 正常路径：`reader_goto` 解析首章并返回 queued 回执，`reader_note` 重写/删除批注，`reader_notes` 删除长笔记（`tools_read_bounded`）。
- 正常路径：英文工作区的工具说明与批注摘要为英文（`tools_use_workspace_language`）。
