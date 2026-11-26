# 阅读助手

- **ID：** FTR-017
- **名称：** 阅读助手
- **状态：** active
- **代码：** `src/host/modules/prompt/catalog.ts`（`readingPrompt`、`READING_PROMPT`、`PROMPT_RULES`）；`src/host/modules/library/workspace-prompt.ts`（`ensureWorkspacePrompt`、`readWorkspacePromptLanguage`）；`src/host/modules/library/state.ts`（`createWorkspaceSync`、`createLibraryState`）；`src/host/modules/library/configure.ts`（`createLibraryConfigure`）；`src/host/api.ts`（`state`、`setCompanionContext`、`companionContextOf`）；`src/client/modules/reader/ReaderPanelView.ts`（`ReaderPanelView`）；`index.ts`（`apply`）
- **测试：** `tests/prompt.test.ts`；`tests/api-library.test.ts`；`tests/client-assembly.test.ts`

## 行为

阅读助手纪律写入**书库工作区根目录的 `AGENTS.md`**，由 DSH 作为工作区指令加载。Host 每次书库状态加载都校验管理块（`dsh-readpilot:prompt:begin` 到 `end`）：不存在时创建，保留块外用户内容，只替换块内内容；删除或改写后自动重建。同步失败不阻塞页面，结果写入 `ReaderState.promptSync`，客户端以非阻塞提示展示。`settings.workspaceLanguage` 是唯一语言权威，管理块只记录语言标记并用于旧工作区迁移；首次配置按 UI 选中/英，之后切换 UI 不改语言。工具地图由已注册工具定义生成，见 [FTR-004](FTR-004-tools.md)；规则以稳定 id 存于 `catalog.ts`，输出由 golden 校验。管理块不再包含身份；默认身份与自定义角色由 FTR-059 的 `<reading_role>` 注入。扫描跳过 AGENTS.md。

阅读位置注入走 Host `systemPrompt.context`：客户端就绪后调用 `companionContext`，Host 按会话 id 保存书名、章节和书籍 id；`text` 按 `agent.session.id` 返回合并的阅读/笔记/记忆上下文（见 FTR-037），只对该会话可见，不写 `AGENTS.md`。角色由独立的 `<reading_role>` 注入，见 [FTR-059](FTR-059-role-style-memory.md)。书名/章节各截 300 字符，最多 200 个会话。笔记/记忆规则见 [FTR-022](FTR-022-note-drafts.md)、[FTR-023](FTR-023-memory.md)，笔记上下文见 [FTR-021](FTR-021-note-context.md)，PDF 页码见 [FTR-026](FTR-026-chat-jump.md)。

## 接口与代码映射

| 入口/符号 | 位置 | 职责 |
|---|---|---|
| `readingPrompt` / `READING_PROMPT` | `src/host/modules/prompt/catalog.ts:readingPrompt`；`READING_PROMPT` | 按语言与工具地图生成纪律文本（不含身份） |
| `ensureWorkspacePrompt` | `src/host/modules/library/workspace-prompt.ts:ensureWorkspacePrompt` | 按 settings 语言创建/更新书库 `AGENTS.md` |
| `state` | `src/host/api.ts:state` | 加载书库时同步提示词文件 |
| `setCompanionContext` | `src/host/api.ts:setCompanionContext` | 保存会话的当前书名、章节与书籍 id |
| `companionContextOf` | `src/host/api.ts:companionContextOf` | 按会话 id 取 `<reading_context>` 文本 |
| `apply` | `index.ts:apply` | 注册角色、守卫与合并上下文（见 FTR-037、FTR-059） |

## 约束与失败行为

提示词只对使用该书库工作区的会话生效；书库路径变化后重新同步。

## 验收与测试

- 首次同步创建管理块，再次同步替换块内并保留用户内容（`workspace_prompt_created_and_managed`、`workspace_prompt_replaces_managed_block`）。
- 管理块跟随请求语言重写（`workspace_prompt_follows_requested_language`）；旧工作区无标记按中文迁移（`workspace_prompt_migrates_legacy_block_via_configure`）。
- 规则 id 唯一、中英齐全，输出与 golden 一致（`reading_prompt_catalog_rules_have_stable_ids`、`reading_prompt_matches_golden_snapshot`）。
- settings 语言优先于标记并在状态加载时回写（`workspace_language_settings_win_over_prompt_marker`）；缺语言时从标记迁移（`workspace_language_migrates_from_marker_when_settings_missing`）。
- 配置记录工作区语言，同书库重复配置保留首次语言（`configure_records_workspace_language_once`）。
- 删除 `AGENTS.md` 后下一次状态加载会重建；不可写目录不阻塞状态加载，`promptSync` 返回失败（`workspace_prompt_repairs_deleted_block_on_state`、`workspace_prompt_sync_reports_failure`）。
- 正常路径：同步失败在客户端显示非阻塞提示（`client_assembly_surfaces_prompt_sync_failure`）。
