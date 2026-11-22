# 翻译服务与缓存

- **ID：** FTR-056
- **名称：** 翻译服务与缓存
- **状态：** active
- **代码：** `src/shared/contracts/translation.ts`；`src/host/modules/translation/service.ts`（`createTranslationService`）；`src/host/modules/translation/providers.ts`；`src/host/modules/translation/store.ts`；`src/host/api.ts`（`translationProviders`、`translate`、`translationCacheClear`）；`src/client/lib/translation-preferences.ts`（`DEFAULT_TRANSLATION_PROVIDER`、`readTranslationProvider`、`saveTranslationProvider`、`readTranslationTarget`、`saveTranslationTarget`）；`src/client/modules/translation/TranslationControl.ts`（`TranslationControl`）
- **测试：** `tests/translation.test.ts`

## 行为

翻译走 Host `translator`，不经过伴读会话。未挂载时 Google/Bing 用匿名 HTTP fallback；付费 DeepSeek 源仍需宿主 `translator`。

阅读栏设置浮层选择目标语言与翻译源（默认 Bing），显示隐私提示并清空缓存；默认值与选择持久化。

译文按 provider、语言和源哈希缓存到 `$DSH_HOME/dsh-readpilot/translations.json`，上限 3000 条。

## 接口与代码映射

| 入口/符号 | 位置 | 职责 |
|---|---|---|
| `createTranslationService` | `src/host/modules/translation/service.ts:createTranslationService` | translator/匿名 fallback、批量与缓存 |
| `translationProviders` / `translate` / `translationCacheClear` | `src/host/api.ts:translationProviders`；`translate`；`translationCacheClear` | 可用源列表、翻译请求与清缓存 |
| `DEFAULT_TRANSLATION_PROVIDER` / `readTranslationProvider` / `saveTranslationProvider` / `readTranslationTarget` / `saveTranslationTarget` | `src/client/lib/translation-preferences.ts:DEFAULT_TRANSLATION_PROVIDER`；`readTranslationProvider`；`saveTranslationProvider`；`readTranslationTarget`；`saveTranslationTarget` | 默认 Bing、翻译源与目标语言持久化 |
| `TranslationControl` | `src/client/modules/translation/TranslationControl.ts:TranslationControl` | 阅读栏开关与设置浮层 |

## 约束与失败行为

单段最多 4000 字符；单次批量最多 80 段、60000 字符，单段失败只标记该段。`translator` 缺失时匿名 fallback 仍可用；付费源不可用时不静默回退。provider 不可用、网络或空译文返回错误，不写缓存。切换语言/源或章节时丢弃过期请求。

## 验收与测试

- 正常：可用源列出匿名与付费标记，首次翻译写缓存，同文本再译命中缓存（`translation_providers_and_cache`）。
- 边界：批量中单段失败只返回该段错误，其他段完成（`translation_batch_isolates_failures`）。
- 正常：清除缓存后同文本重新请求翻译（`translation_cache_clears`）。
- 正常：宿主未挂载 translator 时匿名 fallback 仍可翻译（`translation_falls_back_without_host_translator`）。
