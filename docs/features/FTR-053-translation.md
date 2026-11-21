# 翻译

- **ID：** FTR-053
- **名称：** 翻译
- **状态：** active
- **代码：** `src/shared/contracts/translation.ts`；`src/host/modules/translation/service.ts`（`createTranslationService`）；`src/host/modules/translation/providers.ts`；`src/host/modules/translation/store.ts`；`src/host/api.ts`（`translationProviders`、`translate`）；`src/client/modules/translation/use-reader-translation.ts`（`useReaderTranslation`）；`src/client/modules/translation/blocks.ts`（`translationBlocksOf`、`tailTranslationBlocksOf`）；`src/client/modules/translation/TranslationControl.ts`（`TranslationControl`）；`src/client/modules/translation/TranslationCard.ts`；`src/client/modules/markdown/render.ts`（`renderBlocksWithTranslations`）；`src/client/modules/reader/ReaderBodyView.ts`；`src/client/modules/sidebar/SidebarReaderView.ts`；`src/client/modules/reader/SelectionNote.ts`
- **测试：** `tests/translation.test.ts`

## 行为

翻译使用 DSH Host 的 `translator` 服务，不经过伴读 Agent，也不写入伴读会话。Host 未挂载 `translator` 时，Google/Bing 使用匿名 HTTP fallback；付费 DeepSeek 源仍需要宿主 `translator`。

阅读栏提供“译”开关和设置浮层（目标语言、翻译源（默认Bing）、隐私提示、清除缓存）。打开书籍默认关闭，切走再回来保持。主区/侧栏都支持；打开后，重排阅读翻译当前可见块，译文追加在对应段落后；滚动或翻页后继续翻译新出现的块。原文、`data-block-index`、选区和划线锚点不变，译文节点只带 `data-translation-index`。

译文是分页布局的输入：译文节点会改变多栏宽度和页数，分页器据此重算页码，但屏幕上的块锚点不变；译文片段与原文块共享块索引，只有译文的页也能定位。翻译批次按章应用，不按页丢弃；跨章回翻落到上一章章末时，按完整章节尾部扫描并优先预翻译末尾 12 块，不受一次批量 80 段上限影响。翻译开关、翻译源切换或清空缓存导致的译文增删同样触发重测。

选区工具栏的“翻译”仍可单独使用：在选区附近弹出译文卡片；PDF 原版和 EPUB 原版不插入正文。

译文按 provider、语言和源文本哈希缓存在 `$DSH_HOME/dsh-readpilot/translations.json`，最多 3000 条；设置浮层可清空缓存。

## 接口与代码映射

| 入口/符号 | 位置 | 职责 |
|---|---|---|
| `createTranslationService` | `src/host/modules/translation/service.ts:createTranslationService` | translator/匿名 fallback、批量与缓存 |
| `useReaderTranslation` | `src/client/modules/translation/use-reader-translation.ts:useReaderTranslation` | 双语开关、章节译文与设置 |
| `translationBlocksOf` | `src/client/modules/translation/blocks.ts:translationBlocksOf` | 章节可翻译块筛选 |
| `tailTranslationBlocksOf` | `src/client/modules/translation/blocks.ts:tailTranslationBlocksOf` | 按完整章节扫描章末预翻译块 |
| `renderBlocksWithTranslations` | `src/client/modules/markdown/render.ts:renderBlocksWithTranslations` | 原文块后追加译文节点 |
| `TranslationControl` | `src/client/modules/translation/TranslationControl.ts:TranslationControl` | 阅读栏开关与设置浮层 |

## 约束与失败行为

单段最多 4000 字符；单次批量最多 80 段、总计 60000 字符，单段失败只标记该段，其他段继续。`translator` 缺失时匿名 fallback 仍可用；付费源不可用时不静默回退。provider 不可用、网络失败或译文为空时返回错误，不写缓存。切换目标语言/翻译源或章节时丢弃过期请求；关闭双语会移除译文节点并清空本章译文。分页模式下加载中的译文不占位，只有完成的译文改变布局；章末预翻译不保证整章完成，只保证末页附近稳定。

## 验收与测试

- 正常：可用源列出匿名与付费标记，首次翻译写缓存，同文本再译命中缓存（`translation_providers_and_cache`）。
- 边界：批量中单段失败只返回该段错误，其他段完成（`translation_batch_isolates_failures`）。
- 正常：清除缓存后同文本重新请求翻译（`translation_cache_clears`）。
- 边界：章节翻译跳过图片与代码，表格按行拼接（`translation_blocks_skip_images_and_code`）。
- 正常：章末预翻译只取尾部块（`translation_tail_prefetch_keeps_last_blocks`）。
- 边界：章节超过 80 段时，章末预翻译仍取真正末尾（`translation_tail_prefetch_scans_past_batch_limit`）。
- 正常：宿主未挂载 translator 时匿名 fallback 仍可翻译（`translation_falls_back_without_host_translator`）。
