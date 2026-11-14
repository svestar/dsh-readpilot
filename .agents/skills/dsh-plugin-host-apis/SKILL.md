---
name: dsh-plugin-host-apis
description: Reference for DeepSeek Harness host and client extension points and their pitfalls. Use when writing plugin RPC routes, slots, service injection, system prompt context, shortcuts, resources, or debugging entries that fail to appear.
---

# DSH 宿主与客户端扩展点

当前 kit 验证的运行时是 `0.2.2-rc.2`。token、service、slot 的完整清单由安装版生成在 [facts.md](references/facts.md)；本文件不手写这些事实。升级 DSH 后按 `docs/updating-facts.md` 重新生成，不要凭记忆改结论。

## 底线

- 所有注册都放进 `ctx.effect`，并返回清理函数；异步 disposer 要 `await`。
- `client` 只 import `src/client` 与 `src/shared`；不要运行时 import `src/host`，否则宿主代码会被打进 `client.js`。
- 拿不准的接口先写最小测试或用 `cordis_inspect_query` 查，不要照着记忆写。

## Host RPC（JSON 信封）

一个路由 + `{ endpoint, payload }` 信封覆盖多个操作，省掉重复的鉴权、体量与错误处理。

<!-- example: template/examples/host-rpc.ts -->
```ts
/**
 * Example: one authenticated JSON route for every RPC operation.
 *
 * The route is registered inside `ctx.inject` and `ctx.effect`, so unloading
 * the plugin removes it. The handler owns body parsing and the
 * `{ ok: true, value } | { ok: false, error }` envelope.
 */
function json(value: unknown, status = 200): Response {
  return new Response(JSON.stringify(value), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  })
}

export function registerRpcRoute(
  ctx: any,
  path: string,
  handle: (endpoint: unknown, payload: unknown) => Promise<unknown>,
): void {
  ctx.inject(['connection'], (scope: any) => {
    scope.effect(() => scope.connection.fetch.register({
      path,
      methods: ['POST'],
      requestBody: 'buffered',
      fetch: async (request: Request) => {
        let body: any
        try {
          body = await request.json()
        } catch {
          return json({ ok: false, error: { code: 'bad-request', message: '请求体不是合法 JSON' } }, 400)
        }
        try {
          return json({ ok: true, value: await handle(body?.endpoint, body?.payload) })
        } catch (error) {
          return json({
            ok: false,
            error: {
              code: (error as any)?.code ?? 'plugin-error',
              message: error instanceof Error ? error.message : String(error),
            },
          }, 400)
        }
      },
    }), 'my-plugin: RPC')
  })
}
```

- `register` 返回的 disposer 必须放进 `ctx.effect`；模块多了以后把这段抽到 `src/host/http.ts`。
- 路由位于已认证连接之后，**不需要**自己写回环地址检查；未知路径也被认证栅栏挡成 401，不要用 401/404 判断路由是否存在。
- 参数错误用 400，服务端异常用 500；不要把内部错误消息无条件回给浏览器。
- `connection.fetch` 没有文档化的请求体上限；大文件走 GET，JSON 入口自限大小。

## 二进制 / HTML 资源路由

封面、PDF 页、EPUB 章节这类内容不要塞进 JSON。另注册 GET 路由，从 URL 取参数。

<!-- example: template/examples/media-route.ts -->
```ts
import type { MediaRoute } from '../src/host/types.ts'

/**
 * Example: a GET route for binary or document content.
 *
 * Return `null` for "not found"; throw for a real server error. Large payloads
 * stay out of the JSON envelope, and immutable content gets a long cache.
 */
export const coverRoute: MediaRoute = {
  path: '/api/my-plugin/cover',
  maxAge: 3600,
  async load(request) {
    const bookId = request.searchParams.get('bookId')
    if (!bookId) return null
    return { body: new Uint8Array(), contentType: 'image/png' }
  },
}
```

- 参数缺失或非法返回 400，资源不存在返回 404，异常不要穿透成 500。
- 不可变内容加长缓存；逐页渲染的内容按失效策略设置，宁可 `no-store`。
- 大文件在 handler 内自限大小与并发。

## 拿宿主服务

`ctx.get('xxx')` 在对方尚未激活时返回 `undefined`。需要等待时用 `ctx.inject(['contextMenus'], scope => scope.effect(...))`，服务就绪后才注册；不要用 `ctx.get` 猜时机。

需要静态回退时，先注册回退，服务就绪后再切换并释放回退。服务与事件名以 `references/facts.md` 和 `cordis_inspect_query` 为准。

## 系统提示上下文

<!-- example: template/examples/system-prompt.ts -->
```ts
/**
 * Example: per-session context injected into the system prompt.
 *
 * `text` receives the assembly context, not an Agent; resolve the session you
 * need from your own state. Return an empty string to skip the contribution.
 */
export function registerPromptContext(ctx: any, text: () => string): void {
  ctx.inject(['systemPrompt'], (scope: any) => {
    scope.effect(() => scope.systemPrompt.context({
      name: 'my-plugin:context',
      order: 9500,
      interpolate: false,
      text: () => text(),
    }), 'my-plugin: prompt context')
  })
}
```

- `text` 收到的是 assembly context，不是 `Agent`；需要按 agent 注入时用 `agent.inject()`。
- 无内容时返回空串，不要返回 `undefined`。
- `order` 留间隔（如 9500 / 9510 / 9520），便于以后插入。

## 客户端槽位

槽位完整清单见 [facts.md](references/facts.md)。常用挂载点：

| 需求 | 槽位 | 注册字段 |
|---|---|---|
| 侧边栏入口 | `sidebar.panellist` | `id`、`order`、`label` |
| 主面板 | `main` | `key` |
| 设置页 | `settings.section` | `id`、`order`、`label` |
| 浮层（弹窗、通知） | `shell.overlay` | `id` |
| 菜单行图标 | `contextMenu.icon` | `key` |
| 工具调用视图 | `tool.call.toolview` | `key`（工具名） |
| 右侧栏页签 | `sidebar.right.pane.tab` | `key`（页签类型） |
| 输入框下方 | `conversation.composer.dock` | `id`、`order`、`label` |

<!-- example: template/examples/settings-slot.ts -->
```ts
/**
 * Example: one `settings.section` registration.
 *
 * `settings.section` is a list slot: `id`, `order`, and a lazy `label` that
 * follows the current locale.
 */
export function registerSettingsSection(
  ctx: any,
  SettingsView: any,
  t: (key: string) => string,
  NS: string,
): void {
  ctx.effect(() => ctx.slots.inject('settings.section', () => ctx.slots.register({
    name: 'settings.section',
    id: 'my-plugin',
    order: 200,
    label: () => t('settingsTitle'),
    locale: NS,
  }, SettingsView)), 'my-plugin: settings section')
}
```

- list 槽位要 `id`，keyed 槽位要 `key`；`label` 传 thunk 才会跟随语言切换。
- 每个槽位组件自带样式；不要依赖 `main` 面板的 `App` 注入 CSS，否则主面板未挂载时浮层会透明地出现在左上角。
- **不要往注册项的 `inject` 里塞 `hooks`**：槽位自己已声明 hooks 时，重复声明会把整条注册标成 `inactive`，没有任何报错。
- 不要 replace `root`，不要往 `document.body` 追加第二套应用。

## 其它客户端扩展

- 快捷键：`template/examples/shortcuts.ts`（kit 仓库），缺服务时静默跳过。
- 资源协议：`template/examples/resources.ts`（kit 仓库），每轮 `yield` 一次快照，用 `signal` 退出。
- 右侧栏页签：`template/examples/sidebar-right-tab.ts`（kit 仓库），先注册 tab 类型，再往 `sidebar.right.pane.tab` 注册 `key`。

## 主题令牌

真实/不存在的 token 都在 [facts.md](references/facts.md)。最容易写错的是把不存在的名字加上浅色 fallback，例如 `--dsw-alias-bg-elevated`、`--dsw-alias-bg-primary`：`var()` 永远走 fallback，这就是深色模式白底弹窗的来源。弹窗和按钮优先用 UI 套件，或使用 `--dsw-alias-bg-overlay`。

## 插件配置

<!-- example: template/examples/config.ts -->
```ts
import z from '@deepseek-ai/schemastery'

/** User-editable values from the profile patch. */
export interface Config {
  enabled: boolean
}

export const Config = z.object({
  enabled: z.boolean().default(true).description('Enable the plugin.'),
})

export function apply(_ctx: any, config: Partial<Config> = {}): void {
  if (config.enabled === false) return
}
```

DSH 用导出的 `Config` 校验并在 `apply` 前补默认值；默认值同时写在 `apply` 的默认参数里，让直接调用（测试）也拿得到。

## 客户端清单字段

| 字段 | 0.2.2 实测 |
|---|---|
| `platform` | `'web'`，声明浏览器半边 |
| `external` | 平台模块表之外的模块请求，组合期据此建立依赖边 |
| `inject` | 会被校验为字符串数组并参与激活顺序；只填真正依赖的服务 |
| `immediately` | 是否进首屏批次 |

`dsh.plugin.json` 不是 DSH 契约；包清单来自 `package.json` 的 `dsh` 字段。图标标准是 `exports["./icon"]`；package-root 插件的顶层 `icon` 是可选替代。

## Typert Remote

需要严格 codec 与模型可见签名时用。一个方法要落四样东西：`contract.ts` 的 `InvocationDescriptor`、`@Remote` 标注的 runtime、`typert.ts` 的模型层 manifest、`client/remote.ts` 的命名空间声明，并用测试断言宿主与浏览器指向同一份 descriptor。简单 CRUD 用 `connection.fetch` 信封更省事。

## 自检

- 插件是否装载：`plugin_manager list_plugins` 看 `fiberPhase` 是否 `active`；`Config.listConfigs name=<包名>`。
- 槽位是否注册：`Slots.listSubTree root=<槽位>` 看 occupants 是否为 `active`。
- 主题令牌：`Theme.listTokens`。
- 路由是否活着：用真实请求或页面操作确认，不要用 401/404 判断。

## 详细资料

- 扩展点与服务说明：[extension-points.md](references/extension-points.md)
- 故障排查树：[troubleshooting.md](references/troubleshooting.md)
- 运行时事实：[facts.md](references/facts.md)
- 可编译片段：`template/examples/`（kit 仓库）
