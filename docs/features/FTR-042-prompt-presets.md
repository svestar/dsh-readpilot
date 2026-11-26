# 提示词预设

- **ID：** FTR-042
- **名称：** 提示词预设
- **状态：** active
- **代码：** `src/host/modules/prompts/store.ts`（`createPromptPresetStore`、`DEFAULT_PROMPT_PRESETS`、`DEFAULT_PROMPT_PRESETS_EN`）；`src/shared/prompt-render.ts`（`renderPrompt`）；`src/host/modules/prompts/handlers.ts`（`createPromptHandlers`）；`src/client/modules/reader/SelectionNote.ts`（`SelectionToolbar`）；`src/client/modules/companion/PromptPresetManager.ts`（`PromptPresetManager`）；`src/client/modules/reader/use-reader-composer.ts`（`useReaderComposer`）
- **测试：** `tests/prompt-presets.test.ts`

## 行为

选中正文后的浮动栏提供“提示词”菜单，列出当前提示词；点击后把模板渲染为完整提示词并填入当前伴读 composer，打开伴读对话。支持的占位符：`{{selection}}` 选区原文、`{{book}}` 书名、`{{chapter}}` 章节标题、`{{notes}}` 当前书最近最多 8 条批注（没有时填“暂无批注”）。未知占位符原样保留。默认提供解释、术语、精译、追问、总结、人物、手法、背景、论证、金句、提问、联系全书十二个模板。

“提示词管理”打开管理弹窗：左侧显示标题与摘要，右侧可编辑名称/模板、插入变量、预览，可新建、删除、恢复默认。标题≤40 字、模板≤4000 字且不能为空；新 id 由 Host 生成。预设存于 `$DSH_HOME/dsh-readpilot/presets.json`，只存用户覆盖 `{version:5,overrides,hidden}`，默认模板在代码中。v1-v4 迁移：未编辑内置丢弃，编辑内置与自定义写入 overrides；v1 缺失的新增内置补回，其余缺失内置写入 hidden。Host 按工作区语言返回和判断；未覆盖内置按语言返回；覆盖内置与自定义保留原文。保存与当前语言默认值相同的内置会删除覆盖并恢复默认；其他内容才写入 overrides。文件缺失时读默认值，首次保存/重置才写盘。模板替换按字面量处理，选区中的 `$&`、`$1` 等不会被当作替换模式。

## 接口与代码映射

| 入口/符号 | 位置 | 职责 |
|---|---|---|
| `createPromptPresetStore` | `src/host/modules/prompts/store.ts:createPromptPresetStore` | 预设 list/save/remove/reset 与校验 |
| `DEFAULT_PROMPT_PRESETS` / `DEFAULT_PROMPT_PRESETS_EN` | `src/host/modules/prompts/store.ts:DEFAULT_PROMPT_PRESETS`；`DEFAULT_PROMPT_PRESETS_EN` | 中文/英文内置模板 |
| `renderPrompt` | `src/shared/prompt-render.ts:renderPrompt` | 替换四个占位符，按字面量插入 |
| `createPromptHandlers` | `src/host/modules/prompts/handlers.ts:createPromptHandlers` | RPC `prompts` 的 list/save/delete/reset |
| `SelectionToolbar` | `src/client/modules/reader/SelectionNote.ts:SelectionToolbar` | 选区预设菜单与套用入口 |
| `PromptPresetManager` | `src/client/modules/companion/PromptPresetManager.ts:PromptPresetManager` | 预设增删改与恢复默认 |
| `useReaderComposer` | `src/client/modules/reader/use-reader-composer.ts:useReaderComposer` | 加载预设、装配变量、填入 composer |

## 约束与失败行为

预设是全局配置，修改后影响所有书。`{{notes}}` 只使用当前已加载的短批注，不读取长笔记或记忆；批注按加载顺序取前 8 条。套用预设只预填草稿并聚焦 composer，不自动发送。Host 不可用或读取失败时菜单可打开但列表为空；保存/删除/重置失败在弹窗内报错，不关闭弹窗。内置预设无删除保护，删除后可通过“恢复默认”找回。

## 验收与测试

- 正常路径：默认种子、编辑、新建/删除、恢复默认（`prompt_presets_seed_edit_reset_and_delete`）。
- 正常路径：v1 迁移保留新默认、不复活已删除项（`prompt_presets_migrate_new_defaults_once`）；v2 未编辑内置丢弃、自定义保留（`prompt_presets_simplify_untouched_defaults_on_v2`）。
- 正常路径：v4 编辑内置写入覆盖、缺失内置写入隐藏（`prompt_presets_v4_migrates_edited_and_hidden`）。
- 正常路径：未覆盖内置按工作区语言显示，覆盖内置保留原文（`prompt_presets_localize_unedited_builtins`）；RPC 语言由 Host 决定（`prompts_rpc_uses_host_workspace_language`）。
- 边界：未修改内置删除覆盖，切语言仍本地化；修改才写入覆盖（`prompt_presets_save_unchanged_builtin_keeps_localization`）。
- 边界：英文工作区把内置改成中文默认值会写入覆盖（`prompt_presets_other_language_default_is_an_edit`）。
- 边界：空/超长标题或模板、未知/非法 id 被拒绝（`prompt_presets_validate_input`）。
- 正常路径：四个占位符替换，选区/书名字面量中的 `$&`、`$1` 不被展开（`render_prompt_replaces_placeholders_literally`）。
