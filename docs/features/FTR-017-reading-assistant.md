# 阅读助手

- **ID：** FTR-017
- **名称：** 阅读助手
- **状态：** active
- **代码：** `src/host/modules/library/workspace-prompt.ts`（`READING_PROMPT`、`ensureWorkspacePrompt`）；`src/host/api.ts`（`state`、`toolContext`、`setCompanionContext`、`companionContextOf`）；`src/host/modules/library/book.ts`（扫描跳过 `AGENTS.md`）；`src/host/modules/reading/tools.ts`（`reader_context`）；`index.ts`（`apply`）
- **测试：** `tests/prompt.test.ts`

## 行为

阅读助手纪律写入**书库工作区根目录的 `AGENTS.md`**，由 DSH 作为该工作区的指令加载，而不是全局系统提示词。Host 启动和书库状态加载时同步；内容放在 `<!-- dsh-readpilot:prompt:begin -->` 与 `<!-- dsh-readpilot:prompt:end -->` 管理块中：文件不存在时创建；已有用户内容时保留并在末尾追加；重复同步只替换管理块，不重复追加。书库扫描跳过根目录/子目录的 `AGENTS.md`，不会把提示词文件当成 Markdown 书籍。

`reader_context` 是只读工具：不传书时按 `progress.updatedAt` 返回最近阅读的书；传 `book` 时返回指定书的元数据、进度、前 60 条目录和最近 10 条笔记。现有 `reader_books`、`reader_open`、`reader_read`、`reader_search`、`reader_note` 保持不变。

阅读位置注入走 Host 的 `systemPrompt.context`：客户端在书籍与会话就绪后调用 `companionContext`，Host 按会话 id 保存书名、章节和书籍 id；`text` 回调按 `agent.session.id` 返回 `<reading_context>` 文本，只有该会话可见，不写 `AGENTS.md`，也不产生可见消息。书名与章节各截断 300 字符，最多保留 200 个会话。笔记上下文另由 [FTR-021](FTR-021-note-context.md) 按书注入；记忆由 [FTR-023](FTR-023-memory.md) 按书的生效状态注入。提示词还要求 `reader_notes` 的写操作只在用户明确要求时使用，生成草稿后提醒用户在笔记面板确认；自动应用开启时以工具结果的 `applied` 为准，不能自行宣称已保存。PDF 页码跳转由客户端自动处理（见 [FTR-026](FTR-026-chat-jump.md)），提示词不要求生成链接。短笔记用 `reader_note`（引用原文记一两句），长笔记用 `reader_notes`（整理/写/追加/扩写长文），含糊时先问。提示词同时要求 `reader_memory` 只在记忆开启时更新，`ask` 模式提醒用户去记忆页确认，不记录书内情节。

## 接口与代码映射

| 入口/符号 | 位置 | 职责 |
|---|---|---|
| `READING_PROMPT` | `src/host/modules/library/workspace-prompt.ts:READING_PROMPT` | 阅读助手纪律文本 |
| `ensureWorkspacePrompt` | `src/host/modules/library/workspace-prompt.ts:ensureWorkspacePrompt` | 创建/更新书库 `AGENTS.md` 管理块 |
| `state` | `src/host/api.ts:state` | 首次加载书库时同步提示词文件 |
| `toolContext` | `src/host/api.ts:toolContext` | 当前书、进度、目录与最近笔记 |
| `setCompanionContext` | `src/host/api.ts:setCompanionContext` | 保存会话的当前书名、章节与书籍 id |
| `companionContextOf` | `src/host/api.ts:companionContextOf` | 按会话 id 取 `<reading_context>` 文本 |
| `apply` | `index.ts:apply` | 注册阅读位置动态上下文 |
| `reader_context` | `src/host/modules/reading/tools.ts:reader_context` | Agent 只读入口 |

## 约束与失败行为

提示词只对使用该书库工作区的会话生效；书库路径变化后重新同步。同步失败（只读目录、文件被占用等）被吞掉，不影响书库页面和阅读。用户可能手动修改管理块外的内容，下一次同步保留；管理块内的手工修改会被替换。`reader_context` 没有最近阅读、书不存在或正文不可提取时返回错误文本；目录和笔记各截断，避免一次注入整本书。写笔记仍需用户明确要求。阅读位置 context 是持久 user-role 快照：章节变化后下一轮生效，没有记录时返回空字符串，不泄漏到其他会话；会话关闭后文本保留到 LRU 淘汰。

## 验收与测试

- 正常路径：首次同步创建带管理块和阅读纪律的 `AGENTS.md`（`workspace_prompt_created_and_managed`）。
- 正常路径：再次同步只替换管理块，不重复追加，并保留用户内容（`workspace_prompt_replaces_managed_block`）。
- 正常路径：阅读位置按会话隔离，只对写入过的会话返回文本（`companion_context_is_scoped_to_session`）。
