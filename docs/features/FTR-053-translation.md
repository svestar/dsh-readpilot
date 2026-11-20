# 翻译

- **ID：** FTR-053
- **名称：** 翻译
- **状态：** active
- **代码：** `src/shared/contracts/translation.ts`（`TRANSLATION_ENDPOINTS`、`TranslationResult`）；`src/host/modules/translation/service.ts`（`createTranslationService`、`translate`、`translateBatch`）；`src/host/modules/translation/store.ts`（`createTranslationCache`）；`src/host/modules/translation/handlers.ts`（`createTranslationHandlers`）；`src/host/api.ts`（`translationProviders`、`translate`）；`src/client/modules/translation/use-reader-translation.ts`（`useReaderTranslation`）；`src/client/modules/translation/TranslationCard.ts`（`TranslationCard`）；`src/client/modules/translation/TranslationPanel.ts`（`TranslationPanel`、`translationBlocksOf`）；`src/client/modules/reader/SelectionNote.ts`（`SelectionToolbar`）；`src/client/modules/companion/ChatPanel.ts`（`ChatPanel`）
- **测试：** `tests/translation.test.ts`

## 行为

翻译使用 DSH Host 的 `translator` 服务，不经过伴读 Agent，也不写入伴读会话：选中的文字或当前章的段落通过 `translate` / `translateBatch` 交给 Google、Bing 或用户选择的 DeepSeek 翻译源，返回纯文本。

选区工具栏有“翻译”入口；点击后在选区附近弹出译文卡片，显示原文、译文、翻译源与缓存状态，可复制和关闭。右侧面板新增“翻译”页签：显示当前章节的段落，可单段翻译或“翻译本章”，并在此选择目标语言与翻译源；翻译结果写入持久缓存，切换章节后清空面板视图，但缓存可复用。

默认目标语言 `zh-CN`，默认翻译源“自动”（由 Host 选择可用的匿名源）。语言与翻译源保存在浏览器本地偏好中。匿名源不需要 Token；DeepSeek 付费源需要当前伴读会话存在，并在面板中标注“付费”。首次打开翻译页显示隐私提示：译文会发送给所选翻译服务，不会写入伴读上下文。

缓存位于 `$DSH_HOME/dsh-readpilot/translations.json`，键由 provider、源语言、目标语言和源文本哈希组成；最多保留 3000 条，按创建时间淘汰。面板“清除译文缓存”删掉全部缓存。

## 接口与代码映射

| 入口/符号 | 位置 | 职责 |
|---|---|---|
| `createTranslationService` | `src/host/modules/translation/service.ts:createTranslationService` | 包装 translator 的 resolve/translate、批量与缓存 |
| `createTranslationCache` | `src/host/modules/translation/store.ts:createTranslationCache` | 持久化译文与哈希键 |
| `translationProviders` / `translate` | `src/host/api.ts:translationProviders`；`src/host/api.ts:translate` | RPC 方法 |
| `useReaderTranslation` | `src/client/modules/translation/use-reader-translation.ts:useReaderTranslation` | 目标语言、翻译源、选区与章节翻译状态 |
| `TranslationCard` | `src/client/modules/translation/TranslationCard.ts:TranslationCard` | 选区译文浮层 |
| `translationBlocksOf` | `src/client/modules/translation/TranslationPanel.ts:translationBlocksOf` | 章节文本块筛选与表格拼接 |

## 约束与失败行为

单段最多 4000 字符（由 Host 与 translator 的限制共同约束）；批量最多 100 段、总计 60000 字符，单段失败只标记该段，不影响其他段。`translator` 服务缺失、provider 不可用、网络失败或翻译为空时返回错误，不写缓存；选中文字过长时提示分段。付费翻译源没有可用伴读会话时失败，不会静默改用免费源。翻译不修改书库、笔记、记忆或伴读会话；缓存损坏按空缓存读取。隐私提示只记录在本地，不包含作者、书名或上下文。

## 验收与测试

- 正常路径：可用翻译源列出匿名与付费标记，首次翻译写缓存，同文本再次翻译命中缓存（`translation_providers_and_cache`）。
- 边界：批量中单段失败只返回该段错误，其他段完成（`translation_batch_isolates_failures`）。
- 正常路径：清除缓存后同文本重新请求翻译（`translation_cache_clears`）。
- 边界：章节翻译跳过图片与代码，表格按行拼接（`translation_blocks_skip_images_and_code`）。
