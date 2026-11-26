# Agent 工具

- **ID：** FTR-004
- **名称：** Agent 工具
- **状态：** active
- **代码：** `src/host/register-tools.ts`；`src/host/api.ts`；`src/host/modules/tools/prompt-map.ts`（`buildToolPromptLines`）；`src/host/types.ts`（`ToolDefinition`）；`src/host/modules/notes/files/store.ts`；`src/host/modules/notes/drafts.ts`；`src/host/modules/memory/handlers.ts`；`src/host/modules/notes/tools.ts`（`createNotesTools`）；`src/host/modules/memory/tools.ts`（`createMemoryTools`）；`src/host/modules/notes/note-file-handlers.ts`（`createNoteFileHandlers`）；`src/host/modules/notes/draft-handlers.ts`（`createDraftHandlers`）
- **测试：** `tests/tools.test.ts`；`tests/prompt.test.ts`

## 行为

Host 向 `ctx.tools` 注册十四个工具。核心工具为 `reader_books`、`reader_context`、`reader_open`、`reader_read`、`reader_search`、`reader_digest`、`reader_note`、`reader_notes`、`reader_memory`；另有五个导航/库元数据工具。工具返回 JSON；读取默认 4000、上限 8000 字符，返回 `nextOffset`、`hasMore`、`locator`。books/search 声明结构化输出。`reader_open` 目录最多 200 章，`reader_search` 默认 20 条、上限 50 条。工具结果说明、动作摘要、错误消息和 `reader_digest` 的 note 按工作区语言生成；工具 description 保持英文。核心工具地图由 `buildToolPromptLines` 从工具定义生成，只收录 `prompt.core`，动作/scope 取自 schema，无需手改提示词。

## 接口与代码映射

| 入口/符号 | 位置 | 职责 |
|---|---|---|
| `registerTools` | `src/host/register-tools.ts:registerTools` | 注册十四个工具，剥离提示词元数据 |
| `buildToolPromptLines` | `src/host/modules/tools/prompt-map.ts:buildToolPromptLines` | 从 schema 生成核心工具地图 |
| `toolContext` | `src/host/api.ts:toolContext` | 最近阅读/指定书的进度、目录、笔记摘要与最近动作 |
| `toolRead` | `src/host/api.ts:toolRead` | 计算偏移、裁剪长度、生成续读信息 |
| `toolSearch` | `src/host/api.ts:toolSearch` | 把书名解析为书 id 后调用检索 |
| `toolNote` | `src/host/api.ts:toolNote` | 解析书名/章节并读写该书的批注 |
| `memoryTool` | `src/host/modules/memory/handlers.ts:memoryTool` | 工具侧读取/更新/忘记记忆 |
| `losslessJson` | `src/host/register-tools.ts:losslessJson` | 注册前把结果归一为无损 JSON |

## 约束与失败行为

工具依赖已配置书库；找不到书或未知操作时抛出错误，由宿主标记为工具失败。`reader_notes` 自动应用失败时的 `error` 是草稿结果字段，不是工具失败。读取上限会被强制收敛，避免一次塞入整章。全库检索最多解析 20 本书，结果带 `booksScanned`/`booksTotal`；截断或解析失败分别标记 `truncated`/`unreadable`。`reader_notes` 的 index/read 只读，create/write/append 默认只生成草稿；自动应用开启时直接应用，仍校验 `baseHash` 并写历史。`reader_read`、`reader_search`、`reader_context` 的结果带 `jumpUrl`，供伴读生成可点击的原文链接（见 [FTR-026](FTR-026-chat-jump.md)）；`reader_digest` 只返回摘录，需要细节时用 `reader_read`。`reader_memory` 默认关闭（`off`），关闭时更新返回 `memory-off`；开启后只记录长期有效的偏好与结论，每卡上限 600 字，超限返回 `memory-too-large` 要求先压缩。`reader_note` 按明确要求写批注。工具结果在返回前归一为无损 JSON：丢弃 `undefined` 字段，非有限数与 `-0` 分别转成 `null` 与 `0`，否则 DSH 会以 invalid output 拒绝整次调用。

## 验收与测试

- 正常路径：工具列表包含十四个工具，`reader_digest` 返回章节与摘录；空书库下 index 返回空、memory read 返回默认 `off`；`reader_read` 在 `limit` 为 300 时只返回 300 字符，并给出 `hasMore` 与带章节 id 的定位符；books/search 声明输出字段；找不到书与未知操作抛出错误（`tools_read_bounded`）。
- 边界：工具结果丢弃 `undefined`，数组中的空位转 `null`，可无损 JSON 往返（`tool_values_are_lossless_json`）。
- 正常路径：英文工作区工具说明与摘要为英文（`tools_use_workspace_language`）。
- 正常路径：核心工具地图由 schema 生成，覆盖核心工具并排除非核心工具（`tool_prompt_map_is_derived_from_schema`、`reading_prompt_tool_map_covers_core_tools`）。
