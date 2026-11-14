import type { PluginApp } from './app.ts'
import { errorCode } from './lib/errors.ts'
import type { MediaRoute } from './types.ts'

export function json(value: unknown, status = 200): Response {
  return new Response(JSON.stringify(value), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  })
}

function failure(error: unknown, fallbackCode: string, status: number): Response {
  return json({
    ok: false,
    error: {
      code: errorCode(error, fallbackCode),
      message: error instanceof Error ? error.message : String(error),
      details: {},
    },
  }, status)
}

function mediaFailure(error: unknown, route: MediaRoute): Response {
  if (!route.errorResponse) return failure(error, 'media-error', 500)
  const mapped = route.errorResponse(error)
  if (mapped.body === null) {
    return new Response(null, { status: mapped.status, headers: { 'cache-control': 'no-store' } })
  }
  return new Response(mapped.body as BodyInit, {
    status: mapped.status,
    headers: {
      'content-type': mapped.contentType ?? 'text/plain; charset=utf-8',
      'cache-control': 'no-store',
    },
  })
}

function cacheControl(maxAge: number | undefined): string {
  return maxAge === undefined ? 'no-store' : `private, max-age=${maxAge}, immutable`
}

function registerRpcRoute(ctx: any, app: PluginApp): () => void {
  return ctx.connection.fetch.register({
    path: '/api/dsh-readpilot',
    methods: ['POST'],
    requestBody: 'buffered',
    fetch: async (request: Request) => {
      let body: any
      try {
        body = await request.json()
      } catch {
        return json({ ok: false, error: { code: 'bad-request', message: '请求体不是合法 JSON', details: {} } }, 400)
      }
      try {
        return json({ ok: true, value: await app.router.handle(body?.endpoint, body?.payload) })
      } catch (error) {
        return failure(error, 'plugin-error', 400)
      }
    },
  })
}

function registerMediaRoute(ctx: any, route: MediaRoute): () => void {
  return ctx.connection.fetch.register({
    path: route.path,
    methods: ['GET'],
    requestBody: 'buffered',
    fetch: async (request: Request) => {
      try {
        const payload = await route.load(new URL(request.url))
        if (payload === null) {
          return new Response(null, { status: 404, headers: { 'cache-control': 'no-store' } })
        }
        return new Response(payload.body as BodyInit, {
          headers: { 'content-type': payload.contentType, 'cache-control': cacheControl(route.maxAge) },
        })
      } catch (error) {
        return mediaFailure(error, route)
      }
    },
  })
}

export function registerHttp(ctx: any, app: PluginApp, extraRoutes: readonly MediaRoute[] = []): void {
  ctx.inject(['connection'], (scope: any) => {
    scope.effect(() => {
      const disposers = [
        registerRpcRoute(scope, app),
        ...[...app.mediaRoutes, ...extraRoutes].map(route => registerMediaRoute(scope, route)),
      ]
      return () => {
        for (const dispose of disposers) dispose()
      }
    }, 'dsh-readpilot: HTTP')
  })
}
