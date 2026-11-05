# 智读 ReadPilot

[![npm version](https://img.shields.io/npm/v/dsh-readpilot.svg)](https://www.npmjs.com/package/dsh-readpilot) · [GitHub](https://github.com/svestar/dsh-readpilot)

DSH Web GUI 的 AI 辅助阅读插件。把本机书库变成可检索、可批注、可与 AI 共读的工作区，支持 TXT、Markdown、EPUB、PDF。

## 功能

- **书库**：扫描四种格式，封面、状态评分、标签、检索与排序。
- **阅读**：默认分页单页，可切滚动/双页；目录、进度、书内检索、五色划线、批注、书签与跳转；批注按章节/颜色筛选；快捷键翻页与搜索；配色跟随 DSH 或六种主题。
- **AI 伴读**：每本书一个原生会话，共享 Chat 工具、推理与审批；Composer 可选模型/强度；选段问伴读带引用，PDF 页码可点；只读沙箱。
- **笔记**：长笔记存 `notes/`，可用外部编辑器；草稿先看 diff，可开自动应用；按书注入笔记上下文；历史可恢复/删除/清空。
- **记忆与导出**：记忆（关/询问/开）；导出 Markdown。
- **工具**：`reader_books`、`reader_context`、`reader_open`、`reader_read`、`reader_search`、`reader_note`、`reader_notes`、`reader_memory`；阅读纪律写入书库 `AGENTS.md`。

## 安装

```bash
npm install dsh-readpilot
```

兼容 DSH 0.2.2-rc.1–0.2.x。在 DSH Plugins 或 `plugin_manager` 安装 `dsh-readpilot`；刷新后创建书库。开发：`pnpm install && pnpm run build`。

## 开发

需要 Node 22.18+。`pnpm run build` 生成 Host 与 `client.js`；只改客户端用 `pnpm run build:client`；`pnpm run typecheck` 做类型检查，`pnpm test` 跑测试。文档门禁用 `python scripts/check_docs.py`。

## 结构

Host 入口 `index.ts`、`src/`；Client 在 `src/client/`，产物 `client.js`。功能文档见 [docs/features/index.md](docs/features/index.md)，架构取舍见 `docs/decisions/`。

## 数据

原书不复制。设置、进度、会话与解析缓存位于 `$DSH_HOME/dsh-readpilot/`；EPUB 资源在 `assets/`，PDF 页面在 `cache/pages/`。

## 限制

EPUB 保留 CSS/图片/字体但不执行脚本；PDF 不做 OCR，扫描版需自带文本层；双栏、页眉页脚可能影响文本层对齐；检索为字面量扫描。单本默认 100 MB，深度 3 层、最多 2000 文件；原生伴读依赖 DSH Conversation Factory，失败退回折叠。

## 许可证

[MIT](LICENSE)
