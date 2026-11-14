import { PluginError } from './lib/errors.ts'
import type { HostModule, RpcHandler } from './types.ts'

export interface Router {
  handle(endpoint: unknown, payload: unknown): Promise<unknown>
}

export function createRouter(modules: readonly HostModule[]): Router {
  const handlers = new Map<string, RpcHandler>()
  for (const module of modules) {
    for (const [endpoint, handler] of Object.entries(module.handlers)) {
      if (handlers.has(endpoint)) throw new Error(`Duplicate RPC endpoint: ${endpoint}`)
      handlers.set(endpoint, handler)
    }
  }

  return {
    async handle(endpoint, payload) {
      if (typeof endpoint !== 'string') {
        throw new PluginError('bad-request', 'RPC endpoint must be a string')
      }
      const handler = handlers.get(endpoint)
      if (!handler) {
        throw new PluginError('unknown-endpoint', `未知接口：${endpoint}`)
      }
      return handler(payload)
    },
  }
}
