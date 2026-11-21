# 工作区侧边栏阅读

- **ID：** FTR-035
- **名称：** 工作区侧边栏阅读
- **状态：** active
- **代码：** `src/client/modules/sidebar/SidebarReaderView.ts`；`src/client/modules/sidebar/use-sidebar-reader.ts`（`useSidebarReader`）；`src/client/modules/sidebar/use-sidebar-resource.ts`（`useSidebarResource`）；`src/client/modules/reader/resource.ts`；`src/client/modules/reader/SelectionNote.ts`；`src/client/plugin.ts`；`src/host/api.ts`；`src/host/lib/fs-json.ts`；`src/client/modules/reader/use-text-pager.ts`；`src/client/modules/reader/use-visual.ts`
- **测试：** `tests/api-library.test.ts`；`tests/api-reading.test.ts`；`tests/api-notes.test.ts`；`tests/api-companion.test.ts`；`tests/paging.test.ts`；`tests/client-assembly.test.ts`；`tests/progress-sync.test.ts`；`tests/sidebar-reader.test.ts`；`tests/reader-resource.test.ts`

## 行为

工作区对话右侧栏引导页提供“阅读”入口，按当前会话反查关联书籍；无关联书显示空状态。有书时提供两种模式：

- 文字：所有格式都走文本重排，复用分页、图片与表格渲染。
- 原版：EPUB 显示原书 iframe，PDF 显示页面位图；TXT/Markdown 没有原版。PDF 翻页会同步当前章节，但章节更新不会把视觉页重置回章首。

阅读器保存与主阅读相同的进度（章节 id、`chapterFraction`、百分比），打开时按比例恢复；模式切换先生成锚点。侧栏按资源打开时沿用该书的会话翻译开关，主区从书库打开时清除，二者不同步。侧栏写入进度后广播同步事件，主阅读按同一比例重新定位；重新可见时重读 Host 进度，不在同屏持续联动。Tab 类型声明 `dsh-resource://dsh-readpilot/**`；工具卡或外部调用用 `openResource` 打开地址，优先按地址定位，否则按会话反查。侧栏文字模式带 `blockIndex`/`blockOffset` 打开时，渲染后按目标块文本比例定位；块未出现时保留并重试，切到原版时清除。

## 接口与代码映射

| 入口/符号 | 位置 | 职责 |
|---|---|---|
| `SidebarReader` | `src/client/modules/sidebar/SidebarReaderView.ts:SidebarReader` | 侧栏单页阅读器 |
| `prefillCompanionQuote` | `src/client/modules/sidebar/navigation.ts:prefillCompanionQuote` | 选段写入会话输入框 |
| `apply` | `src/client/plugin.ts:apply` | 注册 `dsh-readpilot` Tab 类型与正文席位 |
| `sessionBook` | `src/host/api.ts:sessionBook` | 会话反查书籍与进度 |
| `parseReaderResource` / `buildReaderResource` | `src/client/modules/reader/resource.ts:parseReaderResource`；`buildReaderResource` | 解析/生成阅读地址 |
| `saveReadingProgress` | `src/host/api.ts:saveReadingProgress` | 写入章节内比例 |
| `useTextPager` / `useVisual` | `src/client/modules/reader/use-text-pager.ts:useTextPager` | 文字与原版单页渲染 |

## 约束与失败行为

侧栏固定单页，无阅读设置。原版仅 EPUB/PDF 可用；TXT/Markdown 强制文字。“问伴读”优先用宿主 `inputActions.insertQuote`，否则写 `> …` 草稿。划线/批注复用主阅读存储。反查多本书时取最近更新；会话归档、书籍移出或未配置时显示空状态。原版与文字重排仅按比例近似对应。

## 验收与测试

- 正常路径：会话到书籍的反向映射返回同一本书，未知会话返回空（`session_book_reverses_companion_mapping`）。
- 正常路径：进度保存章节内比例，重新打开可按比例恢复（`progress_percent_persists`、`anchor_page_restores_fraction`）。
- 正常路径：插件注册 `dsh-readpilot` 侧栏 Tab 类型与“阅读”引导入口（`client_assembly_registers_sidebar_reader_tab`）。
- 正常路径：侧栏进度事件只接受含书、章节、比例、来源的载荷（`progress_sync_reads_only_well_formed_sidebar_events`）。
- 正常路径：PDF 翻页的章节更新保留当前视觉页，换书才重置（`sidebar_pdf_visual_keeps_current_page_when_chapter_updates`）。
- 正常路径：“问伴读”优先插入原生引用节点，否则退回 `> …` 草稿（`sidebar_companion_quote_uses_native_quote_insertion`、`sidebar_companion_quote_falls_back_to_the_draft`）。
- 正常路径：资源地址可往返生成/解析书、章节与偏移，其他 origin 返回 null（`reader_resource_roundtrips_book_chapter_offset`）。
- 正常路径：待跳转块渲染后按块文本比例定位，块未出现时等待（`sidebar_pending_block_jumps_with_rendered_text_fraction`、`sidebar_pending_block_waits_until_the_block_exists`）。
