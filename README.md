# dsh-reader

DSH Web GUI 的电子书阅读插件。书库是一个用户指定的本机目录；配置后该目录会注册为独立的 DSH 工作区，每本书的伴读会话都保留在这个工作区里。

## 当前能力

- 书库：扫描 `.txt`、`.md`、`.epub`、`.pdf`；EPUB 按 spine 解析，PDF 抽取文本层并渲染页面。支持最近阅读、标签、书名/标签搜索与排序。
- 阅读：四种格式都支持分页；PDF 恒为分页，其余可切滚动/分页；支持单/双页、滚轮翻页、目录、进度、搜索与笔记；五色划线、批注与书签，引文在正文高亮并可跳转；配色跟随 DSH 或选浅/深色、羊皮纸、护眼绿、夜间。
- 长笔记：右栏“笔记”可写整书/主题笔记，存于书库 `notes/`；短笔记仍走 JSON。
- 笔记上下文：按书开启“让伴读知道本书笔记”，注入笔记与批注。
- 笔记草稿：伴读写笔记只生成草稿，应用前看 diff。
- 伴读：右侧栏嵌入原生会话，与 Chat 共享会话，使用原生 Composer、工具卡、推理与审批；不支持 Factory 或渲染失败时退回折叠。宽度可拖动，窄屏为抽屉；选段“解释/总结/翻译”只预填输入框，不自动发送。会话就绪后切到只读沙箱。
- 工具：`reader_books`、`reader_context`、`reader_open`、`reader_read`、`reader_search`、`reader_note`、`reader_notes`；阅读纪律写入书库工作区的 `AGENTS.md`（管理块），只对该书库会话生效。

## 安装与首次使用

通过 Plugins 页面或 `plugin_manager` 安装本目录。安装前执行 `pnpm install` 和 `pnpm run build`，生成 Host 的 `dist/` 与 Client 的 `client.js`。Host 依赖 `jszip`、`linkedom`、`pdfjs-dist`、`@napi-rs/canvas`。安装后刷新页面，在左侧栏点“阅读”，选择书库目录，点“创建书库”。

## 开发

Host 与 Client 源码都是 TypeScript（`index.ts`、`src/**/*.ts`），需要 Node 22.18+。`pnpm run build` 清理 `dist/` 后用 tsc 生成 Host、esbuild 生成 `client.js`；只改 Client 可用 `pnpm run build:client`。类型检查用 `pnpm run typecheck`，测试用 `pnpm test`（先重建 `client.js`）。

## 数据

书库原文件不复制。设置、进度、会话映射与解析缓存位于 `$DSH_HOME/dsh-reader/`；EPUB 解压资源在 `assets/`，PDF 页面图片在 `cache/pages/`；解析缓存按路径 id 与文件修改时间失效。

## 限制

EPUB 不执行原书脚本，但保留 CSS/图片/字体；PDF 用页面图片 + 文本层，不做 OCR，扫描版需要自带文本层；双栏、连字和页眉页脚可能影响文本层与页面图像的重合。书内检索是字面量扫描，不是全文索引。单本默认 100 MB，书库扫描深度 3 层、最多 2000 个文件。原生伴读依赖 DSH 的 Conversation Factory 契约，升级后需复核，失败会退回折叠。
