import { createReaderApi } from './src/api.ts'
import { pluginDataDir, resolveDshHome } from './src/home.ts'
import { registerTools } from './src/tools.ts'

export const name = 'dsh-readpilot'
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
  void api.syncCompanionContexts().catch(() => {})
  void api.syncPrompt().catch(() => {})

  ctx.effect(() => registerTools(ctx, api), 'dsh-readpilot: tools')

  ctx.inject(['systemPrompt'], (scope: any) => {
    scope.effect(() => scope.systemPrompt.context({
      name: 'dsh-readpilot:reading',
      order: 9500,
      interpolate: false,
      text: ({ agent }: any) => api.companionContextOf(agent?.session?.id),
    }), 'dsh-readpilot: reading context')
    scope.effect(() => scope.systemPrompt.context({
      name: 'dsh-readpilot:notes',
      order: 9510,
      interpolate: false,
      text: ({ agent }: any) => api.notesContextFor(agent?.session?.id),
    }), 'dsh-readpilot: notes context')
    scope.effect(() => scope.systemPrompt.context({
      name: 'dsh-readpilot:memory',
      order: 9520,
      interpolate: false,
      text: ({ agent }: any) => api.memoryContextFor(agent?.session?.id),
    }), 'dsh-readpilot: memory context')
  })

  ctx.inject(['connection'], (connectionCtx: any) => {
    connectionCtx.effect(() => {
      const register = connectionCtx.connection.fetch.register
      const disposers = [
        register({
          path: '/api/dsh-readpilot',
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
          path: '/api/dsh-readpilot/cover',
          methods: ['GET'],
          requestBody: 'buffered',
          fetch: async (request: Request) => {
            try {
              const url = new URL(request.url)
              const result = await api.cover({ bookId: url.searchParams.get('bookId') })
              return new Response(result.bytes as unknown as BodyInit, {
                headers: { 'content-type': result.contentType, 'cache-control': 'private, max-age=3600' },
              })
            } catch {
              return new Response(null, { status: 404, headers: { 'cache-control': 'no-store' } })
            }
          },
        }),
        register({
          path: '/api/dsh-readpilot/pdf-page',
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
          path: '/api/dsh-readpilot/epub-doc',
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
          path: '/api/dsh-readpilot/epub-asset',
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
        register({
          path: '/api/dsh-readpilot/book-asset',
          methods: ['GET'],
          requestBody: 'buffered',
          fetch: async (request: Request) => {
            try {
              const url = new URL(request.url)
              const result = await api.bookAsset({
                bookId: url.searchParams.get('bookId'),
                path: url.searchParams.get('path'),
              })
              return new Response(result.bytes as unknown as BodyInit, {
                headers: { 'content-type': result.contentType, 'cache-control': 'private, max-age=3600' },
              })
            } catch (error) {
              return jsonResponse({
                ok: false,
                error: { code: 'book-asset-error', message: error instanceof Error ? error.message : String(error), details: {} },
              }, 400)
            }
          },
        }),
      ]
      return () => {
        for (const dispose of disposers) dispose()
      }
    }, 'dsh-readpilot: http api')
  })
}
