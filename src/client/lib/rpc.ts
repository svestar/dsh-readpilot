import type { RpcResponse } from '../../shared/contract.ts'
import type { CallRpc } from '../types.ts'

function codedError(message: string, code: string): Error & { code: string } {
  const error = new Error(message) as Error & { code: string }
  error.code = code
  return error
}

/**
 * The one browser-side RPC caller: POST `{ endpoint, payload }`, unwrap the
 * envelope, and re-attach the Host error `code` to the thrown Error.
 *
 * `isReady` is optional so unit tests can call it without a Host connection;
 * the panel passes a check for the connection service it binds at apply time.
 */
export function createRpc(path: string, isReady?: () => boolean): CallRpc {
  return async (endpoint: string, payload?: unknown): Promise<any> => {
    if (isReady && !isReady()) throw codedError('连接服务不可用', 'client-offline')
    // Module operations use `notes.list` style names; the wire carries the
    // module endpoint plus an `action` field, as the Host handlers expect.
    const dot = endpoint.indexOf('.')
    const wireEndpoint = dot >= 0 ? endpoint.slice(0, dot) : endpoint
    const wirePayload = dot >= 0
      ? { ...(payload as Record<string, unknown> | undefined ?? {}), action: endpoint.slice(dot + 1) }
      : payload ?? null
    let response: Response
    try {
      response = await fetch(path, {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ endpoint: wireEndpoint, payload: wirePayload }),
      })
    } catch (error) {
      throw codedError(
        `无法连接阅读器服务：${error instanceof Error ? error.message : String(error)}`,
        'client-connect-failed',
      )
    }

    let result: RpcResponse<unknown> | null = null
    try {
      result = await response.json() as RpcResponse<unknown>
    } catch {
      result = null
    }
    if (!result) throw codedError(`阅读器服务返回了无效响应（HTTP ${response.status}）`, 'client-invalid-response')
    if (result.ok !== true) {
      throw codedError(
        result.error?.message || `请求失败（HTTP ${response.status}）`,
        result.error?.code || 'client-request-failed',
      )
    }
    return result.value
  }
}
