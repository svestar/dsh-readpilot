# 跨模式划线锚点

- **ID：** FTR-040
- **名称：** 跨模式划线锚点
- **状态：** active
- **代码：** `src/notes.ts`（`NoteRecord.start`、`end`、`blockHash`）；`src/api-notes.ts`（`handleNotes`）；`src/client/notes/anchors.ts`（`findNoteOccurrence`）；`src/client/anchor.ts`（`hashText`）；`src/client/hooks/use-notes.ts`（`useNotes`）；`src/client/notes/anchors.ts`（`compactAnchorText`、`applyEpubNoteMarks`）
- **测试：** `tests/anchor.test.ts`；`tests/notes.test.ts`

## 行为

保存划线时同时记录章节规范文本偏移 `start`/`end`、块索引/块内偏移、块哈希与引文上下文。渲染时优先用规范偏移找最近命中，其次用精确引文，再用空白归一化后的引文；文本阅读器在引文完全找不到时可用块哈希回退到整个段落。PDF 原版与 EPUB 原版仍按各自当前渲染文本做归一化匹配，再把命中位置换算成页面矩形或 iframe Range。

旧笔记没有 `start`/`end` 时继续用原有偏移与 quote 匹配，不需要迁移即可继续显示。

## 接口与代码映射

| 入口/符号 | 位置 | 职责 |
|---|---|---|
| `NoteRecord.start` / `end` / `blockHash` | `src/notes.ts:NoteRecord` | 保存规范偏移与段落哈希 |
| `handleNotes` | `src/api-notes.ts:handleNotes` | 透传锚点字段并持久化 |
| `findNoteOccurrence` | `src/client/notes/anchors.ts:findNoteOccurrence` | 精确偏移、前缀后缀与空白归一化匹配 |
| `hashText` | `src/client/anchor.ts:hashText` | 段落哈希兜底 |
| `useNotes` | `src/client/hooks/use-notes.ts:useNotes` | 生成锚点、overlay 高亮与块回退 |

## 约束与失败行为

规范偏移是章节文本坐标，不是屏幕或 PDF 页坐标。PDF 原版和 EPUB 原版仍依赖当前渲染文本，若该段文字在原版被隐藏、过滤或与重排文本差异过大，仍可能只在一侧显示；此时笔记保留，高亮不出现，不伪造位置。跨页引文在 PDF 单页文本层中无法完整匹配。块哈希回退只对带 `data-block-index` 的文本块生效，PDF/EPUB 原版的原生 DOM 不使用该回退。

## 验收与测试

- 正常路径：精确引文失败时按去空白文本命中，范围仍映射回原文（`note_occurrence_falls_back_to_whitespace_normalized_text`）。
- 正常路径：重复引文用前缀与 preferred 偏移选最近的一条（`note_occurrence_uses_prefix_and_preferred_offset_for_duplicates`）。
- 正常路径：`start`、`end`、`blockHash` 写入笔记并重新读出（`canonical_anchor_fields_persist`）。
