# 智读 ReadPilot

<img src="icon.svg" width="76" align="right" alt="智读 ReadPilot">

DSH（DeepSeek Harness）Web GUI 的阅读插件，支持 TXT、Markdown、EPUB 与 PDF。原版/重排阅读、分页、批注、翻译、原生伴读、长笔记和备份都在同一个工作区。

[![npm version](https://img.shields.io/npm/v/dsh-readpilot.svg)](https://www.npmjs.com/package/dsh-readpilot) [![license](https://img.shields.io/badge/license-MIT-1f6f5c.svg)](LICENSE) · [使用说明](USAGE.md) · [更新日志](CHANGELOG.md) · [English](README.en.md)

## 功能

### 阅读

- 四种格式；原版/重排、滚动/分页、单页/双页。
- 目录、搜索、书签、页码跳转；扫描版 PDF 可原版逐页查看。
- 工作区侧栏单页共读；浮动目录覆盖正文，不改变排版。

### 翻译与伴读

- 划词翻译；阅读栏“译”开启正文内联双语，首次使用先确认隐私。
- 每本书一个 DSH 原生会话，可新建或绑定工作区旧对话。
- 选区引用、提示词、Agent 阅读动作；工具卡、推理与审批走宿主。
- 译文缓存在本地，不写入伴读上下文。

### 笔记与数据

- 五种颜色划线/批注、书签、筛选与跳转。
- 长笔记 Markdown、草稿 diff、历史恢复与导出。
- 记忆、角色卡、笔记上下文、备份与恢复。

## 安装

在 DSH「插件 → 添加插件」中搜索 `dsh-readpilot` 并启用，然后刷新页面。

也可以执行：

```bash
npm install dsh-readpilot
```

兼容 DSH `0.2.2-rc.2`–`0.2.x`。

## 快速开始

1. 打开“智读”，选择本地书籍目录作为书库。
2. 打开一本书，用“Aa 阅读设置”调整版式。
3. 选中正文划线或批注；需要双语时打开阅读栏“译”；右侧打开伴读。

完整步骤见 [USAGE.md](USAGE.md)。

## 数据与隐私

- **原书**：不复制、不上传。
- **翻译**：只把所选段落或可见段落发送给所选在线翻译服务，原文会离开本机；译文只缓存在本地，不写入伴读对话。
- **本地数据**：设置、进度、会话绑定、解析缓存和译文缓存位于 `$DSH_HOME/dsh-readpilot/`；长笔记在书库 `notes/`。
- **备份**：包含批注、长笔记、提示词预设、记忆、阅读进度、标签 / 状态 / 评分与伴读设置；不包含原书、工作区、会话或缓存。

## 开发与架构

需要 Node 22.18+ 与 pnpm。

```bash
pnpm run verify
pnpm run smoke
```

`verify` 覆盖 typecheck、boundaries、build、test、sizes、docs、paths 和打包检查；`smoke` 在一次性 `DSH_HOME` 中验证安装与 RPC 面。

```text
index.ts                       Host 入口
src/host/modules/<feature>/    Host 功能模块：书库、阅读、笔记、伴读、翻译等
src/client/modules/<feature>/  Client 功能模块：阅读器、书库、笔记、侧栏等
src/shared/                    双端契约、Markdown、跳转链接与提示词渲染
```

功能清单见 [docs/features/index.md](docs/features/index.md)，架构取舍见 [docs/decisions/](docs/decisions/)。

## 许可证

[MIT](LICENSE)
