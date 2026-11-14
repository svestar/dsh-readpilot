import type { MediaFailure, MediaRoute } from '../../types.ts'
import { errorCode } from '../../lib/errors.ts'
import type { ReadingService } from './service.ts'

const IMMUTABLE = 31536000

function jsonFailure(error: unknown, code: string): MediaFailure {
  return {
    status: 400,
    body: JSON.stringify({
      ok: false,
      error: {
        code: errorCode(error, code),
        message: error instanceof Error ? error.message : String(error),
        details: {},
      },
    }),
    contentType: 'application/json; charset=utf-8',
  }
}

function htmlFailure(error: unknown): MediaFailure {
  return {
    status: 400,
    body: `<pre>${String(error instanceof Error ? error.message : error)}</pre>`,
    contentType: 'text/html; charset=utf-8',
  }
}

export function createReadingMediaRoutes(service: ReadingService): MediaRoute[] {
  return [
    {
      path: '/api/dsh-readpilot/cover',
      maxAge: IMMUTABLE,
      async load(url) {
        const result = await service.cover({ bookId: url.searchParams.get('bookId') })
        return { body: result.bytes, contentType: result.contentType }
      },
      errorResponse: () => ({ status: 404, body: null }),
    },
    {
      path: '/api/dsh-readpilot/pdf-page',
      maxAge: IMMUTABLE,
      async load(url) {
        const result = await service.pdfPage({
          bookId: url.searchParams.get('bookId'),
          page: Number(url.searchParams.get('page')),
          scale: Number(url.searchParams.get('scale')),
        })
        return { body: result.png, contentType: result.contentType }
      },
      errorResponse: error => jsonFailure(error, 'pdf-page-error'),
    },
    {
      path: '/api/dsh-readpilot/epub-doc',
      maxAge: IMMUTABLE,
      async load(url) {
        const result = await service.epubDocument({
          bookId: url.searchParams.get('bookId'),
          href: url.searchParams.get('href'),
        })
        return { body: result.html, contentType: result.contentType }
      },
      errorResponse: htmlFailure,
    },
    {
      path: '/api/dsh-readpilot/epub-asset',
      maxAge: IMMUTABLE,
      async load(url) {
        const result = await service.epubAsset({
          bookId: url.searchParams.get('bookId'),
          path: url.searchParams.get('path'),
        })
        return { body: result.bytes, contentType: result.contentType }
      },
      errorResponse: error => jsonFailure(error, 'epub-asset-error'),
    },
    {
      path: '/api/dsh-readpilot/book-asset',
      maxAge: IMMUTABLE,
      async load(url) {
        const result = await service.bookAsset({
          bookId: url.searchParams.get('bookId'),
          path: url.searchParams.get('path'),
        })
        return { body: result.bytes, contentType: result.contentType }
      },
      errorResponse: error => jsonFailure(error, 'book-asset-error'),
    },
  ]
}
