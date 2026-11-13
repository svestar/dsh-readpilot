# 阅读感知

- **ID：** FTR-038
- **名称：** 阅读感知
- **状态：** active
- **代码：** `src/client/plugin.ts`（`ReaderPanel`）；`src/client/reader/sidebar-reader.ts`（`SidebarReader`）；`src/api/index.ts`（`setCompanionContext`、`normalizeReadingView`、`toolContext`）
- **测试：** `tests/api.test.ts`

## 行为

阅读器把当前可见范围写入会话上下文：分页模式记录 `pageStart`、`pageEnd`、`pageTotal`，滚动模式记录当前章节 `chapterIndex`、`chapterTotal`；用户有选区时同时记录选中文字（最多 4000 字）与块/字符偏移。主阅读页和侧栏阅读都会更新；侧栏没有选区时只更新页范围。

Agent 的阅读上下文系统提示会带上“查看范围：第 X–Y 页 / 共 N 页”和截断到 600 字的“用户选中：…”。`reader_context` 返回同一份 `view` 对象；没有可见范围时 `view` 为 `null`。选区只保存在 Host 内存，不写入进度或笔记文件。

## 接口与代码映射

| 入口/符号 | 位置 | 职责 |
|---|---|---|
| `setCompanionContext` | `src/api/index.ts:setCompanionContext` | 接收并保存会话的可见范围与选区 |
| `normalizeReadingView` | `src/api/contract.ts:normalizeReadingView` | 校验页范围、章节、选区与偏移并截断选区 |
| `toolContext` | `src/api/index.ts:toolContext` | 在 `reader_context` 结果中返回 `view` |
| `ReaderPanel` | `src/client/plugin.ts:ReaderPanel` | 主阅读页计算并发布可见范围/选区 |
| `SidebarReader` | `src/client/reader/sidebar-reader.ts:SidebarReader` | 侧栏阅读发布当前页范围 |

## 约束与失败行为

可见范围依赖阅读器已完成分页测量；测量前可能为空。滚动模式没有页范围，只记录章节位置。选区只来自主阅读页，侧栏视觉阅读暂不采集选区。选区超过 4000 字时截断；系统提示再截到 600 字。切换书籍、翻章或清除选区会更新或清空 `view`；Host 重启后选区不恢复。

## 验收与测试

- 正常路径：分页范围、章节、选区与偏移被规范化并从 `reader_context` 返回，超长选区截到 4000 字（`reading_view_is_normalized_and_available_from_tool_context`）。
- 正常路径：没有打开阅读界面时可按会话映射补建当前书，`reader_context` 仍能返回会话级结果（`tool_context_hydrates_session_mapping_without_opening_reader`）。
