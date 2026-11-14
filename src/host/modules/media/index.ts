import { readFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import type { HostModule, MediaRoute } from '../../types.ts'

/** Resolved through the package's own `exports`, so it works from source and `dist/`. */
const ICON_PATH = createRequire(import.meta.url).resolve('dsh-readpilot/icon')

/**
 * Assets that are not JSON: images, PDF pages, generated HTML.
 *
 * The route lives in a module rather than `index.ts`, so `createApp()` proves
 * that a second module can own an HTTP surface and that `registerHttp()`
 * collects it with no special case.
 */
export function createMediaModule(): HostModule {
  const mediaRoutes: MediaRoute[] = [{
    path: '/api/dsh-readpilot/icon',
    maxAge: 31536000,
    async load() {
      return { body: await readFile(ICON_PATH), contentType: 'image/svg+xml' }
    },
  }]

  return {
    id: 'media',
    handlers: {},
    tools: [],
    mediaRoutes,
  }
}
