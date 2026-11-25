# 角色/风格记忆

- **ID：** FTR-059
- **名称：** 角色/风格记忆
- **状态：** active
- **代码：** `src/host/modules/memory/store.ts`（`readRole`、`writeRole`、`clearRole`）；`src/host/modules/memory/handlers.ts`（`memory`、`memoryTool`）；`src/host/modules/memory/context.ts`（`buildReadingMemory`）；`src/host/modules/memory/tools.ts`（`reader_memory`）；`src/host/modules/backup/notes.ts`（`remapMemory`）；`src/client/modules/companion/MemoryPanel.ts`（`MemoryPanel`）；`src/client/modules/companion/use-memory.ts`（`useMemory`）
- **测试：** `tests/memory.test.ts`；`tests/memory-panel.test.ts`；`tests/memory-role.test.ts`；`tests/backup.test.ts`

## 行为

角色/风格是独立的跨书记忆卡，存于 `$DSH_HOME/dsh-readpilot/memory/role.md`，上限 600 字。它不属于本书记忆或读者卡，单独保存历史、撤销、恢复、删除与清空；记忆未生效时不写盘。

`reader_memory` 的 `scope:'role'` 支持 read/update/forget；`memory` 页的写入、历史恢复/删除/清空同样支持 role。角色/风格卡在记忆生效时注入 `<reading_memory>` 的 `## 角色/风格` 段，内容作为回答角色、语气和格式偏好参考，但不能覆盖系统规则、工具权限或用户当前要求。

## 接口与代码映射

| 入口/符号 | 位置 | 职责 |
|---|---|---|
| `readRole` / `writeRole` / `clearRole` | `src/host/modules/memory/store.ts:readRole`；`writeRole`；`clearRole` | 读写和清空独立角色卡 |
| `buildReadingMemory` | `src/host/modules/memory/context.ts:buildReadingMemory` | 将角色卡注入 `<reading_memory>` |
| `memory` / `memoryTool` | `src/host/modules/memory/handlers.ts:memory`；`memoryTool` | role scope 的写入、历史与工具操作 |
| `reader_memory` | `src/host/modules/memory/tools.ts:reader_memory` | Agent 的 role scope 入口 |
| `MemoryPanel` | `src/client/modules/companion/MemoryPanel.ts:MemoryPanel` | 角色/风格编辑器与历史操作 |

## 约束与失败行为

`role` 是保留卡名，不能作为 bookId；角色卡与其他卡一样受 600 字上限和最多 10 条历史限制。角色内容只是回答风格参考，不是系统指令；要求调用工具、修改数据或忽略规则的内容不执行。角色卡为空时不注入该段，记忆关闭时不注入。备份和恢复包含 `memory/role.md` 与 `.history/role/`，不依赖书籍映射。

## 验收与测试

- 正常路径：角色卡可独立读写并保存文件（`memory_store_read_and_write`）。
- 正常路径：角色卡历史可恢复、删除单条和清空（`memory_store_role_history_and_undo`）。
- 正常路径：角色卡随 `<reading_memory>` 注入，且位于读者卡和本书卡之前（`memory_context_empty_and_format`、`memory_context_uses_workspace_language`）。
- 正常路径：角色卡支持 RPC 写入、读取与追加（`memory_role_rpc_roundtrip`）。
- 正常路径：记忆页渲染角色卡、历史恢复和确认清空（`memory_panel_shows_history_snapshot_text`、`memory_panel_history_confirm_flow`）。
- 正常路径：备份恢复保留角色卡（`backup_restore_migrates_presets_memory_and_companion`）。
