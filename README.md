# 智读 ReadPilot

[![npm version](https://img.shields.io/npm/v/dsh-readpilot.svg)](https://www.npmjs.com/package/dsh-readpilot) · [GitHub](https://github.com/svestar/dsh-readpilot)

DSH Web GUI 的 AI 辅助阅读插件。把本机书库变成可检索、可批注、可与 AI 共读的工作区，支持 TXT、Markdown、EPUB 与 PDF。

## 功能

- **书库**：扫描四种格式，封面、阅读状态、评分、标签、搜索与排序。
- **阅读**：原版/重排切换；滚动/分页、单页/双页、字号、主题与毛玻璃统一在“Aa 阅读设置”；目录、检索、进度、书签与跳转；PDF 原版双页支持左右页划选和批注覆盖层；阅读页可跳到工作区对话，侧栏可单页共读。
- **批注**：选中文字即可划线或写批注，支持五种颜色；纯划线与带正文批注是同一类记录；批注、书签列表支持筛选、折叠和跳转。
- **AI 伴读**：每本书一个原生会话，共享 Chat 工具、推理与审批；选段问伴读会带引用，PDF 页码可点击；会话失效自动重建。
- **提示词**：内置解释、术语、翻译、追问、总结等 12 个模板；用 `{{selection}}`、`{{book}}`、`{{chapter}}`、`{{notes}}` 自动装配选段、书名、章节和批注；模板可新建、编辑、删除、恢复默认。
- **长笔记**：Markdown 存于书库 `notes/`，可用外部编辑器；Agent 写入先生成草稿，先看 diff 再应用；支持自动应用、历史恢复、删除与清空。
- **记忆**：可选开启，按书记住稳定偏好、观点和长期问题；默认关闭。
- **Agent 动作**：`reader_goto`、`reader_open_panel`、`reader_mark`、`reader_tag`、`reader_status` 可驱动阅读器和书库；批注与长笔记支持重写、删除；操作历史提供一键撤销。
- **导出**：把长笔记、批注、书签导出为 Markdown，可下载或保存到书库。

## 使用

安装、创建书库、打开书籍、划选批注、套用提示词、伴读协作、长笔记/记忆/导出和操作历史撤销的完整步骤，见 [USAGE.md](USAGE.md)。

## 数据

原书不复制。设置、进度、会话和解析缓存在 `$DSH_HOME/dsh-readpilot/`；EPUB 资产在 `assets/`，PDF 页面缓存在 `cache/pages/`。

## 开发

需要 Node 22.18+。`pnpm run build` 生成 Host 与 `client.js`；`pnpm test` 跑测试；`pnpm run typecheck` 类型检查；`python scripts/check_docs.py` 检查文档。

Host 在 `index.ts`、`src/`；Client 在 `src/client/`，产物 `client.js`。功能文档见 [docs/features/index.md](docs/features/index.md)，架构取舍见 `docs/decisions/`。

## 许可证

[MIT](LICENSE)
