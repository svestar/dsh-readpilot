# Agent 工具

- **ID：** FTR-004
- **名称：** Agent 工具
- **状态：** active
- **代码：** `src/tools.ts`（`registerTools`）；`src/api.ts`（`toolBooks`、`toolOpen`、`toolContext`、`toolRead`、`toolSearch`、`toolNote`）
- **测试：** `tests/tools.test.ts`

## 行为

Host 插件向 `ctx.tools` 注册六个全局工具：`reader_books` 列出书库与进度；`reader_context` 返回当前/最近阅读的书、进度、目录与最近笔记；`reader_open` 按 id 或标题打开书籍并返回目录；`reader_read` 按章节 id 或标题读取一段文本；`reader_search` 做书内或全库字面量检索；`reader_note` 按书新增或列出笔记。工具返回 JSON 文本；读取默认 4000 字符、上限 8000，返回 `nextOffset`、`hasMore` 与 `locator`，模型可据此续读和引用。`reader_open` 的目录最多返回 200 章，`reader_search` 默认 20 条、上限 50 条；`reader_note` 的 add 需要书名、章节、引用原文与笔记正文。

## 接口与代码映射

| 入口/符号 | 位置 | 职责 |
|---|---|---|
| `registerTools` | `src/tools.ts:registerTools` | 注册六个工具并返回统一卸载函数 |
| `toolContext` | `src/api.ts:toolContext` | 最近阅读/指定书的进度、目录与笔记摘要 |
| `toolRead` | `src/api.ts:toolRead` | 计算偏移、裁剪长度、生成续读信息 |
| `toolSearch` | `src/api.ts:toolSearch` | 把书名解析为书 id 后调用检索 |
| `toolNote` | `src/api.ts:toolNote` | 解析书名/章节并读写该书的笔记 |

## 约束与失败行为

工具依赖用户已配置书库；找不到书时返回 `{ error }`，不抛到工具层。读取上限会被强制收敛，避免一次把整章塞进上下文。全库检索最多解析 20 本书，超过上限的结果以 `truncated` 标记。除 `reader_note` 写入笔记外，其余工具只读，不修改书籍、进度或会话映射。

## 验收与测试

- 正常路径：`reader_read` 在 `limit` 为 300 时只返回 300 字符，并给出 `hasMore` 与带章节 id 的定位符（`tools_read_bounded`）。
