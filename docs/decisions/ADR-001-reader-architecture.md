# ADR-001：阅读器采用静态双端扩展

- **状态：** accepted
- **日期：** 2026-11-02
- **范围：** FTR-001、FTR-002、FTR-003、FTR-004

## 背景

需要在 DSH Web GUI 中阅读 txt、md、epub、pdf 电子书，并让模型能按章节、按定位符读取与引用。书库由用户指定一个本机目录，书籍原地读取；每本书需要一个可长期保留的 AI 伴读会话，会话必须出现在书库对应的工作区中。

DSH 提供两种插件形态：静态 Cordis Bundle（npm 包，Host 与 Client 两个半端）与动态 Cordis Package（`cordis_define` 创建，Host 半在 `node:vm` 沙箱，Client 半在闭包中执行）。阅读器需要 pdfjs 等 npm 解析库、持久化书库、注册 Agent 工具和主面板，这些能力超出动态包的沙箱与生命周期。

## 决策

1. 采用静态 Bundle：`package.json` 的 `dsh.bundle.patch` 插入一行 Host 插件，`dsh.client` 声明浏览器半端；Host 负责扫描、解析、缓存、工具与 HTTP 接口，Client 负责主面板阅读界面。
2. 阅读器是 `main` 面板的独立入口，不占用 `conversation.view`；书库路径配置成功后，用 `workspaceRegistry` 把该目录注册为 DSH 工作区，并把 `workspaceId` 持久化。
3. 每本书在 `sessions.json` 中保存一个 `sessionId`。首次提问时用 `uiWorkspace.connectWorkspace` 在该书库工作区创建会话，之后复用；会话列表因此自然留在书库工作区。
4. 书籍原地读取，不复制；解析产物缓存在 `$DSH_HOME/dsh-reader/cache`，以文件路径生成的稳定 id 加 `mtime`、`size` 失效。
5. Host 用 `connection.fetch.register` 注册 `/api/dsh-reader` 精确路由，Client 用同源 `fetch` 调用；该路由继承 `/api` 的浏览器 cookie 鉴权，不注册无鉴权的裸 HTTP 路由。
6. PDF 在 M3 只做文本抽取与页锚点，不做像素渲染；扫描版 PDF 明确不支持。

## 备选方案

- 动态 Cordis Package：无法使用 npm 解析库、无法长期保存书库，且需要浏览器审批，放弃。
- 浏览器上传文件后复制到 `$DSH_HOME`：实现更简单，但用户明确要求直接打开工作区路径，放弃。
- 把阅读器做成 `conversation.view` 标签页：依附非空会话，切到阅读视图后看不到对话，放弃。
- 使用 SQLite FTS：引入 native 依赖，首版用线性检索，放弃。
- 阅读器放右侧栏：宽度不足，长文阅读体验差，放弃。

## 后果

收益：Host 可以直接使用 Node 解析库，书库与工作区、会话形成稳定归属；Client 不引入额外的服务端页面；精确 HTTP 路由复用现有 cookie 鉴权。

代价：静态 Bundle 需要自行构建客户端产物，升级 DSH 后要复核槽位与服务签名；书库工作区会成为用户侧边栏中的可见条目，需要在配置时说明。

验证：逐个运行 `node <测试文件>` 覆盖解析、扫描、配置、会话映射与工具；安装后确认侧边栏入口、主面板、书库工作区与工具注册都存在。
