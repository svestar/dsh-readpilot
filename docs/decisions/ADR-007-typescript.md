# ADR-007：TypeScript 源码与双产物构建

- **状态：** accepted
- **日期：** 2026-11-03
- **范围：** `index.ts`、`src/**/*.ts`、`tests/**/*.ts`、构建与测试流程

## 背景

工程原为 JavaScript 源码：Host 入口 `index.js` 由 DSH 直接加载，Client 源码在 `src/client/` 由 esbuild 打包为 `client.js`。浏览器不能按相对路径加载 Client 源码，Host 也没有约定的 TypeScript 运行时，因此不能只改扩展名。

## 决策

1. 仓库内可维护源码统一为 TypeScript：`index.ts`、`src/**/*.ts`、`tests/*.test.ts`、`scripts/build-client.ts`；相对导入写 `.ts` 扩展名。
2. Host 由 `tsc -p tsconfig.build.json` 输出到 `dist/`，保持 Node ESM 结构，不打包依赖；`rewriteRelativeImportExtensions` 把产物中的导入改回 `.js`。`package.json` 的 `main` 与 `exports` 指向 `dist/index.js`；包根保留 `index.js` 作为 Cordis 加载器入口，转导出 `dist/index.js`。
3. Client 仍由 esbuild 直接从 `src/client/index.ts` 打包为单文件 `client.js`；不输出 `dist/src/client/`。
4. 测试由 Node 原生类型剥离直接运行 `.ts`，不经过编译；`tsc --noEmit` 只做类型检查。
5. `dist/` 与 `client.js` 都是生成物：`dist/` 不入版本库，`client.js` 作为 Client 产物保留；安装前运行 `pnpm run build`。
6. 两个 tsconfig：根配置负责全量检查，`tsconfig.build.json` 只编译 Host；两者都启用 `strict`、`verbatimModuleSyntax` 与 `erasableSyntaxOnly`。
7. Client 的 RPC 调用由 `src/api/rpc.ts` 的 `CallRpc` 按 endpoint 重载；响应类型复用 Host 的 `ReaderState`、`OpenResult` 等，`src/client/types.ts` 不再重复声明这些结构。

## 备选方案

- 保留 JavaScript 并开启 `allowJs`/`checkJs`：能渐进迁移，但无法获得完整的类型约束，也与“源码即 TypeScript”目标不符。
- 依赖宿主或 tsx 运行时加载 `.ts`：减少构建，但宿主契约不保证，插件安装后行为依赖外部环境。
- 用 esbuild 打包 Host：产物更小，但 `pdfjs-dist`、`@napi-rs/canvas` 等原生依赖不适合打包。

## 后果

收益：Host 与 Client 共享类型定义，边界数据在编译期可校验；测试直接运行源码，无需额外运行器。

代价：安装前必须构建 Host；测试依赖 Node 的 TypeScript 类型剥离支持（Node 22.18+）；文档中的代码路径必须与 `.ts` 源码一致。

验证：`pnpm run typecheck`、`pnpm test`、`pnpm run build` 均通过，生成的 `dist/index.js` 可正常导入。
