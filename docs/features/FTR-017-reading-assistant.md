# 阅读助手

- **ID：** FTR-017
- **名称：** 阅读助手
- **状态：** active
- **代码：** `src/workspace-prompt.js`（`READING_PROMPT`、`ensureWorkspacePrompt`）；`src/api.js`（`state`、`toolContext`）；`src/library.js`（扫描跳过 `AGENTS.md`）；`src/tools.js`（`reader_context`）
- **测试：** `tests/prompt.test.js`

## 行为

阅读助手纪律写入**书库工作区根目录的 `AGENTS.md`**，由 DSH 作为该工作区的指令加载，而不是全局系统提示词。Host 启动和书库状态加载时同步；内容放在 `<!-- dsh-reader:prompt:begin -->` 与 `<!-- dsh-reader:prompt:end -->` 管理块中：文件不存在时创建；已有用户内容时保留并在末尾追加；重复同步只替换管理块，不重复追加。书库扫描跳过根目录/子目录的 `AGENTS.md`，不会把提示词文件当成 Markdown 书籍。

`reader_context` 是只读工具：不传书时按 `progress.updatedAt` 返回最近阅读的书；传 `book` 时返回指定书的元数据、进度、前 60 条目录和最近 10 条笔记。现有 `reader_books`、`reader_open`、`reader_read`、`reader_search`、`reader_note` 保持不变。

## 接口与代码映射

| 入口/符号 | 位置 | 职责 |
|---|---|---|
| `READING_PROMPT` | `src/workspace-prompt.js:READING_PROMPT` | 阅读助手纪律文本 |
| `ensureWorkspacePrompt` | `src/workspace-prompt.js:ensureWorkspacePrompt` | 创建/更新书库 `AGENTS.md` 管理块 |
| `state` | `src/api.js:state` | 首次加载书库时同步提示词文件 |
| `toolContext` | `src/api.js:toolContext` | 当前书、进度、目录与最近笔记 |
| `reader_context` | `src/tools.js:reader_context` | Agent 只读入口 |

## 约束与失败行为

提示词只对使用该书库工作区的会话生效；书库路径变化后重新同步。同步失败（只读目录、文件被占用等）被吞掉，不影响书库页面和阅读。用户可能手动修改管理块外的内容，下一次同步保留；管理块内的手工修改会被替换。`reader_context` 没有最近阅读、书不存在或正文不可提取时返回错误文本；目录和笔记各截断，避免一次注入整本书。写笔记仍需用户明确要求。

## 验收与测试

- 正常路径：首次同步创建带管理块和阅读纪律的 `AGENTS.md`（`workspace_prompt_created_and_managed`）。
- 正常路径：再次同步只替换管理块，不重复追加，并保留用户内容（`workspace_prompt_replaces_managed_block`）。
