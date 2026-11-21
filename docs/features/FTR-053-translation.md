# 翻译

- **ID：** FTR-053
- **名称：** 翻译
- **状态：** active
- **代码：** `src/shared/contracts/translation.ts`；`src/host/modules/translation/service.ts`（`createTranslationService`）；`src/host/modules/translation/providers.ts`；`src/host/modules/translation/store.ts`；`src/host/api.ts`（`translationProviders`、`translate`）；`src/client/modules/translation/use-reader-translation.ts`（`useReaderTranslation`）；`src/client/modules/translation/blocks.ts`（`translationBlocksOf`）；`src/client/modules/translation/TranslationControl.ts`（`TranslationControl`）；`src/client/modules/translation/TranslationCard.ts`；`src/client/modules/markdown/render.ts`（`renderBlocksWithTranslations`）；`src/client/modules/reader/ReaderBodyView.ts`；`src/client/modules/sidebar/SidebarReaderView.ts`；`src/client/modules/reader/SelectionNote.ts`
- **测试：** `tests/translation.test.ts`

## 行为

翻译使用 DSH Host 的 `translator` 服务，不经过伴读 Agent，也不写入伴读会话。Host 未挂载 `translator` 时，Google/Bing 直接使用匿名 HTTP fallback；付费 DeepSeek 源仍需要宿主 `translator`。

阅读栏提供“译”开关和一个小设置浮层（目标语言、翻译源、隐私提示、清除缓存）。打开书籍时默认关闭，切走再回来保持。主区/侧边栏都支持；翻页过快时旧页结果丢弃；跨章向前翻页回上一章末页，翻译分页落定后再开始。打开后，重排阅读（文本、Markdown、EPUB 重排、PDF 重排）翻译当前可见块，译文追加在对应段落后；滚动或翻页后继续翻译新出现的块。原文、`data-block-index`、选区和划线锚点不变，译文节点只带 `data-translation-index`。

选区工具栏的“翻译”仍可单独使用：点击后在选区附近弹出译文卡片，显示原文、译文、翻译源和缓存状态。PDF 原版和 EPUB 原版不插入正文，只提供选区翻译卡片。

译文按 provider、源语言、目标语言和源文本哈希缓存在 `$DSH_HOME/dsh-readpilot/translations.json`，最多 3000 条；设置浮层的“清除缓存”清空全部缓存。

## 接口与代码映射

| 入口/符号 | 位置 | 职责 |
|---|---|---|
| `createTranslationService` | `src/host/modules/translation/service.ts:createTranslationService` | 包装 translator/匿名 fallback、批量与缓存 |
| `anonymousTranslate` | `src/host/modules/translation/providers.ts:anonymousTranslate` | 未挂载 translator 时的 Bing/Google 请求 |
| `createTranslationCache` | `src/host/modules/translation/store.ts:createTranslationCache` | 持久化译文与哈希键 |
| `useReaderTranslation` | `src/client/modules/translation/use-reader-translation.ts:useReaderTranslation` | 双语开关、章节译文、选区翻译与设置 |
| `translationBlocksOf` | `src/client/modules/translation/blocks.ts:translationBlocksOf` | 章节可翻译块筛选 |
| `renderBlocksWithTranslations` | `src/client/modules/markdown/render.ts:renderBlocksWithTranslations` | 在原文块后追加译文节点 |
| `TranslationControl` | `src/client/modules/translation/TranslationControl.ts:TranslationControl` | 阅读栏开关与设置浮层 |
| `TranslationCard` | `src/client/modules/translation/TranslationCard.ts:TranslationCard` | 选区译文浮层 |

## 约束与失败行为

单段最多 4000 字符；一次章节翻译最多 80 段、总计 60000 字符，单段失败只标记该段，其他段继续。`translator` 缺失时匿名 fallback 仍可用；付费源不可用时不静默回退。provider 不可用、网络失败或译文为空时返回错误，不写缓存。切换目标语言/翻译源或章节时丢弃过期请求；关闭双语会移除译文节点并清空本章译文。翻译不修改书库、笔记、记忆或伴读会话。

## 验收与测试

- 正常路径：可用翻译源列出匿名与付费标记，首次翻译写缓存，同文本再次翻译命中缓存（`translation_providers_and_cache`）。
- 边界：批量中单段失败只返回该段错误，其他段完成（`translation_batch_isolates_failures`）。
- 正常路径：清除缓存后同文本重新请求翻译（`translation_cache_clears`）。
- 边界：章节翻译跳过图片与代码，表格按行拼接（`translation_blocks_skip_images_and_code`）。
- 正常路径：宿主未挂载 translator 时，匿名 Bing/Google fallback 仍可翻译并列出 provider（`translation_falls_back_without_host_translator`）。
