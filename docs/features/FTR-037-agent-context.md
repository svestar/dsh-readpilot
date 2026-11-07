# Agent 阅读上下文

- **ID：** FTR-037
- **名称：** Agent 阅读上下文
- **状态：** active
- **代码：** `src/tools.ts`（`registerTools`）；`src/api.ts`（`toolContext`、`setCompanionContext`）；`src/client/views/sidebar-reader.ts`（`SidebarReader`）；`src/client/plugin.ts`（`ReaderPanel`）
- **测试：** `tests/api.test.ts`

## 行为

阅读工具在 Host 全局注册，工作区对话和伴读对话使用同一套工具。带 `book` 参数的工具（`reader_open`、`reader_read`、`reader_search`、`reader_note`、`reader_notes`、`reader_memory`）直接按参数工作，不依赖当前界面。

`reader_context` 省略 `book` 时优先使用当前工具调用所属会话的伴读阅读上下文；没有会话上下文时才回退到最近阅读进度。主阅读页和工作区侧栏都会把当前书、书标题和章节写入会话上下文，因此 Agent 的阅读上下文、笔记上下文和记忆上下文按会话取到同一本书。

## 接口与代码映射

| 入口/符号 | 位置 | 职责 |
|---|---|---|
| `registerTools` | `src/tools.ts:registerTools` | 注册全局阅读工具并把调用会话传给上下文查询 |
| `toolContext` | `src/api.ts:toolContext` | 按会话阅读上下文选择当前书 |
| `setCompanionContext` | `src/api.ts:setCompanionContext` | 写入会话的书、标题与章节上下文 |
| `SidebarReader` | `src/client/views/sidebar-reader.ts:SidebarReader` | 侧栏阅读时同步会话上下文 |
| `ReaderPanel` | `src/client/plugin.ts:ReaderPanel` | 主阅读时同步会话上下文 |

## 约束与失败行为

工具可用不等于界面即时刷新：`reader_note` 写入短笔记，但已打开的笔记面板不会自动重读；`reader_notes` 的写操作只创建待确认草稿，必须在笔记面板应用；`reader_memory` 默认关闭，只有开启后才能写入。没有会话阅读上下文且没有阅读进度时，`reader_context()` 返回无当前书错误。工作区普通对话如果没有关联书籍，工具仍可凭显式 `book` 参数访问书库。

## 验收与测试

- 正常路径：同一会话已记录阅读上下文时，省略 `book` 的 `reader_context` 优先返回该会话的书，而不是最近阅读的另一本书（`tool_context_prefers_session_reading_over_latest_progress`）。
