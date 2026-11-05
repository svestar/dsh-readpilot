# 键盘快捷键

- **ID：** FTR-029
- **名称：** 键盘快捷键
- **状态：** active
- **代码：** `src/client/shortcuts.ts`（`readerShortcut`）；`src/client/plugin.ts`（`ReaderPanel`）
- **测试：** `tests/shortcuts.test.ts`

## 行为

阅读页获得焦点时支持键盘操作。上一页/下一页：← / →、PageUp / PageDown、空格；`f` 或 Ctrl/Cmd+F 打开书内搜索；`b` 在当前阅读位置加书签；Esc 优先关闭搜索，没有搜索时清除选段工具条。翻页键只在分页模式生效：PDF 与分页 EPUB 翻页，滚动模式交给浏览器原生滚动；TXT/Markdown 只有分页模式响应。快捷键作用于当前书籍与当前章节，不改变阅读模式或配色。

## 接口与代码映射

| 入口/符号 | 位置 | 职责 |
|---|---|---|
| `readerShortcut` | `src/client/shortcuts.ts:readerShortcut` | 把按键与上下文映射为阅读动作，过滤输入态与修饰键 |
| `ReaderPanel` | `src/client/plugin.ts:ReaderPanel` | 监听 keydown，分派翻页、搜索、书签与 Esc |

## 约束与失败行为

焦点在 `input`、`textarea`、`select` 或 `contenteditable` 时不触发任何快捷键，避免与搜索框、笔记编辑冲突。Alt 与 Ctrl/Cmd 组合默认忽略，只保留 Ctrl/Cmd+F；输入法组合期间不响应。滚动阅读模式下 ← / → / PageUp / PageDown 不拦截。书签写入沿用笔记规则，失败时由笔记层提示，不阻断按键。搜索打开后快捷键不抢占焦点，Esc 只关闭搜索而不退出阅读页。

## 验收与测试

- 正常路径：翻页、搜索、书签与 Esc 的优先级映射正确（`reader_shortcuts_map_keys`）。
- 边界：输入态、修饰键、输入法组合与滚动模式下不触发（`reader_shortcuts_ignore_typing_and_modifiers`）。
