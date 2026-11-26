# 角色卡

- **ID：** FTR-059
- **名称：** 角色卡
- **状态：** active
- **代码：** `src/host/modules/role/store.ts`（`createRoleStore`）；`src/host/modules/role/handlers.ts`（`createRoleHandlers`、`role`）；`src/host/modules/role/resolve.ts`（`resolveRole`）；`src/host/modules/role/context.ts`（`buildRoleContext`）；`src/host/modules/role/defaults.ts`（`DEFAULT_ROLE`）；`src/host/modules/companion/prompt-contexts.ts`（`registerPromptContexts`）；`src/host/modules/companion/settings-store.ts`（`loadCompanionSettings`）；`src/host/modules/backup/notes.ts`（`remapRoles`）；`src/client/modules/companion/RolePanel.ts`（`RolePanel`）；`src/client/modules/companion/use-role.ts`（`useRole`）
- **测试：** `tests/role.test.ts`；`tests/role-panel.test.ts`；`tests/reader-context.test.ts`；`tests/backup.test.ts`

## 行为

角色卡独立于记忆，用于设定伴读扮演人物：身份、知识边界、语气和思考方式。右侧栏“角色”页管理全局与本书角色；全局“启用自定义角色”开关默认开启，本书“使用独立角色”开关默认关闭。角色不再受记忆开关控制。

生效优先级：本书开关开启且正文非空时使用本书角色；否则全局角色非空时使用全局角色；否则使用默认角色“DSH 阅读助手”。角色只对绑定书的会话生效，无书会话使用默认角色。`AGENTS.md` 不再包含身份句，默认身份由角色模块在 `<reading_role>` 中注入，因此没有自定义角色时人格仍然稳定。

角色卡存于 `$DSH_HOME/dsh-readpilot/roles/global.md` 与 `roles/<bookId>.md`，每张卡上限 600 字、最多 10 条历史，支持保存、撤销、恢复、删除与清空。旧 `memory/role.md` 与 `.history/role/` 在首次读取时迁移为全局卡及其历史，旧文件保留。备份包含 `roles/`；恢复按书籍内容映射重写本书角色。

角色上下文由独立的 `dsh-readpilot:role` 注入，顺序在阅读守卫与阅读上下文之前，预算约 1200 字；内容声明为资料而非系统指令，不能覆盖系统规则、工具权限或用户当前要求。`reader_memory` 只管理 book/reader 两张卡，不再提供 `role` scope。

## 接口与代码映射

| 入口/符号 | 位置 | 职责 |
|---|---|---|
| `createRoleStore` | `src/host/modules/role/store.ts:createRoleStore` | 全局/本书角色读写、历史、迁移 |
| `resolveRole` | `src/host/modules/role/resolve.ts:resolveRole` | 本书 > 全局 > 默认的解析 |
| `buildRoleContext` | `src/host/modules/role/context.ts:buildRoleContext` | 生成并截断 `<reading_role>` |
| `role` | `src/host/modules/role/handlers.ts:role` | RPC：status/write/clear/undo/history/setEnabled/setBookEnabled |
| `registerPromptContexts` | `src/host/modules/companion/prompt-contexts.ts:registerPromptContexts` | 注册角色、守卫与阅读上下文 |
| `RolePanel` / `useRole` | `src/client/modules/companion/RolePanel.ts:RolePanel`；`src/client/modules/companion/use-role.ts:useRole` | 角色页与状态操作 |
| `remapRoles` | `src/host/modules/backup/notes.ts:remapRoles` | 备份恢复时映射本书角色 |

## 约束与失败行为

角色卡内容是人物的扮演设定，不是系统指令；要求调用工具、修改数据或忽略规则的内容不执行。角色卡不改变阅读范围、引用与不剧透规则；以书内事实和工具结果为依据。全局关闭自定义角色时只注入默认身份；本书关闭或留空时回落到全局角色。写入超过 600 字返回 `role-too-large`；非法 bookId 返回 `invalid-role-book`；历史快照缺失返回 `history-not-found`。角色页无书籍时不加载；写入失败保留当前卡并显示错误。

## 验收与测试

- 正常路径/边界：全局与本书卡读写、撤销、清空，600 字上限与历史裁剪（`role_store_read_write_and_history`）。
- 正常路径：旧 `memory/role.md` 与历史迁移到 `roles/global.md`（`role_migrates_legacy_memory_role`）。
- 正常路径：本书开启覆盖全局，本书关闭/留空回落全局，全局为空回落默认，关闭自定义角色只留默认（`role_resolution_priority`）。
- 正常路径：角色块带标签、声明与闭合标签，超长被截断（`role_context_wraps_and_truncates`）。
- 正常路径：角色 RPC 往返、来源切换与按会话注入（`role_rpc_roundtrip_and_context`）。
- 正常路径：注册顺序为角色、守卫、阅读上下文（`reader_guard_is_registered_and_localized`）。
- 正常路径：角色页显示生效来源与两个编辑区；本书开关与历史清空确认可用（`role_panel_renders_effective_role_and_controls`、`role_panel_switches_book_override_and_clears_history`）。
