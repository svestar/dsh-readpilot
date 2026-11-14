import type { EpubAssetResult, EpubDocumentResult } from '../../../../../shared/contracts/reading.ts'

export interface EpubVisual {
  prepare(request?: { bookId?: string; filePath?: string }): Promise<EpubRecord>
  readDocument(request?: {
    bookId?: string
    filePath?: string
    href?: string
    assetBase?: string
    docBase?: string
  }): Promise<EpubDocumentResult>
  readAsset(request?: { bookId?: string; filePath?: string; path?: string }): Promise<EpubAssetResult>
  cover(request?: { bookId?: string; filePath?: string }): Promise<EpubAssetResult | null>
}

export interface EpubManifestItem {
  id: string
  path: string
  mediaType: string
  properties: string[]
}

export interface EpubRecord {
  sourceMtimeMs: number
  sourceSize: number
  title: string
  author: string
  opfPath: string
  opfDir: string
  coverPath: string | null
  spine: Array<{ id: string; href: string }>
}

export const MEGABYTE = 1024 * 1024
export const MAX_ENTRIES = 10000
export const MAX_ENTRY_BYTES = 50 * MEGABYTE
export const MAX_TOTAL_BYTES = 200 * MEGABYTE
export const CONTAINER_PATH = 'META-INF/container.xml'
export const ASSET_ROOT = 'files'
export const CONTENT_TYPES = new Map<string, string>([
  ['.css', 'text/css; charset=utf-8'],
  ['.xhtml', 'application/xhtml+xml'],
  ['.html', 'text/html; charset=utf-8'],
  ['.htm', 'text/html; charset=utf-8'],
  ['.png', 'image/png'],
  ['.jpg', 'image/jpeg'],
  ['.jpeg', 'image/jpeg'],
  ['.gif', 'image/gif'],
  ['.webp', 'image/webp'],
  ['.svg', 'image/svg+xml'],
  ['.woff', 'font/woff'],
  ['.woff2', 'font/woff2'],
  ['.ttf', 'font/ttf'],
  ['.otf', 'font/otf'],
  ['.js', 'text/plain; charset=utf-8'],
])
