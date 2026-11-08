# 智读 ReadPilot

[![npm version](https://img.shields.io/npm/v/dsh-readpilot.svg)](https://www.npmjs.com/package/dsh-readpilot) · [GitHub](https://github.com/svestar/dsh-readpilot)

DSH Web GUI 的 AI 辅助阅读插件。把本机书库变成可检索、可批注、可与 AI 共读的工作区，支持多格式。

## 功能

- **书库**：扫描四种格式，封面、状态评分、标签、检索与排序。
- **阅读**：原版/重排切换；滚动/分页、单页/双页、字号、主题与毛玻璃统一收在“Aa 阅读设置”里；重排支持 EPUB/PDF 文本、EPUB 图片与简单表格；页码同时显示本章与全书进度；阅读页可跳到对应工作区对话，对话右栏可单页查看当前书（文字/原版）、批注（含划线），并共用进度；目录、检索、批注、书签与跳转；快捷键。
- **AI 伴读**：每本书一个原生会话，共享 Chat 工具、推理与审批；选段问伴读带引用，PDF 页码可点；伴读对话标题统一为“《书名》· 伴读”；只读沙箱；会话失效自动重建。
- **笔记**：长笔记存 `notes/`，可用外部编辑器；草稿先看 diff，可自动应用；按书注入笔记上下文；历史可恢复/删除/清空。
- **记忆与导出**：记忆默认关闭，可手动开启，每卡最多 600 字；导出 Markdown。
- **工具**：`reader_books/context/open/read/search/digest/note/notes/memory` 九个；`reader_digest` 提供抽取式全书摘要；阅读纪律写入书库 `AGENTS.md`。

## 安装

npm 最新发布 `0.2.2`；`0.2.4` 已在 GitHub 打标签，尚未发布到 npm。

```bash
npm install dsh-readpilot
```

在 DSH Plugins 或 `plugin_manager` 安装 `dsh-readpilot`；刷新后创建书库。兼容 DSH `0.2.2-rc.1`–`0.2.x`。

## 开发

需要 Node 22.18+。`pnpm run build` 生成 Host 与 `client.js`；`pnpm test` 跑测试；`pnpm run typecheck` 类型检查；`python scripts/check_docs.py` 检查文档。

## 结构

Host 在 `index.ts`、`src/`；Client 在 `src/client/`，产物 `client.js`。功能文档见 [docs/features/index.md](docs/features/index.md)，架构取舍见 `docs/decisions/`。

## 数据

原书不复制。设置、进度、会话与解析缓存位于 `$DSH_HOME/dsh-readpilot/`；EPUB 资源在 `assets/`，PDF 页面在 `cache/pages/`。

## 限制

EPUB 原版保留 CSS、图片与字体但不执行脚本；EPUB 重排只保留块级图片与普通行列表格，行内图片、SVG、合并单元格和复杂版式会丢失。PDF 重排不识别图片、公式与复杂表格，扫描版需自带文本层；双栏、页眉页脚可能影响文本层对齐。检索为字面量扫描。单本默认 100 MB，深度 3 层、最多 2000 文件；原生伴读依赖 DSH Conversation Factory，失败退回折叠。

## 许可证

[MIT](LICENSE)
