# Changelog

## 0.3.0 — 2026-11-08

### Added

- 提示词预设：选区套用模板，自动装配 `{{selection}}`、`{{book}}`、`{{chapter}}`、`{{notes}}`；内置 12 个模板，支持新建、编辑、删除、恢复默认。
- Agent 阅读动作：`reader_goto`、`reader_open_panel`、`reader_mark`、`reader_tag`、`reader_status`。
- Agent 批注与长笔记管理：`reader_note` 支持 update/delete；`reader_notes` 支持 delete。
- 操作历史与撤销：批注增改删、长笔记写入/删除、标签与阅读状态均可按回执撤销；Agent 可通过 `recentActions` 识别 `undone_by_user`。
- PDF 原版双页：左右页均可划选，笔记/高亮覆盖层分别渲染到两页。
- 宿主 UI：Tooltip、Modal、Toast、快捷键、toolview 卡片、`ctx.resources` 活动笔记刷新、侧栏资源跳转。

### Changed

- 划线、短笔记统一为 `kind:'annotation'`：`note` 为空即划线，颜色对带正文批注同样生效；书签仍为 `bookmark`。
- 笔记页合并为“批注、书签”分组，支持折叠；长笔记列表、书库网格、TOC、短笔记列表窗口化。
- `reader_open`/`reader_search` 结果卡片的“跳转”按当前主阅读书优先，跨书打开侧栏。
- 默认提示词模板精简；`presets.json` 升级到 v3，未编辑的内置模板自动简化。
- 工具错误改为抛出失败，不再返回成功包装的 `error` 字段。
- 资产 URL 带 mtime 版本并启用不可变缓存；PDF 文档复用与缓存上限。

### Fixed

- PDF 原版双页右页划选工具栏与覆盖层缺失。
- 批注覆盖层兼容旧 `kind` 后颜色丢失。
- 长笔记预览宿主 Markdown 渲染崩溃；恢复自定义渲染。
- Modal 内主按钮白底白字，以及阅读栏历史入口空白/角标问题。
- 操作历史弹窗缺少内边距与排版拥挤。

### Migration / compatibility

- 旧批注 JSON 读取时把 `highlight`/`note` 归一为 `annotation`，正文取原 `note` 或 `annotation`；文件在该条记录被编辑时写回统一结构。
- 外部脚本若依赖 `kind:'highlight'`，请改为接受 `annotation`。
- 预设文件 v1/v2 自动迁移到 v3；自定义模板保留，未编辑的内置模板更新为精简版。
- 新增 `prompts`、`readerActions`、`readerReceipts` RPC；Host 与客户端需同时升级。
