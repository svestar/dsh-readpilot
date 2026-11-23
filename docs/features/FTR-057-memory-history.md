# 记忆历史管理

- **ID：** FTR-057
- **名称：** 记忆历史管理
- **状态：** active
- **代码：** `src/host/modules/memory/store.ts`（`restoreHistory`、`removeHistory`、`clearHistory`）；`src/host/modules/memory/handlers.ts`（`memory`）；`src/client/modules/companion/use-memory.ts`（`useMemory`）；`src/client/modules/companion/MemoryPanel.ts`（`MemoryPanel`）
- **测试：** `tests/memory.test.ts`；`tests/memory-panel.test.ts`

## 行为

记忆每次覆盖或清空卡片前都会留下快照，历史最多 10 条（FTR-023）。本书记忆与读者卡（跨书卡）的历史列表内都提供管理：恢复所选版本、删除单条历史、清空全部历史。恢复前先把当前正文写入历史，再把所选快照原子写回；恢复后编辑框与历史列表同步刷新，当前内容不会丢失。删除与清空只移除该卡的历史快照，不改动当前卡片，也不影响另一张卡与上下文。删除单条与清空历史需要二次确认；恢复不需要确认，因为恢复前的内容已经进入历史，可再次撤销。

## 接口与代码映射

| 入口/符号 | 位置 | 职责 |
|---|---|---|
| `restoreHistory` | `src/host/modules/memory/store.ts:restoreHistory` | 先快照当前，再原子恢复所选历史 |
| `removeHistory` / `clearHistory` | `src/host/modules/memory/store.ts:removeHistory`；`src/host/modules/memory/store.ts:clearHistory` | 删除单条或清空指定卡片历史，返回是否删除与删除数量 |
| `memory` | `src/host/modules/memory/handlers.ts:memory` | `historyRestore` / `historyRemove` / `historyClear` RPC，按 `scope` 选择卡片并重建记忆上下文 |
| `useMemory` | `src/client/modules/companion/use-memory.ts:useMemory` | 历史恢复、删除与清空动作，错误显示在记忆页 |
| `MemoryPanel` | `src/client/modules/companion/MemoryPanel.ts:MemoryPanel` | 两张卡历史的展开、恢复、删除、清空与确认弹窗 |

## 约束与失败行为

历史 id 只接受 `<数字>-<十六进制>`，路径限制在该卡历史目录内；非法 id 返回 `invalid-history`，恢复不存在的快照返回 `history-not-found`，删除不存在的快照返回 `false` 而不报错。恢复会为当前内容追加新快照，因此历史数量可能增加；10 条上限沿用覆盖时的裁剪规则。`scope` 为 `book` 或 `reader`，分别作用于本书记忆与读者卡，缺省为 `book`。存储失败不会改动卡片；删除与清空只作用于历史目录。操作结束后 Host 重新构建该会话的记忆上下文。

## 验收与测试

- 正常路径：恢复所选本书记忆历史后卡片回到旧版本，当前版本进入历史（`memory_store_history_restore`）。
- 正常路径/边界：读者卡删除单条返回真、重复删除返回假、缺失快照恢复返回 `history-not-found`；清空返回数量且当前卡不变，非法 id 返回 `invalid-history`（`memory_store_history_remove_and_clear`）。
- 正常路径：本书记忆与读者卡的历史条都显示恢复、删除与清空按钮（`memory_panel_shows_history_snapshot_text`）。
