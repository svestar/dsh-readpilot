# 迁移映射与顺序

这份指南随 `dsh-plugin-migrate` skill 发布，不依赖 kit 仓库里的 `template/MIGRATE.md`。

## 目录映射

| 旧位置 | 新位置 |
|---|---|
| `src/host/*.ts` 聚合逻辑 | `index.ts` + `src/host/app.ts` + `src/host/http.ts` |
| 每个业务模块 | `src/host/modules/<feature>/`（handlers/service/store/tools/index） |
| 线形类型与 endpoint 常量 | `src/shared/contracts/<feature>.ts`，`src/shared/contracts/index.ts` 聚合 `OPERATIONS` |
| 浏览器 RPC 调用 | `src/client/lib/rpc.ts` |
| 页面 / hook / 样式 | `src/client/modules/<feature>/` + `src/client/styles/` |
| 宿主测试替身 | `tests/support/fake-host.ts` |
| 客户端槽位测试 | `tests/support/fake-client.ts` |

## 顺序

1. `src/host/lib`（fs-json、write-queue、errors、limit）先搬，保持独立；
2. `src/shared/contracts` 按模块拆契约，建 `OPERATIONS`；
3. 一个模块一个模块搬 service → handlers → tools → index；
4. `src/host/app.ts` 注册模块，`http.ts` 收集 JSON 与媒体路由；
5. 客户端按槽位搬 `register.ts` / 视图 / hook / 样式；
6. 迁移测试替身与测试；
7. 重建 FTR、索引、ADR；跑 `pnpm run verify`；
8. 每完成一个模块提交一次，不把所有模块塞进一个提交。

## 验收

- `pnpm run verify` 通过（typecheck、boundaries、build、test、sizes、docs、check:package）；
- 每个 FTR 的代码/测试路径真实存在，锚点在声明的测试文件里；
- `client` 只 import `src/client` 与 `src/shared`；
- `plugin_manager list_plugins` 显示 `fiberPhase: active`，页面槽位真实出现。
