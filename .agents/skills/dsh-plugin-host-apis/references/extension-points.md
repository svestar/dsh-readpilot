# 扩展点清单

运行时事实（token、client/host service、slot）是自动生成的：[facts.md](facts.md)。本文件只补行为说明，不复制清单。

## 常用槽位

| 槽位 | 类型 | 必需字段 | 用途 |
|---|---|---|---|
| `sidebar.panellist` | list | `id`、`order`、`label` | 侧边栏入口 |
| `main` | keyed | `key` | 主面板 |
| `settings.section` | list | `id`、`order`、`label` | 设置页分区 |
| `shell.overlay` | list | `id` | 弹窗、通知浮层 |
| `contextMenu.icon` | keyed | `key` | 菜单行图标 |
| `tool.call.toolview` | keyed | `key`（工具名） | 工具调用卡片 |
| `sidebar.right.pane.tab` | keyed | `key`（页签类型） | 右侧栏页签内容 |
| `conversation.composer.dock` | list | `id`、`order`、`label` | 输入框下方 |

- list 槽位用 `id`，keyed 槽位用 `key`。
- `label` 传 `() => t('key')`，语言切换才会刷新。
- 注册项里的 `inject` 不要包含 `hooks`，否则整条注册变 `inactive` 且无报错。

## Host 侧

| 能力 | 用法 | 注意 |
|---|---|---|
| `connection.fetch.register` | `ctx.inject(['connection'], scope => scope.effect(...))` | 已认证；返回 disposer |
| `tools.register` | `ctx.effect(() => ctx.tools.register(def))` | 工具名全局唯一 |
| `systemPrompt.context` | `ctx.inject(['systemPrompt'], ...)` | 每个上下文单独 effect；无内容返回空串 |
| `sessionPersistence.list()` | 取会话快照 | `location.path` 是日志文件路径 |
| `agents.get(sessionId)` | 取 Agent | 只有 `status === 'running'` 表示正在执行 |
| `storageDomain.open(...)` | 工作区存储 | `sessionPaths` 是启动时索引，外部移动日志后不会自动恢复 |
| `pluginDataDir(resolveDshHome())` | `$DSH_HOME/<包名>` | 多子目录自行约定（如 `library/`、`notes/`、`cache/`） |

## 客户端服务

服务名以 [facts.md](facts.md) 为准。常见组合：

- `ctx.slots`：槽位注册；
- `ctx.locale`：词典与命名空间；
- `ctx.sessions` / `ctx.uiWorkspace` / `ctx.layout`：会话、工作区与布局；
- `ctx.get('shortcuts')`、`ctx.get('resources')`：可选服务，缺失时静默跳过；
- `ctx.sidebarRightTabs` / `ctx.sidebarRight`：右侧栏页签与资源打开。

## 会话事件

| 事件 | 签名 | 用途 |
|---|---|---|
| `api-session/added` | `(summary)` | 会话进入可见目录 |
| `api-session/removed` | `(sessionId)` | 会话离开目录 |
| `api-session/status` | `(sessionId, running)` | 运行状态 |
| `api-session/activity` | `(sessionId, updatedAt)` | 最近活动 |

宿主直接改磁盘后，至少广播 `removed` / `added`，否则界面会一直显示旧行。

## 菜单顺序

会话菜单内置：pin 100、rename 200、fork 300、id 450、archive 600。自定义项取间隔值（如 700）。

## 构建产物

| 文件 | 来源 | 是否提交 |
|---|---|---|
| `dist/**` | `tsc -p tsconfig.build.json` | 否 |
| `client.js` | `scripts/build-client.ts`（esbuild，IIFE + module loader footer） | 否 |
| `index.js` | 模板自带的入口 stub | 是 |
| `locale/*.json` | 手工维护，随包发布 | 是 |
