---
name: dsh-plugin-scaffold
description: Bootstrap a DSH plugin from the dsh-plugin-kit template. Use when the user asks to create, regenerate, scaffold, or strip a plugin panel, or to choose a panel, headless, or minimal layout.
---

# DSH 插件脚手架

模板根目录优先取 `DSH_KIT_TEMPLATE`；未设置时用本 skill 的 `../../template`（即 kit 仓库的 `template/`）。目录不存在时先问用户，不要猜路径，也不要在生成前修改模板本身。

独立安装到其他 skill 目录时，`../../template` 不存在，必须设置 `DSH_KIT_TEMPLATE=<kit>/template`；否则本 skill 只能阅读流程，不能生成项目。

## 只问三个问题

1. 新插件放在哪个目录？
2. 包名和显示标题是什么？
3. 一句话描述是什么？

其余用默认值：`panel` profile、`sidebar.panellist` + `main` 面板、示例 `ping` 模块。包名同时决定 patch id、Client id、main key、RPC 路径、数据目录、locale NS 和构建全局名，不要另起一套命名。

## 生成

在 kit 根目录执行（`pnpm kit:create` 会转发到 `template/scripts/create-plugin.mjs`）：

```powershell
pnpm kit:create -- ..\my-plugin `
  --name my-plugin `
  --title "我的插件" `
  --description "一句话说明"
```

选项按需追加：

| 选项 | 作用 |
|---|---|
| `--profile panel` | 默认：侧栏 + 主面板 + settings/toolview/overlay |
| `--profile minimal` | 生成后自动移除侧栏/主面板，保留 settings/toolview/overlay |
| `--profile headless` | 只要 Host 半边；删除 `src/client` 与客户端构建 |
| `--profile full` / `bare` | 兼容别名，分别等于 panel / headless |
| `--no-example` | headless 的别名 |
| `--title-en` / `--description-en` | 英文 locale 与客户端标签；不传时从包名推导 |
| `--strict` | 示例业务词（`PING_`、`PingState`）也按残留失败 |
| `--dry-run` | 只打印将写入的目标与名称 |
| `--install` | 安装依赖并运行 `pnpm run verify`；不等于安装到 DSH |
| `--git` | 初始化 Git 并提交初始源码 |

生成器会复制模板（跳过自身、`node_modules`、`dist`、`client.js`、`examples`、`scripts/create`），替换包名、Client id、RPC 路径、数据目录、locale NS、构建全局名、README/FTR 标题，并重写中文/英文两套客户端标签。`headless` 会额外写空 `src/host/app.ts`、只含 FTR-004 的索引与 Host-only README，并移除 `dsh.client`、`client.js` 与客户端构建脚本。

## 去掉主面板

对已生成的 panel 项目：

```powershell
pnpm kit:strip-panel --dir ..\my-plugin
```

脚本会删除 `modules/home`、`app.ts`、`styles/home.ts`、`panel-icon.ts`，同步 `styles/index.ts`、`tests/client-slots.test.ts`、FTR-001/003 与索引；不要按旧文档手工逐项删。

## 生成后

1. 检查生成目录、profile 与残留扫描结果；有示例业务词警告时告知用户。
2. 只有用户要求时才运行 `pnpm install` 和构建。
3. 只有用户要求时才初始化 Git 或提交。
4. 只有用户要求时才安装到 DSH；`plugin_manager install_bundle <绝对路径>` 必须在前置构建成功后执行，并确认 Host 行和 Client 行都是 `applied`。
5. 已安装时再查 `sidebar.panellist` / `main`，并调用示例工具。
6. 没有实际页面操作时，不要声称 UI 已验证。

## 验收命令

- `pnpm run verify`：typecheck、boundaries、build、test、体量、文档、打包检查。
- `pnpm run smoke`：一次性 `DSH_HOME` 执行 `dsh plugin add`，断言 profile 清单与 `--dump-config` 含本插件；只证明装得上，不证明运行时激活。

## 改动怎么生效

| 改动 | 生效方式 |
|---|---|
| `src/client/**` 后重建 `client.js` | 客户端热加载 |
| `dist/**`（宿主半边） | 宿主 HMR 监听已链接包的目标，重建后自动重载 |
| `package.json`、`cordis.patch.yml`、profile 依赖 | 重新装载或重启 |

## 不要做

- 不要手工逐处改模板标识符；让生成器负责。
- 不要在未获授权时安装依赖、初始化 Git、安装插件或 push。
- 不要在生成前修改模板目录。
- 不要把 `node_modules`、`dist`、`client.js` 提交进新仓库。
- 不要为通过检查提高 `scripts/check_*` 的上限。

## 完成定义

默认情况下，新目录只包含干净源码和残留检查结果。若用户选择了 `--install` / `--git` / DSH 安装，再分别报告对应命令与结果。
