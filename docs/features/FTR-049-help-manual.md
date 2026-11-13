# 帮助手册

- **ID：** FTR-049
- **名称：** 帮助手册
- **状态：** active
- **代码：** `src/client/common/help-content.ts`（`HELP_TOPICS`）；`src/client/common/help-manual.ts`（`HelpManual`）；`src/client/reader/header.ts`（`Header`）；`src/client/plugin.ts`（`HelpManual`）
- **测试：** `tests/help-manual.test.ts`

## 行为

顶部栏提供“?”帮助入口，所有书库与阅读页面都可打开帮助手册弹窗。手册左侧列出八个主题，右侧显示当前主题正文，底部提供完整 `USAGE.md` 和 GitHub 链接；关闭后不保留选中主题。

主题覆盖：安装与书库、阅读与设置、批注与提示词、伴读与 Agent、长笔记/记忆/导出、操作历史与撤销、快捷键、常见问题。常见问题包含扫描版 PDF、备份迁移、重复副本和全部搜索结果。

不弹出首次使用向导，不强制新手步骤，不记录“已读”状态；帮助内容随客户端打包，离线可看；外部文档链接需要网络。

## 接口与代码映射

| 入口/符号 | 位置 | 职责 |
|---|---|---|
| `HELP_TOPICS` | `src/client/common/help-content.ts:HELP_TOPICS` | 主题 ID、标题 key、正文 key |
| `HelpManual` | `src/client/common/help-manual.ts:HelpManual` | 主题导航、正文与外部链接 |
| `Header` | `src/client/reader/header.ts:Header` | 提供“?”入口 |
| `HelpManual` 挂载 | `src/client/plugin.ts:ReaderPanel` | 管理打开/关闭状态 |

## 约束与失败行为

帮助内容为静态文案，不执行命令、不读取用户数据、不修改书库。主题选中状态只存在于弹窗内部，关闭即重置；外部链接在新标签页打开，不保证网络可用。帮助不替代首次安装流程，未配置书库时仍由设置页处理。

## 验收与测试

- 正常路径：帮助主题覆盖主要工作流，ID 唯一，标题/正文 key 格式有效（`help_topics_cover_the_main_workflows`）。
