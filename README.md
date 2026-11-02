# dsh-reader

DSH Web GUI 的电子书阅读插件。书库是一个用户指定的本机目录；配置后该目录会注册为独立的 DSH 工作区，每本书的伴读会话都保留在这个工作区里。

## 当前能力

- 书库：扫描配置目录中的 `.txt`、`.md`、`.epub`、`.pdf`；四种格式均可读，EPUB 按 spine 解析，PDF 抽取文本层并渲染页面。书库支持最近阅读、自定义标签分类、书名/标签搜索与排序。
- 阅读：PDF/EPUB 使用页面视觉阅读——PDF 显示页面图片并叠加可选文本层，EPUB 用 iframe 保留原书 CSS/图片/字体；txt/md 使用文本块。支持目录、进度、搜索与笔记；笔记引文在正文高亮，点击高亮可编辑，笔记列表可跳转；配色可跟随 DSH 深浅色，或选择浅色、深色、羊皮纸、护眼绿、夜间。
- 伴读：阅读界面右侧有伴读栏，显示会话历史并可输入；宽度可拖动，用户消息右对齐、助手消息左对齐并支持基础 Markdown；窄屏下是可折叠抽屉；选中正文后的“解释 / 总结 / 翻译”只把引用和问题预填到输入框，不自动发送。
- 工具：`reader_books`、`reader_context`、`reader_open`、`reader_read`、`reader_search`、`reader_note`，供模型按需读取、检索和记笔记；阅读助手纪律写入书库工作区的 `AGENTS.md`（管理块），只对该书库会话生效。

## 安装与首次使用

通过 Plugins 页面选择本地目录安装，或使用 `plugin_manager` 的 `install_bundle` 指向本目录。本地目录安装前先在本目录执行 `pnpm install`，再执行 `pnpm run build:client` 生成 `client.js`。Host 端依赖 `jszip`、`linkedom`、`pdfjs-dist`、`@napi-rs/canvas`。安装后刷新页面，在左侧栏点“阅读”，输入或选择书库目录，点“创建书库”。

## 开发

Client 源码在 `src/client/`，`client.js` 由 esbuild 生成，不要手工修改。改动 Client 后运行 `pnpm run build:client`，再刷新页面。

## 数据

书库原文件不复制。设置、进度、会话映射与解析缓存位于 `$DSH_HOME/dsh-reader/`；EPUB 解压资源在 `assets/`，PDF 页面图片在 `cache/pages/`；书籍解析缓存以路径生成的稳定 id 加文件修改时间失效。

## 限制

EPUB 不执行原书脚本，但保留 CSS/图片/字体；PDF 以 PDF.js 页面图片 + 文本层显示，不做 OCR，扫描版需要自带文本层；PDF 双栏、连字和页眉页脚可能影响文本层与页面图像的重合。书内检索是字面量扫描，不是全文索引。单本书默认限制 100 MB，书库扫描深度 3 层、最多 2000 个文件。
