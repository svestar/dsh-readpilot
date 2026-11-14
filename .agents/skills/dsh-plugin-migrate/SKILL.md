---
name: dsh-plugin-migrate
description: Migrate an existing DSH plugin into the dsh-plugin-kit template. Use when moving a large plugin, re-splitting host modules, sharing wire contracts, migrating tests and FTR docs, or reproducing a previous migration.
---

# 迁移进 DSH 插件模板

适用对象：已经在运行、但根文件或单体模块过大的插件。目标不是重写功能，而是把现有代码切成模板的职责单元，并让 `pnpm run verify` 重新变绿。

目录映射、迁移顺序与每步验收见 [migration.md](references/migration.md)；先读它，再按下面执行。

## 迁移前

1. 记录旧仓库 HEAD、当前 `dsh --version`、现有测试与页面行为；迁移期间旧仓库保持可运行。
2. 在 kit 根目录生成空项目：`pnpm kit:create -- <目标目录> --name <包名> --title <标题> --profile headless|panel`。
3. 先迁 `src/host/lib`，再迁 `src/shared/contracts`，最后迁业务模块；不要先搬 UI。
4. 每迁完一个模块跑一次 `pnpm run verify`，不要最后一次性修。

## 映射要点

- 旧 `api.ts` / `plugin.ts` / `styles.ts` 不是必须保留的层级：按 feature 拆到 `src/host/modules/<feature>/` 与 `src/client/modules/<feature>/`。
- 线形类型、endpoint 名、键集放 `src/shared/contracts/<feature>.ts`；`src/shared/contracts/index.ts` 的 `OPERATIONS` 是唯一登记处。
- 浏览器 RPC 只留一个 `src/client/lib/rpc.ts`；页面状态放 `src/client/modules/<feature>/use-*.ts`。
- 宿主测试替身放 `tests/support/fake-host.ts`，客户端槽位测试放 `tests/support/fake-client.ts`。
- 旧 README 只保留项目事实；架构说明链接 `template/README.md`，不要复制两份。

## 文档与测试

- 每个可独立验收的行为建 FTR；代码和测试路径必须真实存在，锚点必须在声明的测试文件里。
- 旧测试按“模块 → 契约 → 路由/工具 → 客户端槽位”迁移；不要为了过门禁删测试。
- 每完成一个模块：更新索引、补 FTR、提交一次；最后再写 ADR 和 README。

## 验收

- `pnpm run verify` 全绿（typecheck、boundaries、build、test、sizes、docs、check:package）。
- `client` 只 import `src/shared` 与 `src/client`；`check-boundaries` 通过。
- 生成物安装到临时 `DSH_HOME`：`pnpm run smoke`。
- 在真实页面触发至少一个槽位和一个工具；`plugin_manager list_plugins` 显示 `fiberPhase: active`。

## 不要做

- 不要把旧项目的 `node_modules`、`dist`、`client.js` 带进来。
- 不要保留两套契约；先合并到 `src/shared/contracts` 再改调用方。
- 不要在迁移提交里顺手改业务行为；先等价搬迁，再单独提交改进。
