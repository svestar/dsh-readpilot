/**
 * A Host context stand-in for tests.
 *
 * `apply()` only touches a small, fixed set of context members — `effect`,
 * `inject`, `get`, `tools.register` and `connection.fetch.register` — so a
 * plugin's real HTTP surface can be exercised without booting DSH. Extra
 * services a test needs are passed in through `services`, exactly as `ctx.get`
 * would see them.
 */

export interface FakeRoute {
  path: string
  methods: readonly string[]
  requestBody: string
  fetch(request: Request): Promise<Response>
}

export interface FakeHost {
  /** The context to pass to the plugin's `apply`. */
  ctx: any
  /** Fetch routes the plugin registered, in order. */
  routes: FakeRoute[]
  /** Tool definitions the plugin registered, in order. */
  tools: any[]
  /** Issue one request against a registered route path. */
  request(path: string, init?: RequestInit): Promise<Response>
  /** Send one `{ endpoint, payload }` call through the RPC route. */
  call(endpoint: unknown, payload?: unknown): Promise<{ status: number; body: any }>
  /** Run every effect disposer the plugin handed back. */
  dispose(): void
}

export function createFakeHost(options: { services?: Record<string, unknown> } = {}): FakeHost {
  const routes: FakeRoute[] = []
  const tools: any[] = []
  const disposers: Array<() => void> = []
  const services = new Map<string, unknown>(Object.entries(options.services ?? {}))

  const scope: any = {
    get(name: string) {
      return services.get(name)
    },
    effect(callback: () => unknown) {
      const dispose = callback()
      if (typeof dispose === 'function') disposers.push(dispose as () => void)
      return dispose
    },
    tools: {
      register(definition: unknown) {
        tools.push(definition)
        return () => {}
      },
    },
    connection: {
      fetch: {
        register(route: FakeRoute) {
          routes.push(route)
          return async () => {}
        },
      },
    },
  }
  // `connection` is provided by the fake itself, so `inject` resolves it like
  // any other service instead of special-casing its name.
  services.set('connection', scope.connection)
  // The reader always registers its three prompt contexts on `apply`.
  const systemPrompt = {
    context() {
      return () => {}
    },
  }
  services.set('systemPrompt', systemPrompt)
  // Cordis exposes injected services on the scope itself.
  for (const [name, value] of services) (scope as any)[name] = value
  scope.systemPrompt = systemPrompt

  // `inject` is both a readiness gate and an effect: the template nests its route
  // registration inside it, so the fake must run the callback synchronously.
  scope.inject = (dependencies: string[], callback: (scope: any) => unknown) =>
    scope.effect(() => {
      const missing = dependencies.filter(name => !services.has(name))
      if (missing.length > 0) throw new Error(`fake host has no service: ${missing.join(', ')}`)
      return callback(scope)
    })

  const request = async (path: string, init: RequestInit = {}): Promise<Response> => {
    const route = routes.find(item => item.path === path)
    if (route === undefined) throw new Error(`the plugin registered no route: ${path}`)
    return route.fetch(new Request(`http://127.0.0.1${path}`, init))
  }

  return {
    ctx: scope,
    routes,
    tools,
    request,
    async call(endpoint, payload) {
      const route = routes.find(item => item.methods.includes('POST'))
      if (route === undefined) throw new Error('the plugin registered no RPC route')
      const response = await request(route.path, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ endpoint, payload }),
      })
      return { status: response.status, body: await response.json() }
    },
    dispose() {
      for (const dispose of disposers.reverse()) {
        try {
          dispose()
        } catch {
          // Teardown of a test double is best effort.
        }
      }
      disposers.length = 0
    },
  }
}
