# 故障排查

## 插件整体不生效

1. `plugin_manager list_plugins` 看 `fiberPhase`。不是 `active` 就先查宿主日志里的装载错误。
2. `Config.listConfigs name=<包名>` 确认配置被读入；`enabled: false` 时 `apply` 会直接返回。
3. 改了 `package.json`、`cordis.patch.yml` 或 profile 依赖后，重新装载或重启，热重载不覆盖这些。

## 报 ENOENT，指向旧目录

同名包换过路径。运行中的 DSH 会继续用启动时解析到的旧路径。

- `remove_bundle`、重新 `install_bundle`、`set_plugin` 都无效。
- 只有重启进程。

## 侧栏/菜单/设置项静默消失

1. 查注册项是否 `active`：`Slots.listSubTree root=<槽位>`。
2. 查注册项的 `inject` 里是否包含 `hooks`——会整条变 `inactive`，无报错。
3. 查 `label` 是否传了函数而不是字符串。
4. 查槽位名拼写与 list/keyed 字段是否匹配（`id` vs `key`）。

## `ctx.get('xxx')` 返回 undefined

1. 对方可能还没激活。改成 `ctx.inject(['xxx'], scope => scope.effect(...))`。
2. 名字拼错。对照 `references/extension-points.md`。
3. 对方是本插件自己 `provide` 的服务时，确认 provide 发生在读取之前。

## RPC 路由看起来“不存在”

不要用「未知路径返回 401 还是 404」判断。认证栅栏会先把两者都挡成 401。

- 用真实的登录后请求验证。
- 查 `register` 是否在 `ctx.effect` 内、是否正确 `ctx.inject(['connection'])`。
- 查路径是否与客户端 `fetch` 的路径完全一致（含包名）。

## 样式在深色模式变白底

大概率用了不存在的令牌并带浅色 fallback。

1. `Theme.listTokens` 核对。
2. 把 `var(--dsw-alias-bg-overlay, #fff)` 换成真实令牌，或改用 UI 套件的 `Modal` / `Button`。
3. 常见错误令牌：`--dsw-alias-bg-elevated`、`--dsw-alias-bg-primary`、`--dsw-alias-border-secondary`。

## 客户端构建后行为没变

- `src/client/**` 改动后必须重建 `client.js`（`pnpm run build:client`）。宿主监听的是链接包目标文件。
- 确认 `client.js` 的 `globalName` 和 footer 里的模块 id 与包名一致。
- 浏览器缓存：强刷或换无痕窗口验证。

## 工具调用卡片不显示自定义视图

- `tool.call.toolview` 的 `key` 必须等于工具注册名。
- 工具名改了但视图没改，会静默回退到默认卡片。

## 测试通过但装进 DSH 后失败

- `pnpm test` 用的是 `tests/support/fake-host.ts`，只覆盖宿主替身，不覆盖真实装载。
- 需要 `pnpm run smoke`（一次性 `DSH_HOME`）确认装得上、配置能合成。
- 仍不证明运行时激活；最终要 `plugin_manager list_plugins` + 页面操作。

## verify 失败

| 步骤 | 常见原因 | 处理 |
|---|---|---|
| typecheck | 跨半边 import、缺类型 | 共享类型放 `src/shared` |
| build | `tsconfig.build.json` 未包含新目录 | 补 include，不要改 outDir 结构 |
| test | 测试依赖未构建的 `client.js` | 先跑 `pretest` 或 `build:client` |
| sizes | 单文件超限 | 按职责拆，不抬上限 |
| docs | 路径不存在、锚点不在声明测试里、索引未登记 | 修文档，不改检查器 |
| check:package | `files` / `exports` 与实际产物不符 | 对齐 `package.json` |
