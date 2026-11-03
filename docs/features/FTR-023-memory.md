# 记忆

- **ID：** FTR-023
- **名称：** 记忆
- **状态：** active
- **代码：** `src/companion-settings.ts`（`effectiveMemoryState`）；`src/memory-store.ts`（`createMemoryStore`）；`src/memory-context.ts`（`buildReadingMemory`）；`src/memory-proposals.ts`（`createMemoryProposalStore`）；`src/api.ts`（`memory`、`memoryTool`、`memoryContextFor`、`rebuildMemory`）；`src/tools.ts`（`reader_memory`）；`index.ts`（`apply`）；`src/client/hooks/use-memory.ts`（`useMemory`）；`src/client/views/memory-panel.ts`（`MemoryPanel`）
- **测试：** `tests/memory.test.ts`；`tests/memory-proposals.test.ts`；`tests/api.test.ts`

## 行为

记忆设置存 `$DSH_HOME/dsh-readpilot/companion.json` 的 `memory`：全局模式 `off | ask | on`，默认 `ask`；单书状态 `inherit | on | off`，默认 `inherit`。全局 `off` 暂停所有书；单书 `off`/`on` 优先；`inherit` 跟随全局。每本书一张卡 `memory/<bookId>.md`，跨书读者卡 `memory/reader.md`；书卡上限 4000 字符、读者卡 2000 字符，写入前把旧内容存入 `.history/`，最多 10 份，可撤销与清空。

右栏“记忆”标签显示记忆页：全局模式、本书状态、生效状态、书卡/读者卡编辑、撤销、清空，以及待确认的记忆提议。记忆开启时，Host 的 systemPrompt.context 记忆条目按会话注入 `<reading_memory>`，只在当前书生效状态为 `on` 时注入；读者卡只随当前书一起注入。`reader_memory` 工具提供 `read`、`update`、`forget`：`read` 返回两张卡；`update` 在 `ask` 模式下生成提议、在 `on` 模式下直接写入、在 `off` 模式下报错；`forget` 只在 `on` 模式下清空对应卡，`off`/`ask` 模式拒绝。提议在记忆页“同意并保存”后把本书设为 `on` 并写入，选择“不用”则把本书设为 `off`。

## 接口与代码映射

| 入口/符号 | 位置 | 职责 |
|---|---|---|
| `effectiveMemoryState` | `src/companion-settings.ts:effectiveMemoryState` | 全局模式与单书状态的生效规则 |
| `createMemoryStore` | `src/memory-store.ts:createMemoryStore` | 两张卡的读写、历史上限、撤销与清空 |
| `buildReadingMemory` | `src/memory-context.ts:buildReadingMemory` | 生成 `<reading_memory>` 并按总预算截断 |
| `createMemoryProposalStore` | `src/memory-proposals.ts:createMemoryProposalStore` | `ask` 模式下的待确认提议 |
| `memory` / `memoryTool` | `src/api.ts:memory`；`src/api.ts:memoryTool` | UI 的读写/同意/拒绝与工具入口 |
| `memoryContextFor` | `src/api.ts:memoryContextFor` | 按会话返回缓存的记忆文本 |
| `reader_memory` | `src/tools.ts:reader_memory` | Agent 读取/更新/忘记记忆 |
| `useMemory` / `MemoryPanel` | `src/client/hooks/use-memory.ts:useMemory`；`src/client/views/memory-panel.ts:MemoryPanel` | 记忆区状态与 UI |

## 约束与失败行为

`settings` 文件损坏或缺少 `memory` 时按默认值读取；旧 `notes` 配置保留。`bookId` 只允许 `[A-Za-z0-9_-]{1,64}`，`reader` 作为保留名不能作为书 id。超长写入返回 `memory-too-large`，非法历史 id 返回 `invalid-history`，没有历史时撤销返回 `history-empty`；提议过多返回 `too-many-proposals`。工具在 `off` 模式下拒绝更新；`ask` 模式只创建提议，不直接写入；只有 `on` 模式自动更新，`forget` 也只在 `on` 模式可用。记忆只记录读者偏好、观点、疑问与讨论结论，不记录书里的情节设定。上下文是持久快照，开启/修改后在下一轮生效；关闭只停止自动注入，不阻止用工具读取。草稿与导出不进入记忆。

## 验收与测试

- 正常路径：默认值、旧配置迁移、损坏文件与生效状态矩阵（`memory_settings_defaults`、`memory_settings_migrates_notes_only_file`、`memory_effective_state_matrix`）。
- 正常路径：书卡/读者卡读写、历史上限与撤销、清空可撤销（`memory_store_read_and_write`、`memory_store_history_and_undo`、`memory_store_caps_clear_and_undo_clear`）。
- 边界：非法 bookId/历史 id 被拒绝，上下文空白与截断正确（`memory_store_rejects_path_traversal`、`memory_context_empty_and_format`、`memory_context_truncates_each_card`）。
- 正常路径：提议创建后可同意写入并注入，关闭后不再注入（API 集成测试覆盖）。
