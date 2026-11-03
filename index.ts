import { createReaderApi } from './src/api.ts'
import { pluginDataDir, resolveDshHome } from './src/home.ts'
import { registerTools } from './src/tools.ts'

export const name = 'dsh-reader'
export const inject = ['tools']

function jsonResponse(value: unknown, status = 200): Response {
  return new Response(JSON.stringify(value), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  })
}

export function apply(ctx: any, config: any = {}): void {
  const api = createReaderApi({
    ctx,
    dataDir: pluginDataDir(resolveDshHome()),
    config,
  })
  void api.syncPrompt().catch(() => {})

  ctx.effect(() => registerTools(ctx, api), 'dsh-reader: tools')

  ctx.inject(['systemPrompt'], (scope: any) => {
    scope.effect(() => scope.systemPrompt.context({
      name: 'dsh-reader:reading',
      order: 9500,
      interpolate: false,
      text: ({ agent }: any) => api.companionContextOf(agent?.session?.id),
    }), 'dsh-reader: reading context')
    scope.effect(() => scope.systemPrompt.context({
      name: 'dsh-reader:notes',
      order: 9510,
      interpolate: false,
      text: ({ agent }: any) => api.notesContextFor(agent?.session?.id),
    }), 'dsh-reader: notes context')
  })

  ctx.inject(['connection'], (connectionCtx: any) => {
    connectionCtx.effect(() => {
      const register = connectionCtx.connection.fetch.register
      const disposers = [
        register({
          path: '/api/dsh-reader',
          methods: ['POST'],
          requestBody: 'buffered',
          fetch: async (request: Request) => {
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
        register({
          path: '/api/dsh-reader/pdf-page',
          methods: ['GET'],
          requestBody: 'buffered',
          fetch: async (request: Request) => {
            try {
              const url = new URL(request.url)
              const result = await api.pdfPage({
                bookId: url.searchParams.get('bookId'),
                page: Number(url.searchParams.get('page')),
                scale: Number(url.searchParams.get('scale')),
              })
              return new Response(result.png as unknown as BodyInit, {
                headers: { 'content-type': result.contentType, 'cache-control': 'private, max-age=3600' },
              })
            } catch (error) {
              return jsonResponse({
                ok: false,
                error: { code: 'pdf-page-error', message: error instanceof Error ? error.message : String(error), details: {} },
              }, 400)
            }
          },
        }),
        register({
          path: '/api/dsh-reader/epub-doc',
          methods: ['GET'],
          requestBody: 'buffered',
          fetch: async (request: Request) => {
            try {
              const url = new URL(request.url)
              const result = await api.epubDocument({
                bookId: url.searchParams.get('bookId'),
                href: url.searchParams.get('href'),
              })
              return new Response(result.html, {
                headers: { 'content-type': result.contentType, 'cache-control': 'private, max-age=60' },
              })
            } catch (error) {
              return new Response(`<pre>${String(error instanceof Error ? error.message : error)}</pre>`, {
                status: 400,
                headers: { 'content-type': 'text/html; charset=utf-8' },
              })
            }
          },
        }),
        register({
          path: '/api/dsh-reader/epub-asset',
          methods: ['GET'],
          requestBody: 'buffered',
          fetch: async (request: Request) => {
            try {
              const url = new URL(request.url)
              const result = await api.epubAsset({
                bookId: url.searchParams.get('bookId'),
                path: url.searchParams.get('path'),
              })
              return new Response(result.bytes as unknown as BodyInit, {
                headers: { 'content-type': result.contentType, 'cache-control': 'private, max-age=3600' },
              })
            } catch (error) {
              return jsonResponse({
                ok: false,
                error: { code: 'epub-asset-error', message: error instanceof Error ? error.message : String(error), details: {} },
              }, 400)
            }
          },
        }),
      ]
      return () => {
        for (const dispose of disposers) dispose()
      }
    }, 'dsh-reader: http api')
  })
}
