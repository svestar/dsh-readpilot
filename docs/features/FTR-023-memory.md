# 记忆

- **ID：** FTR-023
- **名称：** 记忆
- **状态：** active
- **代码：** `src/companion/settings.ts`（`MemoryMode`、`effectiveMemoryState`）；`src/memory/store.ts`（`createMemoryStore`）；`src/memory/context.ts`（`buildReadingMemory`）；`src/api/memory.ts`（`createMemoryHandlers`、`memory`、`memoryTool`、`memoryContextFor`）；`src/agent/workspace-prompt.ts`（`READING_PROMPT`）；`src/agent/tools.ts`（`reader_memory`）；`src/client/companion/memory-panel.ts`（`MemoryPanel`）；`src/client/hooks/use-memory.ts`（`useMemory`）
- **测试：** `tests/memory.test.ts`

## 行为

记忆是**默认关闭**的可选能力。设置存 `$DSH_HOME/dsh-readpilot/companion.json` 的 `memory`：全局模式 `off | on`，默认 `off`；单书状态 `inherit | on | off`，默认 `inherit`。生效需要全局为 `on` 且单书不为 `off`；单书显式 `on` 可覆盖全局 `off` 以外的默认。旧配置里的 `ask` 一律迁移为 `off`。

开启后，提示词要求伴读主动记录长期有效且重要的信息：稳定的阅读偏好、对书或作者的判断、反复出现的疑问、明确目标；不记录书内情节、一次性问题、阅读进度或能从 `reader_context` 查到的事实。`reader_memory` 的 `update`/`forget` 只在生效时可用；未开启返回 `memory-off`。每张卡（本书记忆、读者卡）最多 **600 字**，超出返回 `memory-too-large`，要求先压缩再用 `mode=replace` 写回；存储拒绝写入而不是静默截断。

记忆生效时，Host 通过 `systemPrompt.context` 按会话注入 `<reading_memory>`，没有内容时注入空串；关闭时不注入。右栏“记忆”标签提供全局模式、单书状态、生效状态、书卡与读者卡编辑（带 600 字计数）、历史、撤销与清空。

## 接口与代码映射

| 入口/符号 | 位置 | 职责 |
|---|---|---|
| `MemoryMode` / `effectiveMemoryState` | `src/companion/settings.ts:effectiveMemoryState` | 全局与单书状态合成生效状态 |
| `createMemoryStore` | `src/memory/store.ts:createMemoryStore` | 读写两张卡、历史与撤销，执行 600 字上限 |
| `buildReadingMemory` | `src/memory/context.ts:buildReadingMemory` | 生成 `<reading_memory>` 并按预算截断 |
| `memory` | `src/api/memory.ts:memory` | 记忆页的 status/setMode/setBook/write/undo/clear |
| `memoryTool` | `src/api/memory.ts:memoryTool` | Agent 侧 read/update/forget，校验生效状态与上限 |
| `memoryContextFor` | `src/api/memory.ts:memoryContextFor` | 按会话返回缓存的记忆文本 |
| `MemoryPanel` / `useMemory` | `src/client/companion/memory-panel.ts:MemoryPanel`；`src/client/hooks/use-memory.ts:useMemory` | 记忆页与轮询状态 |

## 约束与失败行为

关闭时工具写入返回 `memory-off`，不生成草稿或提议；开启后写入直接落盘并留历史，可撤销。超长内容返回 `memory-too-large`，不会截断存储；上下文注入按总预算截断并标注“已截断”。`bookId` 只允许 `[A-Za-z0-9_-]{1,64}`，`reader` 为保留名不能作为书 id；历史最多 10 条。记忆只在本机数据目录，不随书库文件移动；按会话隔离，不泄漏到其他书的会话。

## 验收与测试

- 正常路径：默认 `off`，旧 `ask` 迁移为 `off`（`memory_settings_defaults`、`memory_settings_migrates_ask_to_off`）。
- 正常路径：全局与单书组合的生效矩阵（`memory_effective_state_matrix`）。
- 正常路径/边界：两张卡读写、600 字上限、历史、撤销与清空（`memory_store_read_and_write`、`memory_store_caps_clear_and_undo_clear`）。
- 边界：上下文为空时不注入，格式与截断正确（`memory_context_empty_and_format`）。
