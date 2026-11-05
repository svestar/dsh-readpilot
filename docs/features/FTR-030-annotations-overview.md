# 批注总览

- **ID：** FTR-030
- **名称：** 批注总览
- **状态：** active
- **代码：** `src/client/mark-filters.ts`（`filterMarks`、`markChapterIds`、`markColors`）；`src/client/views/notes-search.ts`（`NotesBody`）；`src/client/hooks/use-notes.ts`（`openNote`）
- **测试：** `tests/mark-filters.test.ts`

## 行为

笔记页集中列出当前书的划线、短笔记与书签。顶部提供章节下拉与颜色圆点两组筛选：章节选项只来自实际含有标记的章节，并按目录顺序排列；颜色选项只来自已被划线使用的颜色。两组筛选可组合，计数显示“筛选结果 / 全部”，无匹配时显示空状态。点击任意标记条目跳回原文位置：PDF 按页、EPUB 在 iframe 内定位、文本按章节与偏移；每行仍保留跳转与删除按钮。

## 接口与代码映射

| 入口/符号 | 位置 | 职责 |
|---|---|---|
| `filterMarks` | `src/client/mark-filters.ts:filterMarks` | 按章节与颜色过滤标记，空筛选返回全部 |
| `markChapterIds` | `src/client/mark-filters.ts:markChapterIds` | 收集有标记的章节 id，保持首次出现顺序 |
| `markColors` | `src/client/mark-filters.ts:markColors` | 收集划线使用的颜色，按调色板顺序 |
| `NotesBody` | `src/client/views/notes-search.ts:NotesBody` | 筛选栏、计数、分组列表与空状态 |
| `openNote` | `src/client/hooks/use-notes.ts:openNote` | 点击条目跳回原文并高亮 |

## 约束与失败行为

颜色筛选只对划线生效：短笔记与书签没有颜色，选中颜色后它们不显示。章节筛选只列出确有标记的章节，未读章节不会出现在下拉里；标记所在章节不在目录中时以章节 id 兜底显示。筛选是纯客户端视图状态，不写盘、不改动标记顺序与总数，刷新或重新打开笔记页会回到“全部”。删除标记后计数与选项立即更新；删除失败由笔记层提示，筛选状态不变。跳转沿用各格式已有的定位逻辑，失败时提示“没有在书中找到”，不改变筛选。

## 验收与测试

- 正常路径/边界：章节与颜色单独及组合过滤，未着色划线按黄色处理（`filter_marks_by_chapter_and_color`）。
- 正常路径：章节顺序与颜色选项按数据和调色板顺序生成（`mark_filter_options`）。
