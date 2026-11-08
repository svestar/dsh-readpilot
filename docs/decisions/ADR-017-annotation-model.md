# ADR-017：统一批注模型

- **状态：** accepted
- **日期：** 2026-11-08
- **范围：** FTR-004、FTR-008、FTR-012、FTR-018、FTR-024、FTR-030

## 背景

现有 JSON 用 `kind:'highlight'` 与 `kind:'note'` 区分划线、短笔记：两者字段不同（划线正文在 `annotation`，笔记正文在 `note`），颜色只对划线生效，列表也分成两组。实际使用中两者只差“是否有正文”，拆分造成重复 UI、重复存储语义和 agent 工具歧义。

## 决策

1. 锚定批注统一为 `kind:'annotation'`：`note` 存正文，正文为空即划线，`color` 对带正文的批注同样生效；`annotation` 只保留书签页码。
2. 书签继续 `kind:'bookmark'`，不画正文高亮。
3. 读取旧数据时把 `note`/`highlight` 归一为 `annotation`，正文取 `note` 或 `annotation`；不主动改写旧文件，下一次编辑时写回统一结构。
4. UI 合并为“批注、书签”两组，颜色筛选对所有批注生效；`reader_note` 允许空 `note` 创建划线，并接受 `color`。
5. 导出与伴读上下文的摘要标题统一为“批注与书签”。

## 备选方案

- 保留两种 `kind`、只在 UI 合并：改动小，但 agent、导出和存储仍保留两套语义，容易再次分叉。
- 一次性迁移所有 JSON 文件：数据更干净，但需要写入迁移与回滚路径，旧客户端兼容成本更高。
- 把书签也并入批注：书签没有引文/偏移高亮语义，会让匹配与正文渲染多一层分支。

## 后果

收益：一个模型、一个列表、一个颜色能力；空正文自然表达划线；旧数据可读；工具与导出更简单。

代价：旧文件在编辑前仍保留旧 `kind`；`annotation` 字段的历史文本需在读取时合并；依赖 `kind:'highlight'` 的外部脚本需要改为 `annotation` 或继续依赖兼容归一。

验证：旧 kind 读取归一、空正文批注、颜色筛选、导出标题与工具空正文（`highlight_and_bookmark_lifecycle`、`annotation_with_empty_note_is_a_highlight`、`filter_marks_by_chapter_and_color`、`note_export_*`）。
