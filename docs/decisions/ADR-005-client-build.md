# ADR-005：Client 源码模块化，esbuild 生成单文件产物

- **状态：** accepted
- **日期：** 2026-11-02
- **范围：** `client.js`、`src/client/`、构建流程

## 背景

`client.js` 长期是手写的单文件 Client artifact，已超过 2300 行、约 100 KB。DSH 的 Client 产物必须是单个 `window.__ModuleLoader__.load` 工厂，浏览器不会按相对路径加载源码；因此不能简单地把文件改成多个带 `import` 的源码。

## 决策

1. 源码放在 `src/client/`，按职责拆分为入口、运行时绑定、locale、样式、纯函数、视图与 hooks 模块。
2. 状态逻辑按领域拆为 `useCompanion`、`useSearch`、`useNotes`、`useVisual`；`ReaderPanel` 只负责组合这些 hooks 与布局。
3. 使用 esbuild 把 `src/client/index.js` 打包为单文件 `client.js`；React 由 loader 注入，不打包 React。
4. 生成产物末尾注册 DSH 工厂：
   `window.__ModuleLoader__.load({ id: 'dsh-reader', factory: require => __dshReaderBundle.create(require) })`。
5. `client.js` 是生成物，不再手工修改；开发与安装前运行 `pnpm run build:client`。
6. 测试继续导入生成的 `client.js`，纯函数也可直接测试源码模块。

## 备选方案

- 无构建拼接：不需要 esbuild，但源码片段共享同一闭包，没有模块边界，组件依赖不清晰。
- 多个 Client 插件：阅读器、伴读、笔记共享同一 React 树与状态，拆插件会引入跨插件同步。
- 保持单文件：改动成本最低，但文件继续膨胀，无法按职责维护。

## 后果

收益：源码可按功能定位，组件与纯函数边界清晰，后续可继续拆 ReaderPanel；构建后仍满足 DSH 单 artifact 约束。

代价：增加 esbuild devDependency 和构建步骤；`client.js` 不能手改；源码与产物必须同步，安装前忘记构建会运行旧 UI。`pnpm install` 需要允许 esbuild 的安装脚本（见 `pnpm-workspace.yaml` 的 `allowBuilds`）。

验证：`pnpm run build:client` 成功；`tests/client-chat.test.js`、`palette`、`highlight` 等继续通过；安装后刷新页面确认阅读器 UI 正常。
