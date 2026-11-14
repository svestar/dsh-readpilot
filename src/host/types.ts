export interface ToolDefinition {
  name: string
  description: string
  parameters: Record<string, unknown>
  output: {
    schema: Record<string, unknown>
    render: (args: unknown, value: unknown) => Array<{ type: string; text: string }>
  }
  execute(args?: any, exec?: any): Promise<unknown>
}

export interface ToolContext {
  tools: {
    register(definition: ToolDefinition): () => void
  }
}

/** A binary or document payload served by a GET route. */
export interface MediaResult {
  body: string | Uint8Array
  contentType: string
}

/** A non-200 media response a module can own. */
export interface MediaFailure {
  status: number
  body: string | Uint8Array | null
  contentType?: string
}

/** One GET route owned by a Host module. */
export interface MediaRoute {
  path: string
  /** Build the payload for one request; return null to answer 404. */
  load(request: URL): Promise<MediaResult | null>
  /** Seconds for `private, max-age=…, immutable`; omit for `no-store`. */
  maxAge?: number
  /** Map a thrown error to the module's own status and content type. */
  errorResponse?(error: unknown): MediaFailure
}

/**
 * The subset of the Cordis Host context the template relies on.
 *
 * `ctx` is deliberately loose: modules may read any service the Host exposes,
 * while `get`/`inject`/`effect` keep the common lifecycle calls typed.
 */
export interface HostContext {
  [key: string]: any
  get(name: string): any
  inject(names: string[], callback: (scope: any) => unknown): unknown
  effect(callback: () => unknown, label?: string): unknown
}

export interface HostModuleOptions {
  dataDir: string
  ctx?: HostContext
}

export type RpcHandler = (payload: unknown) => Promise<unknown>

export interface HostModule {
  id: string
  handlers: Record<string, RpcHandler>
  tools: ToolDefinition[]
  mediaRoutes?: readonly MediaRoute[]
  dispose?(): Promise<void>
}
