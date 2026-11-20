# 智读 ReadPilot

[![npm version](https://img.shields.io/npm/v/dsh-readpilot.svg)](https://www.npmjs.com/package/dsh-readpilot) · [GitHub](https://github.com/svestar/dsh-readpilot)

DSH（DeepSeek Harness）Web GUI 的 AI 阅读插件。把本机书库变成可检索、可批注、可与 Agent 共读的工作区，支持 TXT、Markdown、EPUB 与 PDF。

## 功能

- **书库**：四种格式扫描；封面、阅读状态、评分、标签、搜索与排序；内容相同的副本可识别并清理。
- **阅读**：原版 / 重排、滚动 / 分页、单页 / 双页；字号、配色与毛玻璃；目录、搜索、进度、书签与页码跳转；侧栏单页共读。
- **扫描版 PDF**：无文本层也能原版逐页查看；搜索、重排、批注与摘要会禁用。
- **Markdown**：GFM 标题、表格、任务 / 嵌套列表、引用、代码、脚注、删除线、自动链接与行内图片；原始 HTML 按文本显示。
- **批注**：选中文字即可划线或写批注，支持五种颜色；批注与书签列表可筛选、折叠、跳转。
- **AI 伴读**：每本书一个原生会话，可新建或从书库工作区绑定旧对话；选区引用、页码跳转、工具卡、推理与审批都走宿主；会话失效自动重建。
- **提示词**：12 个内置模板，`{{selection}}`、`{{book}}`、`{{chapter}}`、`{{notes}}` 自动装配选段、书名、章节与批注；模板可新建、编辑、删除、恢复默认。
- **长笔记**：Markdown 存于书库 `notes/`，可用外部编辑器；对话回答可一键收藏；Agent 写入先生成草稿，先看 diff 再应用；支持自动应用、历史恢复、显示设置与导出。
- **笔记上下文**：默认关闭；开启后按书把笔记以 `<reading_notes>` 注入伴读上下文（单篇 4000 字符、总计 24000 字符），不限制 `reader_notes` 工具读取。
- **记忆**：默认关闭；可按书或全局开启，保存稳定的偏好、观点与长期问题。
- **Agent 动作与撤销**：跳转、打开侧栏、划线、标签、状态可驱动阅读器与书库；写操作进入“历史”，10 分钟内可撤销。
- **备份与迁移**：导出批注、长笔记、预设、记忆、进度、标签 / 状态 / 评分与伴读设置；换机后按内容匹配覆盖恢复，恢复前自动快照。

## 安装

任选一种：

- 在 DSH“插件 → 添加插件”中搜索 `dsh-readpilot` 并启用，刷新页面；
- 执行 `npm install dsh-readpilot`，再在插件管理中启用；
- 让 DSH Agent 安装：“安装 dsh-readpilot 插件”。

兼容 DSH `0.2.2-rc.2`–`0.2.x`。

## 快速开始

1. 打开“智读”，选择本地书籍目录作为书库。
2. 点开一本书，用“Aa 阅读设置”调整版式。
3. 选中正文：点颜色创建划线，“批注”写体会，“问伴读”带引用提问。
4. 在右侧伴读栏对话，或让 Agent 查书、读章节、写批注、整理长笔记。
5. 在“长笔记”标签管理笔记、草稿、历史与导出；在设置页做备份。

完整步骤见 [USAGE.md](USAGE.md)。

## 数据与隐私

原书不复制、不上传。设置、进度、会话绑定与解析缓存在 `$DSH_HOME/dsh-readpilot/`；EPUB 资产在 `assets/`，PDF 页面缓存在 `cache/pages/`；长笔记与导出在书库 `notes/`。备份不包含原书、工作区、会话或缓存。

## 开发

需要 Node 22.18+ 与 pnpm。`pnpm run verify` 依次运行 typecheck、boundaries、build、test、sizes、docs 与打包检查；`pnpm run smoke` 在一次性 `DSH_HOME` 中验证安装与 RPC 面。

```text
index.ts                       Host 入口：app、工具、HTTP 与 systemPrompt
src/host/modules/<feature>/    library、reading、search、notes、memory、
                               prompts、companion、actions、backup、media、tools
src/client/modules/<feature>/  阅读器、书库、笔记、伴读、侧栏、帮助、工具卡片、
                              Markdown 渲染与通用组件
src/shared/                    双端契约、Markdown、跳转链接与提示词渲染
```

功能清单见 [docs/features/index.md](docs/features/index.md)，架构取舍见 `docs/decisions/`。

## 许可证

[MIT](LICENSE)
