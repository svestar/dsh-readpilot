import { createReaderApi } from './src/api.js'
import { pluginDataDir, resolveDshHome } from './src/home.js'
import { registerTools } from './src/tools.js'

export const name = 'dsh-reader'
export const inject = ['tools']

function jsonResponse(value, status = 200) {
  return new Response(JSON.stringify(value), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  })
}

export function apply(ctx, config = {}) {
  const api = createReaderApi({
    ctx,
    dataDir: pluginDataDir(resolveDshHome()),
    config,
  })

  ctx.effect(() => registerTools(ctx, api), 'dsh-reader: tools')

  ctx.inject(['connection'], connectionCtx => {
    connectionCtx.effect(
      () => connectionCtx.connection.fetch.register({
        path: '/api/dsh-reader',
        methods: ['POST'],
        requestBody: 'buffered',
        fetch: async request => {
          let body
          try {
            body = await request.json()
          } catch {
            return jsonResponse({
              ok: false,
              error: { code: 'bad-request', message: '请求体不是合法 JSON', details: {} },
            }, 400)
          }
          const endpoint = body && typeof body.endpoint === 'string' ? body.endpoint : ''
          const result = await api.handleRpc(endpoint, body?.payload ?? null)
          return jsonResponse(result, result.ok ? 200 : 400)
        },
      }),
      'dsh-reader: http api',
    )
  })
}
