# ADR-024：迁移到 kit 架构

- **状态：** accepted
- **日期：** 2026-11-14
- **范围：** 全插件

## 背景

根 `src/client/plugin.ts`（1876 行）与 `src/api/index.ts`（1517 行）同时承担组装与大部分领域逻辑；Client/Host 共享的线形类型散落在两侧，Client 直接 import Host 实现；没有文件体量、分层边界或路由级测试的可执行门禁。迁移前的测试主要直接调用服务，未覆盖 HTTP 信封与槽位注册。

## 决策

- Host 按 `src/host/modules/<feature>/` 拆分（handler/service/store/tools/index），根 `index.ts` 只做组装与配置。
- 线形契约与纯函数移入 `src/shared/contracts/`，`OPERATIONS` 单一登记；Client 只依赖 `src/client` 与 `src/shared`。
- Client 按槽位拆 `src/client/modules/<feature>/`（register、视图、use-*），样式与 locale 分片。
- 采用可执行门禁：体量 300/350/400 行、`check-boundaries`、`check-package`、文档门禁；`pnpm run verify` 串联它们。
- 测试使用 `tests/support/fake-host` 走真实注册路由，保留模块级测试；CI 运行 verify。
- 迁移以单个 squash 提交落到 `main`，旧 `main` 保留为 `backup/pre-kit`；完整迁移历史保留在 `kit-architecture`。

## 备选方案

- 只拆分两个大文件、不引入模板：改动小，但仍无边界与体量门禁，容易回退。
- 直接 rebase 到 `main`：需解决大量 add/add 冲突并删除旧文件，工作量大且历史嘈杂。
- 新仓库替换：旧仓库可保持不动，但推送到同一 origin 需要 force，发布线断裂。
- 选择当前方案：squash 到 `main`，历史连续、可快进推送，并保留旧 `main` 与迁移分支。

## 后果

- 源码约 2.4 万行、242 个文件；最大文件 383 行（hook 上限 400），267 项测试；Client→Host 与 Shared→Host 引用为 0。
- 根文件与目录职责固定；新功能必须新建模块，不能继续堆根文件。
- 文档门禁同时校验 `path:symbol` 与验收锚点；文档与代码的引用漂移会在 CI 失败。
- 迁移提交被 squash，逐提交历史只在 `kit-architecture`；旧 `main` 在 `backup/pre-kit`，确认稳定后再归档。
- 新增 `@deepseek-ai/schemastery` 依赖用于 Config 校验；包名与 `$DSH_HOME/dsh-readpilot` 数据目录保持不变。
