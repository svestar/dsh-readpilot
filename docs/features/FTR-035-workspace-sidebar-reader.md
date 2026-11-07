# 工作区侧边栏阅读

- **ID：** FTR-035
- **名称：** 工作区侧边栏阅读
- **状态：** active
- **代码：** `src/client/views/sidebar-reader.ts`（`SidebarReader`）；`src/client/plugin.ts`（`apply`）；`src/api.ts`（`sessionBook`、`saveReadingProgress`）；`src/store.ts`（`ReadingProgress.chapterFraction`）；`src/client/hooks/use-text-pager.ts`（`useTextPager`）；`src/client/hooks/use-visual.ts`（`useVisual`）
- **测试：** `tests/api.test.ts`；`tests/paging.test.ts`；`tests/client-assembly.test.ts`；`tests/progress-sync.test.ts`

## 行为

工作区对话右侧栏的引导页提供“阅读”入口。打开后按当前会话反查关联书籍；没有关联书时显示空状态。有书时提供“文字”和“原版”两种模式，都固定单页：

- 文字：所有格式都走文本重排，复用分页、图片与表格渲染。
- 原版：EPUB 显示原书 iframe，PDF 显示页面位图；TXT/Markdown 没有原版。

阅读器保存与主阅读相同的书籍进度：章节 id、章节内比例 `chapterFraction` 和全书百分比。打开时按 `chapterFraction` 恢复到同一章节位置；模式切换也先生成锚点。侧边栏翻页并成功写入进度后广播一次同步事件；主阅读收到后按同一章节比例重新定位，因此从工作区回到阅读页会跟随最新位置。不做同屏持续联动。

## 接口与代码映射

| 入口/符号 | 位置 | 职责 |
|---|---|---|
| `SidebarReader` | `src/client/views/sidebar-reader.ts:SidebarReader` | 侧边栏单页阅读器与两种模式 |
| `apply` | `src/client/plugin.ts:apply` | 注册 `dsh-readpilot` Tab 类型与正文席位 |
| `sessionBook` | `src/api.ts:sessionBook` | 由当前会话反查关联书籍与进度 |
| `saveReadingProgress` | `src/api.ts:saveReadingProgress` | 写入章节内比例 |
| `ReadingProgress.chapterFraction` | `src/store.ts:ReadingProgress` | 跨视图的规范位置 |
| `useTextPager` / `useVisual` | `src/client/hooks/use-text-pager.ts:useTextPager` | 文字与原版单页渲染 |

## 约束与失败行为

侧边栏只提供单页，不显示单/双页或阅读设置。原版只对 EPUB/PDF 可用；TXT/Markdown 强制文字。它不提供划线、批注、伴读、目录或搜索。反查同一会话对应多本书时取最近更新的一本；会话已归档、书籍已移出书库或未配置时显示空状态。原版 PDF/EPUB 与文字重排只按章节比例近似对应，不保证像素或页码一致。没有同屏实时同步，避免两个视图互相拉跳。

## 验收与测试

- 正常路径：会话到书籍的反向映射返回同一本书，未知会话返回空（`session_book_reverses_companion_mapping`）。
- 正常路径：进度保存章节内比例，重新打开可按比例恢复（`progress_percent_persists`、`anchor_page_restores_fraction`）。
- 正常路径：插件注册 `dsh-readpilot` 侧栏 Tab 类型与“阅读”引导入口（`client_assembly_registers_sidebar_reader_tab`）。
- 正常路径：侧边栏进度事件只接受带书、章节、比例与来源的合法载荷（`progress_sync_reads_only_well_formed_sidebar_events`）。
