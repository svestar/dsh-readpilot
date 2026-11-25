# 阅读助手

- **ID：** FTR-017
- **名称：** 阅读助手
- **状态：** active
- **代码：** `src/host/modules/library/workspace-prompt.ts`（`READING_PROMPT`、`READING_PROMPT_EN`、`ensureWorkspacePrompt`）；`src/host/modules/library/configure.ts`（`createLibraryConfigure`）；`src/host/api.ts`（`state`、`toolContext`、`setCompanionContext`、`companionContextOf`）；`src/host/modules/library/book.ts`（扫描跳过 `AGENTS.md`）；`src/host/modules/reading/tools.ts`（`reader_context`）；`index.ts`（`apply`）
- **测试：** `tests/prompt.test.ts`；`tests/api-library.test.ts`

## 行为

阅读助手纪律写入**书库工作区根目录的 `AGENTS.md`**，由 DSH 作为该工作区指令加载，不是全局系统提示词。Host 在书库状态加载时同步管理块（`dsh-readpilot:prompt:begin` 到 `end`）：不存在时创建，已有用户内容保留并追加，重复同步只替换管理块。管理块记录 `workspace-language` 与版本：首次配置按 UI 选择中/英，之后切换 UI 不改语言，升级只更新内容；旧工作区无标记按中文。书库扫描跳过 `AGENTS.md`。

`reader_context` 是只读工具：不传书时按 `progress.updatedAt` 返回最近阅读的书；传 `book` 时返回指定书的元数据、进度、前 60 条目录和最近 10 条笔记。现有 `reader_books`、`reader_open`、`reader_read`、`reader_search`、`reader_note` 保持不变。

阅读位置注入走 Host `systemPrompt.context`：客户端在会话就绪后调用 `companionContext`，Host 按会话 id 保存书名、章节和书籍 id；`text` 回调按 `agent.session.id` 返回 `<reading_context>`，只对该会话可见，不写 `AGENTS.md`，说明按工作区语言生成。书名/章节各截断 300 字符，最多 200 个会话。笔记和记忆上下文分别见 [FTR-021](FTR-021-note-context.md) 与 [FTR-023](FTR-023-memory.md)。提示词要求 `reader_notes` 写操作只在用户明确要求时使用，正文只写文档内容，不带“未保存/待确认”等状态行；自动应用以工具结果 `applied` 为准。PDF 页码跳转由客户端自动处理（见 [FTR-026](FTR-026-chat-jump.md)）。短笔记用 `reader_note`，长笔记用 `reader_notes`，含糊时先问；`reader_memory` 只在记忆开启时更新。

## 接口与代码映射

| 入口/符号 | 位置 | 职责 |
|---|---|---|
| `READING_PROMPT` / `READING_PROMPT_EN` | `src/host/modules/library/workspace-prompt.ts:READING_PROMPT`；`READING_PROMPT_EN` | 中文/英文阅读助手纪律文本 |
| `ensureWorkspacePrompt` | `src/host/modules/library/workspace-prompt.ts:ensureWorkspacePrompt` | 按管理块语言创建/更新书库 `AGENTS.md` |
| `state` | `src/host/api.ts:state` | 首次加载书库时同步提示词文件 |
| `toolContext` | `src/host/api.ts:toolContext` | 当前书、进度、目录与最近笔记 |
| `setCompanionContext` | `src/host/api.ts:setCompanionContext` | 保存会话的当前书名、章节与书籍 id |
| `companionContextOf` | `src/host/api.ts:companionContextOf` | 按会话 id 取 `<reading_context>` 文本 |
| `apply` | `index.ts:apply` | 注册阅读位置动态上下文 |
| `reader_context` | `src/host/modules/reading/tools.ts:reader_context` | Agent 只读入口 |

## 约束与失败行为

提示词只对使用该书库工作区的会话生效；书库路径变化后重新同步。同步失败（只读/占用）被吞掉，不影响页面。管理块外用户内容保留；块内修改会被替换。`reader_context` 没有最近阅读、书不存在或正文不可提取时返回错误；目录和笔记各截断。写笔记仍需用户明确要求。阅读位置 context 是持久 user-role 快照：章节变化后下一轮生效，空记录返回空串，不泄漏到其他会话；会话关闭后保留到 LRU 淘汰。

## 验收与测试

- 正常路径：首次同步创建管理块，再次同步只替换管理块并保留用户内容（`workspace_prompt_created_and_managed`、`workspace_prompt_replaces_managed_block`）。
- 正常路径：首次英文初始化写入英文纪律和 `workspace-language:en`，之后切中文不改写（`workspace_prompt_initializes_english_and_freezes_language`）。
- 边界：旧工作区没有语言标记时按中文迁移，不因当前 UI 为英文而改写（`workspace_prompt_keeps_legacy_chinese_without_marker`）。
- 正常路径：配置时记录工作区语言，重复配置同一书库保留首次语言（`configure_records_workspace_language_once`）。
- 正常路径：笔记正文只写文档内容，状态说明留在回复里（`workspace_prompt_keeps_status_out_of_note_body`）。
- 正常路径：阅读位置按会话隔离，只对写入过的会话返回文本（`companion_context_is_scoped_to_session`）。
