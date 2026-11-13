# 阅读锚点

- **ID：** FTR-016
- **名称：** 阅读锚点
- **状态：** active
- **代码：** `src/client/anchor.ts`（`blocksText`、`offsetInChapter`、`contextAround`、`hashText`）；`src/client/hooks/use-notes.ts`（`useNotes`）；`src/client/notes/anchors.ts`（`findNoteOccurrence`）；`src/api/index.ts`（`saveReadingProgress`）；`src/notes/store.ts`（`validateNewNote`）
- **测试：** `tests/reading-anchor.test.ts`

## 行为

笔记除了章节、块和偏移，还记录引用前后的 `quotePrefix`/`quoteSuffix` 与章节文本 `textHash`，用于在章节内容轻微变化或重复引用时选对位置。恢复高亮时优先按偏移找，再按 quote 查找；多个候选用前后文匹配度加权，找不到时回退到偏移最近的候选。阅读进度在章节 id、标题与时间之外增加 `percent`（0–100），供跨布局恢复和最近阅读排序参考。

## 接口与代码映射

| 入口/符号 | 位置 | 职责 |
|---|---|---|
| `blocksText` | `src/client/anchor.ts:blocksText` | 与 Host 一致的块拼接文本 |
| `offsetInChapter` | `src/client/anchor.ts:offsetInChapter` | 把块内偏移换算成章节全局偏移 |
| `contextAround` | `src/client/anchor.ts:contextAround` | 截取引用前后文 |
| `hashText` | `src/client/anchor.ts:hashText` | 生成章节文本指纹 |
| `findNoteOccurrence` | `src/client/notes/anchors.ts:findNoteOccurrence` | 按 quote、偏移与前后文定位 |
| `saveReadingProgress` | `src/api/index.ts:saveReadingProgress` | 保存章节进度与百分比 |
| `validateNewNote` | `src/notes/store.ts:validateNewNote` | 接受并校验可选锚点字段 |

## 约束与失败行为

旧笔记没有前后文和 hash 时仍按原 quote + offset 工作，不需要迁移。前后文只用于候选排序，不单独决定位置；前后文不匹配时仍可能选中偏移最近的候选，不保证百分之百正确。`percent` 是章节级粗略进度，不是页内百分比；非法值被忽略，超出 0–100 被夹取。`textHash` 目前只随笔记保存，供后续校验，不阻止旧笔记恢复。

## 验收与测试

- 正常路径：块内偏移换算为章节偏移，引用前后文可稳定截取（`anchor_context_roundtrip`）。
