# 提示词预设

- **ID：** FTR-042
- **名称：** 提示词预设
- **状态：** active
- **代码：** `src/host/modules/prompts/store.ts`（`createPromptPresetStore`、`DEFAULT_PROMPT_PRESETS`、`DEFAULT_PROMPT_PRESETS_EN`）；`src/shared/prompt-render.ts`（`renderPrompt`）；`src/host/modules/prompts/handlers.ts`（`createPromptHandlers`）；`src/client/modules/reader/SelectionNote.ts`（`SelectionToolbar`）；`src/client/modules/companion/PromptPresetManager.ts`（`PromptPresetManager`）；`src/client/modules/reader/ReaderPanelView.ts`（`ReaderPanelView`）；`src/client/modules/reader/use-reader-composer.ts`（`useReaderComposer`）
- **测试：** `tests/prompt-presets.test.ts`

## 行为

选中正文后的浮动栏提供“提示词”菜单，列出当前提示词；点击后把模板渲染为完整提示词并填入当前伴读 composer，打开伴读对话。支持的占位符：`{{selection}}` 选区原文、`{{book}}` 书名、`{{chapter}}` 章节标题、`{{notes}}` 当前书最近最多 8 条批注（没有时填“暂无批注”）。未知占位符原样保留。默认提供解释、术语、精译、追问、总结、人物、手法、背景、论证、金句、提问、联系全书十二个模板。

“提示词管理”打开管理弹窗：左侧模板列表显示标题与摘要，右侧可编辑名称/模板、点击变量插入、预览渲染结果，并可新建、删除、恢复默认。标题最多 40 字，模板最多 4000 字，两者不能为空；新预设 id 由 Host 生成。预设存于 `$DSH_HOME/dsh-readpilot/presets.json`；v1 数组读取时只补新增内置模板；v2 中未被用户编辑的内置模板会简化为新版；v3 补 `edited` 标记；不复活已删除项；迁移后写为 `{version:4,presets}`。未编辑的内置模板按工作区语言返回中文或英文版本；编辑过的内置模板和自定义模板保留原文。保存与当前语言默认值相同的内置模板不写盘、不置 `edited`；改成另一种语言默认值或其他内容时标记为已编辑。文件缺失时读取内置默认值，首次保存/重置才写盘。模板替换按字面量处理，选区中的 `$&`、`$1` 等不会被当作替换模式。

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

预设是全局配置，修改后影响所有书。`{{notes}}` 只使用当前已加载的短批注，不读取长笔记或记忆；批注按加载顺序取前 8 条。套用预设不会自动发送消息，只预填草稿并把焦点移到 composer。Host 不可用或读取失败时菜单可打开但列表为空；保存/删除/重置失败在弹窗内显示错误，不关闭弹窗。内置预设没有删除保护，删除后可通过“恢复默认”找回。

## 验收与测试

- 正常路径：默认种子、编辑内置、新建/删除自定义、恢复默认（`prompt_presets_seed_edit_reset_and_delete`）。
- 正常路径：v1 数组迁移只补新增内置，不复活已删除旧内置（`prompt_presets_migrate_new_defaults_once`）。
- 正常路径：v2 未编辑内置模板简化为新版，自定义模板保留（`prompt_presets_simplify_untouched_defaults_on_v2`）。
- 正常路径：未编辑内置按工作区语言显示，编辑过的内置和自定义模板保留原文（`prompt_presets_localize_unedited_builtins`）。
- 边界：未修改内置保存不写 `edited`，切语言仍本地化；真正修改才冻结（`prompt_presets_save_unchanged_builtin_keeps_localization`）。
- 边界：在英文工作区把内置改成中文默认值视为编辑，不按 no-op 丢弃（`prompt_presets_other_language_default_is_an_edit`）。
- 边界：空/超长标题或模板、未知/非法 id 被拒绝（`prompt_presets_validate_input`）。
- 正常路径：四个占位符替换，选区/书名字面量中的 `$&`、`$1` 不被展开（`render_prompt_replaces_placeholders_literally`）。
