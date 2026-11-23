# 工作区侧边栏阅读

- **ID：** FTR-035
- **名称：** 工作区侧边栏阅读
- **状态：** active
- **代码：** `src/client/modules/sidebar/SidebarReaderView.ts`；`src/client/modules/sidebar/use-sidebar-reader.ts`（`useSidebarReader`）；`src/client/modules/sidebar/use-sidebar-resource.ts`（`useSidebarResource`）；`src/client/modules/sidebar/navigation.ts`（`prefillCompanionQuote`、`tocUsesPages`）；`src/client/modules/translation/session-state.ts`（`translationEnabledForBook`）；`src/client/modules/reader/resource.ts`；`src/client/modules/reader/SelectionNote.ts`；`src/client/plugin.ts`；`src/host/api.ts`；`src/host/lib/fs-json.ts`；`src/client/modules/reader/use-text-pager.ts`；`src/client/modules/reader/use-visual.ts`
- **测试：** `tests/api-library.test.ts`；`tests/api-reading.test.ts`；`tests/api-notes.test.ts`；`tests/api-companion.test.ts`；`tests/paging.test.ts`；`tests/client-assembly.test.ts`；`tests/progress-sync.test.ts`；`tests/sidebar-reader.test.ts`；`tests/reader-resource.test.ts`

## 行为

工作区对话右侧栏引导页提供“阅读”入口，按当前会话反查关联书籍；无关联书显示空状态。有书时提供两种模式：

- 文字：所有格式都走文本重排，复用分页、图片与表格渲染。
- 原版：EPUB 原书 iframe，PDF 页面位图；TXT/Markdown 无原版。PDF 翻页同步章节，章节更新不重置视觉页。

阅读器保存与主阅读同进度（章节 id、`chapterFraction`、百分比），打开按比例恢复；模式切换先生成锚点。侧栏按资源沿用会话翻译开关，主区从书库清除。侧栏写入进度后广播同步，主阅读重定位。顶栏“目录”按钮在正文区上方悬浮覆盖主阅读目录（`Toc`），不改变阅读排版；文字重排按章节跳转，PDF 原版与扫描版按页跳转，再点按钮或点遮罩关闭。Tab 类型声明 `dsh-resource://dsh-readpilot/**`；工具卡或外部用 `openResource` 打开地址，优先按地址。批注块内定位见 [FTR-055](FTR-055-sidebar-note-locate.md)。

## 接口与代码映射

| 入口/符号 | 位置 | 职责 |
|---|---|---|
| `SidebarReader` | `src/client/modules/sidebar/SidebarReaderView.ts:SidebarReader` | 侧栏阅读器 |
| `prefillCompanionQuote` | `src/client/modules/sidebar/navigation.ts:prefillCompanionQuote` | 选段写入会话输入框 |
| `apply` | `src/client/plugin.ts:apply` | 注册 `dsh-readpilot` Tab 类型与正文席位 |
| `translationEnabledForBook` | `src/client/modules/translation/session-state.ts:translationEnabledForBook` | 沿用会话翻译开关（FTR-053） |
| `parseReaderResource` / `buildReaderResource` | `src/client/modules/reader/resource.ts:parseReaderResource`；`buildReaderResource` | 解析/生成阅读地址 |

## 约束与失败行为

侧栏单页。原版仅 EPUB/PDF；TXT/Markdown 强制文字。“问伴读”优先用 `inputActions.insertQuote`。划线/批注复用主存储。反查最近；归档、移出或未配置为空。原版与重排近似。

## 验收与测试

- 正常路径：会话到书籍的反向映射返回同一本书，未知会话返回空（`session_book_reverses_companion_mapping`）。
- 正常路径：进度保存章节内比例，重新打开可按比例恢复（`progress_percent_persists`、`anchor_page_restores_fraction`）。
- 正常路径：插件注册 `dsh-readpilot` 侧栏 Tab 类型与“阅读”引导入口（`client_assembly_registers_sidebar_reader_tab`）。
- 正常路径：侧栏进度事件只接受含书、章节、比例、来源的载荷（`progress_sync_reads_only_well_formed_sidebar_events`）。
- 正常路径：PDF 翻页的章节更新保留当前视觉页，换书才重置（`sidebar_pdf_visual_keeps_current_page_when_chapter_updates`）。
- 正常路径：PDF 原版与扫描版目录按页跳转，文本重排按章节（`sidebar_toc_uses_pages_for_pdf_original`）。
- 正常路径：“问伴读”优先插入原生引用节点，否则退回 `> …` 草稿（`sidebar_companion_quote_uses_native_quote_insertion`、`sidebar_companion_quote_falls_back_to_the_draft`）。
- 正常路径：资源地址可往返生成/解析书、章节与偏移，其他 origin 返回 null（`reader_resource_roundtrips_book_chapter_offset`）。
