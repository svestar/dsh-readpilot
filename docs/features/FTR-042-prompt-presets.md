# 提示词预设

- **ID：** FTR-042
- **名称：** 提示词预设
- **状态：** active
- **代码：** `src/prompt-presets.ts`（`createPromptPresetStore`、`DEFAULT_PROMPT_PRESETS`）；`src/prompt-render.ts`（`renderPrompt`）；`src/api-prompts.ts`（`createPromptHandlers`）；`src/client/views/selection-note.ts`（`SelectionToolbar`）；`src/client/views/prompt-preset-manager.ts`（`PromptPresetManager`）；`src/client/plugin.ts`（`ReaderPanel`）
- **测试：** `tests/prompt-presets.test.ts`

## 行为

选中正文后的浮动栏提供“预设”菜单，列出当前预设；点击预设把模板渲染为完整提示词并填入当前伴读 composer，打开伴读对话。支持的占位符：`{{selection}}` 选区原文、`{{book}}` 书名、`{{chapter}}` 章节标题、`{{notes}}` 当前书最近最多 8 条批注（引文与正文；没有时填“暂无批注”）。未知占位符原样保留。默认提供解释、术语与典故、翻译、继续追问、总结要点五个模板。

“管理预设”打开管理弹窗：可新建、编辑标题与模板、删除、恢复默认。标题最多 40 字，模板最多 4000 字，两者不能为空；新预设 id 由 Host 生成。预设存于 `$DSH_HOME/dsh-readpilot/presets.json`；文件缺失时读取内置默认值，首次保存/重置才写盘。模板替换按字面量处理，选区中的 `$&`、`$1` 等不会被当作替换模式。

## 接口与代码映射

| 入口/符号 | 位置 | 职责 |
|---|---|---|
| `createPromptPresetStore` | `src/prompt-presets.ts:createPromptPresetStore` | 预设 list/save/remove/reset 与校验 |
| `DEFAULT_PROMPT_PRESETS` | `src/prompt-presets.ts:DEFAULT_PROMPT_PRESETS` | 五个内置模板 |
| `renderPrompt` | `src/prompt-render.ts:renderPrompt` | 替换四个占位符，按字面量插入 |
| `createPromptHandlers` | `src/api-prompts.ts:createPromptHandlers` | RPC `prompts` 的 list/save/delete/reset |
| `SelectionToolbar` | `src/client/views/selection-note.ts:SelectionToolbar` | 选区预设菜单与套用入口 |
| `PromptPresetManager` | `src/client/views/prompt-preset-manager.ts:PromptPresetManager` | 预设增删改与恢复默认 |
| `ReaderPanel` | `src/client/plugin.ts:ReaderPanel` | 加载预设、装配变量、填入 composer |

## 约束与失败行为

预设是全局配置，不按书隔离；修改后立即影响所有书。`{{notes}}` 只使用当前已加载的短批注，不读取长笔记或记忆；批注按加载顺序取前 8 条。套用预设不会自动发送消息，只预填草稿并把焦点移到 composer。Host 不可用或读取失败时菜单仍可打开管理弹窗但列表为空；保存/删除/重置失败在弹窗内显示错误，不关闭弹窗。内置预设没有删除保护，删除后可通过“恢复默认”找回。

## 验收与测试

- 正常路径：默认种子、编辑内置预设、新建/删除自定义预设、恢复默认（`prompt_presets_seed_edit_reset_and_delete`）。
- 边界：空标题/空模板、超长模板、未知 id、非法 id 被拒绝（`prompt_presets_validate_input`）。
- 正常路径：四个占位符替换，选区/书名字面量中的 `$&`、`$1` 不被展开（`render_prompt_replaces_placeholders_literally`）。
