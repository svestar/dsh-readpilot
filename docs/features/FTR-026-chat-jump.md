# 对话页码跳转

- **ID：** FTR-026
- **名称：** 对话页码跳转
- **状态：** active
- **代码：**`src/shared/jump-url.ts`（`buildReaderJumpUrl`、`parseReaderJumpUrl`）；`src/host/api.ts`（`toolOpen`、`toolRead`、`toolSearch`、`toolContext`）；`src/shared/contracts/search.ts`（`jumpUrl`）；`src/client/modules/reader/page-jump.ts`（`findPageReferences`、`linkifyPageReferences`）；`src/client/modules/companion/ChatPanel.ts`（`ChatPanel` 页码自动链接）；`src/client/modules/reader/use-chat-jump.ts`（`useChatJump`）；`src/client/modules/sidebar/navigation.ts`（`chapterFractionForOffset`）；`src/client/modules/reader/ReaderPanelView.ts`（`ReaderPanelView`）
- **测试：** `tests/chat-jump.test.ts`；`tests/sidebar-reader.test.ts`

## 行为

PDF 对话由客户端自动识别页码：`ChatPanel` 在聊天 DOM 中识别“PDF 148–150 页”“第 148 页”等页码文本，把整个页码范围包成可点击按钮，点击跳到起始页最近的 TOC 章节；已经位于链接内的文本不重复处理。原生会话和折叠聊天都适用。

页码统一指阅读器当前显示的 **PDF 页序号**，不是书内印刷页码或目录页码；提示词要求伴读回答时也使用我们的页码，TOC 的 `page` 字段同义。

阅读工具的 `reader_open`、`reader_read`、`reader_search`、`reader_context` 结果仍保留 `jumpUrl`，`src/shared/jump-url.ts` 与 `useChatJump` 的解析能力也保留：如果历史消息或手工消息里已有 `https://dsh-readpilot.invalid/jump?...` 链接，客户端仍会拦截并跳转。提示词不再要求模型生成这些链接，自动页码按钮不依赖它们。

客户端在 document 捕获阶段拦截指向该地址的 `<a>`，解析 book/chapter/offset/q；当前书内直接调用 `selectChapter(..., { offset, flash: true })` 跳转并高亮。没有 offset 而带 q 时，先在本书检索并要求命中同一章节；找不到则显示错误。窄屏跳转后收起伴读抽屉，宽屏保留伴读栏。主/侧栏阅读都挂载 `useChatJump`；侧栏把 offset 映射为章节文本比例写入阅读锚点，窄屏收起动作为 no-op。目标书不是当前书时，通过 `openOtherBook` 生成 `dsh-resource://` 地址并打开侧栏阅读器；没有任何阅读器挂载时，插件根部的全局捕获处理器用同一资源地址打开侧栏，历史链接也能点击。工具结果卡的“跳转”也走同一路由：目标书是主阅读当前书时跳主阅读，否则打开侧栏。

## 接口与代码映射

| 入口/符号 | 位置 | 职责 |
|---|---|---|
| `buildReaderJumpUrl` / `parseReaderJumpUrl` | `src/shared/jump-url.ts:buildReaderJumpUrl`；`src/shared/jump-url.ts:parseReaderJumpUrl` | 生成/校验带 book/chapter/offset/q 的引用链接 |
| `toolOpen` / `toolRead` / `toolSearch` / `toolContext` | `src/host/api.ts:toolOpen`；`src/host/api.ts:toolRead`；`src/host/api.ts:toolSearch`；`src/host/api.ts:toolContext` | 在目录、章节与搜索匹配中返回 `jumpUrl`（搜索匹配精确到 offset） |
| `useChatJump` | `src/client/modules/reader/use-chat-jump.ts:useChatJump` | 拦截链接、q 检索、章节定位与窄屏收起 |
| `findPageReferences` / `linkifyPageReferences` | `src/client/modules/reader/page-jump.ts:findPageReferences`；`src/client/modules/reader/page-jump.ts:linkifyPageReferences` | 识别 PDF 页码范围并包装为起始页按钮 |
| `ChatPanel` | `src/client/modules/companion/ChatPanel.ts:ChatPanel` | 错误展示、聊天 DOM 观察与自动页码链接 |

## 约束与失败行为

`jumpUrl` 只接受固定 origin 与 `/jump` 路径；book/chapter 必填，offset 只接受非负整数，q 原样 URL 解码。提示词不再要求模型生成链接；已有结构化链接仍按当前书解析，q 检索为字面量、大小写不敏感，且必须命中同一章节，转述/翻译通常不命中。无匹配显示“没有在书中找到这段文字”，检索或跳转异常显示错误，不修改阅读位置、笔记或对话。涉及页码范围时只使用起始页，不使用书内印刷页码。

普通对话文本不注册点击跳转；PDF 页码文本由客户端自动包装为起始页链接，其他文本只有在已有结构化链接时才可点。PDF 跳到起始页最近的目录章节，EPUB 跳到对应章节；偏移由现有分页/锚点逻辑处理。该功能不产生新的持久化数据。

## 验收与测试

- 正常：链接生成/解析保留 book、chapter、offset、q，并拒绝非目标 origin（`reader_jump_url_roundtrip_and_validation`）。
- 正常：PDF 页码范围可被识别为起始页按钮，普通章节号不误识别（`page_references_find_ranges_and_single_pages`）。
- 边界：侧栏把章节文本 offset 映射为 0–1 的阅读比例，空章节返回 null（`sidebar_chapter_offset_maps_to_reading_fraction`）。
