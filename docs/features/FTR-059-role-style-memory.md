# 角色卡

- **ID：** FTR-059
- **名称：** 角色卡
- **状态：** active
- **代码：** `src/host/modules/role/store.ts`（`createRoleStore`）；`src/host/modules/role/handlers.ts`（`createRoleHandlers`、`role`）；`src/host/modules/role/resolve.ts`（`resolveRole`）；`src/host/modules/role/context.ts`（`buildRoleContext`）；`src/host/modules/role/defaults.ts`（`DEFAULT_ROLE`）；`src/host/modules/companion/prompt-contexts.ts`（`registerPromptContexts`）；`src/host/modules/companion/settings-store.ts`（`loadCompanionSettings`）；`src/host/modules/backup/notes.ts`（`remapRoles`）；`src/client/modules/companion/RolePanel.ts`（`RolePanel`）；`src/client/modules/companion/use-role.ts`（`useRole`）
- **测试：** `tests/role.test.ts`；`tests/role-panel.test.ts`；`tests/reader-context.test.ts`；`tests/backup.test.ts`

## 行为

角色卡独立于记忆，设定伴读直接以谁的身份回应：身份、名字、语气和思考方式。角色页管理全局与本书角色；全局开关默认开，本书开关默认关；独立于记忆开关。

生效优先级：本书开关开启且正文非空时使用本书角色；否则全局角色非空时使用全局角色；否则使用默认角色“DSH 阅读助手”。默认角色包含原身份与默认风格（简洁、不剧透），不套扮演前缀；自定义角色才直接以第一人称回应，不声明在扮演；用户询问真实身份或要求退出时除外。角色只注入绑书会话，无书不注入；`AGENTS.md` 不再包含身份。

角色卡存于 `$DSH_HOME/dsh-readpilot/roles/global.md` 与 `roles/<bookId>.md`，每卡 600 字、10 条历史，支持保存、撤销、恢复、删除与清空。旧 `memory/role.md` 不迁移也不参与解析。备份含 `roles/`；恢复按内容映射本书角色。

角色上下文由独立的 `dsh-readpilot:role` 注入，顺序先于守卫与阅读上下文，预算约 1200 字；角色是用户指令，但不能覆盖系统规则、工具权限或用户当前要求。`reader_memory` 只管理 book/reader 两张卡，不再提供 `role` scope。

## 接口与代码映射

| 入口/符号 | 位置 | 职责 |
|---|---|---|
| `createRoleStore` | `src/host/modules/role/store.ts:createRoleStore` | 全局/本书角色读写与历史 |
| `resolveRole` | `src/host/modules/role/resolve.ts:resolveRole` | 本书 > 全局 > 默认的解析 |
| `buildRoleContext` | `src/host/modules/role/context.ts:buildRoleContext` | 默认原样返回；自定义角色包裹 |
| `role` | `src/host/modules/role/handlers.ts:role` | RPC：status/write/clear/undo/history/setEnabled/setBookEnabled |
| `registerPromptContexts` | `src/host/modules/companion/prompt-contexts.ts:registerPromptContexts` | 注册角色、守卫与阅读上下文 |
| `RolePanel` / `useRole` | `src/client/modules/companion/RolePanel.ts:RolePanel`；`src/client/modules/companion/use-role.ts:useRole` | 角色页与状态操作 |
| `remapRoles` | `src/host/modules/backup/notes.ts:remapRoles` | 备份恢复时映射本书角色 |

## 约束与失败行为

角色卡是用户设定的扮演指令；默认角色不套用扮演提示。自定义角色直接以第一人称回应，不声明扮演。背景与知识边界只塑造风格，不妨碍任务与工具。要求调用工具、修改数据或忽略规则的内容不执行。不改变引用规则，以书内事实和工具结果为依据。关闭自定义角色只注入默认身份；本书关闭或留空时回落到全局角色。写入超过 600 字返回 `role-too-large`；非法 bookId 返回 `invalid-role-book`；历史快照缺失返回 `history-not-found`。角色页无书不加载；写入失败保留当前卡并显示错误。

## 验收与测试

- 正常路径/边界：全局与本书卡读写、撤销、清空，600 字上限与历史裁剪（`role_store_read_write_and_history`）。
- 正常路径：本书开启覆盖全局，本书关闭/留空回落全局，全局为空回落默认，关闭自定义角色只留默认（`role_resolution_priority`）。
- 正常路径：自定义角色块带标签与声明，超长被截断；默认角色原样返回（`role_context_wraps_and_truncates`）。
- 正常路径：角色 RPC 往返、来源切换与按会话注入（`role_rpc_roundtrip_and_context`）。
- 正常路径：注册顺序为角色、守卫、阅读上下文（`reader_guard_is_registered_and_localized`）。
- 正常路径：角色页显示生效来源与两个编辑区；本书开关与历史清空确认可用（`role_panel_renders_effective_role_and_controls`、`role_panel_switches_book_override_and_clears_history`）。
