---
name: dsh-readpilot-feature-delivery
description: Deliver a user-facing dsh-readpilot feature from request to verified dev commit. Use when adding a feature that spans shared contracts, Host RPC, client reader UI, tests, FTR docs, and CI.
---

# dsh-readpilot 新功能交付

## 先确认事实

1. 读 `AGENTS.md`、`docs/features/index.md`、相关 FTR 和 `docs/quality-gates.md`。
2. 读 `dsh-plugin-host-apis` 的宿主事实；需要宿主能力时先确认服务是否真的挂载，而不是只看类型声明。
3. 确认分支是 `dev`；`main` 只用于发布。
4. 先给方案再写代码：范围、交互、数据流、失败行为、分阶段。用户批准前不动实现。

## 分层落地

| 层 | 位置 | 要求 |
|---|---|---|
| 线形契约 | `src/shared/contracts/` | 端点、请求/响应类型、`OPERATIONS` 注册 |
| Host 模块 | `src/host/modules/<feature>/` | `service.ts`、`store.ts`、`handlers.ts`、`index.ts`，单个职责拆分 |
| Host 装配 | `src/host/app.ts`、`src/host/api.ts` | 只装配和暴露，不堆业务 |
| Client | `src/client/modules/<feature>/` | hook 管状态，组件只管渲染 |
| 文案与样式 | `src/client/locale/`、`styles/` | 中英文同步；不留无主样式 |
| 测试 | `tests/` | Host 用 fake context，纯函数单独测；契约模块清单要更新 |
| 文档 | FTR、`docs/features/index.md`、USAGE/README/帮助 | 同一变更一起更新 |

## 从翻译功能得到的教训

- DSH 的实验性服务可能是可选的。`ctx.get('translator')` 返回 `undefined` 时必须有明确的降级或不可用 UI，不能只在类型层假设存在。
- 匿名外部能力与付费能力要分开：匿名请求不传 `sessionId`，付费路径才需要活跃会话；失败时不要静默换源。
- 缓存键必须由源文本和路由参数决定，不能键在译文上；先写失败测试再修。
- Host RPC 变更需要重启 DSH；纯 client 变更刷新页面即可。不要混为一谈。
- 长章节、批量请求、隐私提示、清除缓存都要有上限和失败路径。

## 异步与 UI 规则

- 任何第 N 页/第 N 章的异步结果都要带请求上下文；返回后先判断上下文是否仍是当前值，过期结果直接丢弃。
- 不要用 DOM 几何反推业务页码；分页器已有页码/导航 token 时优先使用它们。
- 请求开始时只记录锚点，不能在请求开始就执行恢复；恢复要等同一批次完成。
- 可见范围随滚动/翻页变化时，只追加当前可见块；不要一次翻译整本或整章无上限。
- 用户可切换的目标语言、翻译源、开关要明确哪些持久化、哪些只属于当前阅读会话。

## 验证与推送

1. `pnpm run verify`：typecheck、boundaries、build、tests、sizes、docs、package。
2. 核对 FTR 测试锚点是真实 `test()` 名，索引代码路径与 FTR 一致，FTR ≤3000 字符。
3. 手工验证真实 GUI；涉及 Host RPC 时重启 DSH，纯 client 刷新页面。
4. 推送 `dev` 后看 CI 和 Documentation checks。
5. 用户没确认行为前不要推送；修复讨论期间保持本地改动。发布只走 `main`。
