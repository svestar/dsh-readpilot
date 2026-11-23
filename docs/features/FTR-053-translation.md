# 双语阅读

- **ID：** FTR-053
- **名称：** 双语阅读
- **状态：** active
- **代码：** `src/client/modules/translation/use-reader-translation.ts`（`useReaderTranslation`）；`src/client/modules/translation/blocks.ts`（`translationBlocksOf`、`tailTranslationBlocksOf`）；`src/client/modules/translation/session-state.ts`（`translationEnabledForBook`、`rememberTranslationEnabled`、`forgetTranslationEnabled`）；`src/client/modules/translation/TranslationControl.ts`（`TranslationControl`）；`src/client/modules/translation/TranslationCard.ts`；`src/client/modules/markdown/render.ts`（`renderBlocksWithTranslations`）；`src/client/modules/reader/ReaderBodyView.ts`；`src/client/modules/sidebar/SidebarReaderView.ts`；`src/client/modules/reader/SelectionNote.ts`
- **测试：** `tests/translation.test.ts`

## 行为

阅读栏“译”开关（设置浮层、默认 Bing、偏好与缓存见 [FTR-056](FTR-056-translation-service.md)）。默认关闭，切走再回来保持。首次开启或首次选区翻译先弹隐私确认，确认后才请求翻译，取消则保持关闭；确认结果持久化。主区/侧栏支持；重排阅读翻译当前可见块，译文追加在段落后；滚动/翻页后继续翻译新块。原文、`data-block-index`、选区和划线锚点不变，译文节点只带 `data-translation-index`。

译文是分页布局的输入：译文节点会改变多栏宽度和页数，分页器据此重算页码，但屏幕上的块锚点不变；译文片段与原文块共享块索引，只有译文的页也能定位。翻译批次按章应用，不按页丢弃；跨章回翻到上一章章末时，按完整章节扫描并优先预翻译末尾 12 块，不受批量 80 段限制。翻译开关导致的译文增删同样触发重测。

选区“翻译”可单独使用：附近弹出译文卡片；PDF/EPUB 原版不插入正文。

## 接口与代码映射

| 入口/符号 | 位置 | 职责 |
|---|---|---|
| `useReaderTranslation` | `src/client/modules/translation/use-reader-translation.ts:useReaderTranslation` | 双语开关与章节译文 |
| `translationEnabledForBook` | `src/client/modules/translation/session-state.ts:translationEnabledForBook` | 按书记住翻译开关 |
| `renderBlocksWithTranslations` | `src/client/modules/markdown/render.ts:renderBlocksWithTranslations` | 原文块后追加译文节点 |
| `TranslationControl` | `src/client/modules/translation/TranslationControl.ts:TranslationControl` | 阅读栏开关（设置浮层归 FTR-056） |

## 约束与失败行为

关闭双语会移除译文节点并清空本章译文。分页模式下加载中的译文不占位，只有完成的译文改变布局；章末预翻译不保证整章完成，只保证末页附近稳定。服务、偏好与缓存约束见 [FTR-056](FTR-056-translation-service.md)。

## 验收与测试

- 边界：章节翻译跳过图片与代码，表格按行拼接（`translation_blocks_skip_images_and_code`）。
- 正常：章末预翻译只取尾部块（`translation_tail_prefetch_keeps_last_blocks`）。
- 边界：章节超过 80 段时，章末预翻译仍取真正末尾（`translation_tail_prefetch_scans_past_batch_limit`）。
- 正常：翻译开关按书记住，换书或清除后回到关闭（`translation_enabled_is_remembered_per_book`）。
- 边界：未确认隐私时先提示，确认后才开启或翻译，取消保持关闭（`translation_consent_steps`）。
