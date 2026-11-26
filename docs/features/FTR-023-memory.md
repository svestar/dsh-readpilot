# 记忆

- **ID：** FTR-023
- **名称：** 记忆
- **状态：** active
- **代码：** `src/shared/contracts/companion.ts`（`MemoryMode`、`effectiveMemoryState`）；`src/host/modules/memory/store.ts`（`createMemoryStore`）；`src/host/modules/memory/context.ts`（`buildReadingMemory`）；`src/host/modules/memory/handlers.ts`（`createMemoryHandlers`、`memory`、`memoryTool`、`memoryContextFor`）；`src/host/modules/library/workspace-prompt.ts`（`READING_PROMPT`）；`src/host/modules/memory/tools.ts`（`reader_memory`）；`src/client/modules/companion/MemoryPanel.ts`（`MemoryPanel`）；`src/client/modules/companion/use-memory.ts`（`useMemory`）
- **测试：** `tests/memory.test.ts`；`tests/memory-panel.test.ts`

## 行为

记忆是**默认关闭**的可选能力。设置存 `$DSH_HOME/dsh-readpilot/companion.json` 的 `memory`：全局模式 `off | on`，默认 `off`；单书状态 `inherit | on | off`，默认 `inherit`。生效需全局为 `on` 且单书不为 `off`。旧配置里的 `ask` 一律迁移为 `off`。

开启后，提示词要求伴读主动记录长期有效且重要的信息：稳定的阅读偏好、对书或作者的判断、反复出现的疑问、明确目标；不记录书内情节、一次性问题、阅读进度或能从 `reader_context` 查到的事实。`reader_memory` 的 `update`/`forget` 按 scope 校验：本书卡要求本书生效，读者卡与角色卡只要求全局开启；未生效返回 `memory-off`。每张卡（本书、读者、角色/风格）最多 **600 字**，超出返回 `memory-too-large`，要求先压缩再用 `mode=replace` 写回；存储拒绝写入而不是静默截断。

全局记忆开启时，Host 通过 `systemPrompt.context` 按会话注入 `<reading_memory>`，说明按工作区语言生成；没有内容时注入空串；本书关闭时仍注入角色卡与读者卡，只省略本书卡；全局关闭时不注入。右栏“记忆”标签提供全局模式、单书状态、生效状态、三张卡编辑（带 600 字计数）、历史、撤销与清空。历史条目可展开查看该版本的完整正文，而不只是时间与字数；历史都可恢复、删除单条与清空，见 FTR-057。角色/风格卡见 FTR-059。

## 接口与代码映射

| 入口/符号 | 位置 | 职责 |
|---|---|---|
| `MemoryMode` / `effectiveMemoryState` | `src/shared/contracts/companion.ts:effectiveMemoryState` | 全局与单书状态合成生效状态 |
| `createMemoryStore` | `src/host/modules/memory/store.ts:createMemoryStore` | 读写两张卡、历史与撤销，执行 600 字上限 |
| `buildReadingMemory` | `src/host/modules/memory/context.ts:buildReadingMemory` | 生成 `<reading_memory>` 并按预算截断 |
| `memory` | `src/host/modules/memory/handlers.ts:memory` | 记忆页的 status/setMode/setBook/write/undo/clear，以及 historyRestore/historyRemove/historyClear |
| `memoryTool` | `src/host/modules/memory/handlers.ts:memoryTool` | Agent 侧 read/update/forget，校验生效状态与上限 |
| `memoryContextFor` | `src/host/modules/memory/handlers.ts:memoryContextFor` | 按会话返回缓存的记忆文本 |
| `MemoryPanel` / `useMemory` | `src/client/modules/companion/MemoryPanel.ts:MemoryPanel`；`src/client/modules/companion/use-memory.ts:useMemory` | 记忆页与轮询状态 |

## 约束与失败行为

全局关闭时角色/读者写入返回 `memory-off`，本书关闭时本书写入返回 `memory-off`；不生成草稿或提议。开启后写入直接落盘并留历史，可撤销。超长内容返回 `memory-too-large`，不会截断存储；上下文注入按总预算截断并标注“已截断”。`bookId` 只允许 `[A-Za-z0-9_-]{1,64}`，`reader`/`role` 为保留名不能作为书 id。记忆仅在本机目录，按会话隔离。

## 验收与测试

- 正常路径：默认 `off`，旧 `ask` 迁移为 `off`（`memory_settings_defaults`、`memory_settings_migrates_ask_to_off`）。
- 正常路径：全局与单书组合的生效矩阵（`memory_effective_state_matrix`）。
- 正常路径/边界：两张卡读写、600 字上限、历史、撤销与清空（`memory_store_read_and_write`、`memory_store_caps_clear_and_undo_clear`）。
- 正常路径：历史快照携带正文，书卡与读者卡的历史都能展开查看旧版本（`memory_store_history_and_undo`、`memory_panel_shows_history_snapshot_text`）。
- 边界：上下文为空时不注入，格式与截断正确（`memory_context_empty_and_format`）。
- 正常路径：记忆上下文按工作区语言生成（`memory_context_uses_workspace_language`）。
