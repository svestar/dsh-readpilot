import { mkdir, readFile, readdir, stat, unlink, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { createCanvas } from '@napi-rs/canvas'
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs'

const MIN_SCALE = 0.5
const MAX_SCALE = 3
const MAX_PAGES = 2000
const DEFAULT_MAX_CACHE_BYTES = 500 * 1024 * 1024
/** The cache walk stats every page; keep it off the per-page render path. */
const PRUNE_INTERVAL_MS = 60 * 1000

export interface PdfTextItem {
  text: string
  left: number
  top: number
  width: number
  height: number
  fontSize: number
}

export interface PdfPageResult {
  png: Buffer
  width: number
  height: number
  pageCount: number
  textItems: PdfTextItem[]
}

export interface PdfRenderRequest {
  bookId: string
  filePath: string
  page: number
  scale?: number
}

export interface PdfRenderer {
  render(request: PdfRenderRequest): Promise<PdfPageResult>
}

interface PdfCacheMeta {
  sourceMtimeMs: number
  sourceSize: number
  width: number
  height: number
  pageCount: number
  textItems: PdfTextItem[]
}

interface PdfCache {
  png: Buffer
  meta: PdfCacheMeta
}

function assertBookId(bookId: unknown): string {
  if (typeof bookId !== 'string' || !/^[A-Za-z0-9_-]{1,64}$/.test(bookId)) {
    throw new Error('bookId must match [A-Za-z0-9_-]{1,64}')
  }
  return bookId
}

function assertScale(scale: unknown): number {
  if (typeof scale !== 'number' || !Number.isFinite(scale) || scale < MIN_SCALE || scale > MAX_SCALE) {
    throw new Error(`scale must be a number between ${MIN_SCALE} and ${MAX_SCALE}`)
  }
  return scale
}

function textItemsOf(content: any, viewport: any): PdfTextItem[] {
  const items: PdfTextItem[] = []
  for (const item of content.items) {
    if (!item || typeof item.str !== 'string' || item.str.length === 0) continue
    const transform = item.transform
    if (!Array.isArray(transform) || transform.length < 6) continue
    const [left, baseline] = viewport.convertToViewportPoint(transform[4], transform[5])
    const fontSize = Math.max(1, Math.hypot(transform[2], transform[3]) * viewport.scale)
    const width = Math.max(1, (Number.isFinite(item.width) ? item.width : 0) * viewport.scale)
    const height = Math.max(fontSize, (Number.isFinite(item.height) ? item.height : 0) * viewport.scale)
    items.push({
      text: item.str,
      left: Math.round(left * 100) / 100,
      top: Math.round((baseline - fontSize) * 100) / 100,
      width: Math.round(width * 100) / 100,
      height: Math.round(height * 100) / 100,
      fontSize: Math.round(fontSize * 100) / 100,
    })
  }
  return items
}

async function readCache(cacheDir: string, bookId: string, page: number, scale: number): Promise<PdfCache | null> {
  const base = join(cacheDir, bookId, `${page}@${scale}`)
  try {
    const [png, metaText] = await Promise.all([
      readFile(`${base}.png`),
      readFile(`${base}.json`, 'utf8'),
    ])
    return { png, meta: JSON.parse(metaText) }
  } catch {
    return null
  }
}

async function writeCache(cacheDir: string, bookId: string, page: number, scale: number, png: Buffer, meta: PdfCacheMeta): Promise<void> {
  await mkdir(join(cacheDir, bookId), { recursive: true })
  const base = join(cacheDir, bookId, `${page}@${scale}`)
  await writeFile(`${base}.png`, png)
  await writeFile(`${base}.json`, `${JSON.stringify(meta)}\n`, 'utf8')
}

async function pruneCache(cacheDir: string, maxBytes: number): Promise<void> {
  const files: Array<{ path: string; size: number; mtimeMs: number }> = []
  let total = 0
  async function walk(dir: string): Promise<void> {
    let entries
    try {
      entries = await readdir(dir, { withFileTypes: true })
    } catch {
      return
    }
    for (const entry of entries) {
      const full = join(dir, entry.name)
      if (entry.isDirectory()) {
        await walk(full)
      } else {
        try {
          const info = await stat(full)
          total += info.size
          files.push({ path: full, size: info.size, mtimeMs: info.mtimeMs })
        } catch {
          // A page may be removed by another request.
        }
      }
    }
  }
  await walk(cacheDir)
  if (total <= maxBytes) return
  files.sort((left, right) => left.mtimeMs - right.mtimeMs)
  for (const file of files) {
    if (total <= maxBytes) break
    try {
      await unlink(file.path)
      total -= file.size
    } catch {
      // Ignore a file another request already removed.
    }
  }
}

export function createPdfPageRenderer({ cacheDir, maxCacheBytes = DEFAULT_MAX_CACHE_BYTES }: { cacheDir?: string; maxCacheBytes?: number } = {}): PdfRenderer {
  if (typeof cacheDir !== 'string' || !cacheDir) throw new Error('cacheDir is required')
  const cacheRoot = cacheDir
  const inflight = new Map<string, Promise<PdfPageResult>>()
  let lastPruneAt = 0

  async function renderPage({ bookId, filePath, page, scale = 1.5 }: PdfRenderRequest): Promise<PdfPageResult> {
    const id = assertBookId(bookId)
    if (typeof filePath !== 'string' || !filePath) throw new Error('filePath is required')
    if (!Number.isInteger(page) || page < 1) throw new Error('page must be a positive integer')
    const zoom = assertScale(scale)

    const key = `${id}/${page}@${zoom}`
    const pending = inflight.get(key)
    if (pending) return pending
    const task = (async () => {
      const info = await stat(filePath)
      const cached = await readCache(cacheRoot, bookId, page, scale)
      if (
        cached
        && cached.meta
        && cached.meta.sourceMtimeMs === info.mtimeMs
        && cached.meta.sourceSize === info.size
      ) {
        return {
          png: cached.png,
          width: cached.meta.width,
          height: cached.meta.height,
          pageCount: cached.meta.pageCount,
          textItems: cached.meta.textItems,
        }
      }

      const data = new Uint8Array(await readFile(filePath))
      const loadingTask = getDocument({
        data,
        useSystemFonts: false,
        isEvalSupported: false,
        disableFontFace: true,
        verbosity: 0,
      } as any)
      try {
        const pdf = await loadingTask.promise
        if (pdf.numPages > MAX_PAGES) {
          throw new Error(`PDF 页数超过 ${MAX_PAGES} 页上限（共 ${pdf.numPages} 页）`)
        }
        if (page > pdf.numPages) {
          throw new Error(`page ${page} exceeds page count ${pdf.numPages}`)
        }
        const pdfPage = await pdf.getPage(page)
        const viewport = pdfPage.getViewport({ scale })
        const canvas = createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height))
        const context = canvas.getContext('2d')
        await pdfPage.render({ canvasContext: context, viewport, canvas } as any).promise
        const png = canvas.toBuffer('image/png')
        const content = await pdfPage.getTextContent()
        const textItems = textItemsOf(content, viewport)
        const result = {
          png,
          width: canvas.width,
          height: canvas.height,
          pageCount: pdf.numPages,
          textItems,
        }
        await writeCache(cacheRoot, bookId, page, scale, png, {
          sourceMtimeMs: info.mtimeMs,
          sourceSize: info.size,
          width: result.width,
          height: result.height,
          pageCount: result.pageCount,
          textItems,
        })
        const now = Date.now()
        if (now - lastPruneAt >= PRUNE_INTERVAL_MS) {
          lastPruneAt = now
          await pruneCache(cacheRoot, maxCacheBytes)
        }
        return result
      } finally {
        await loadingTask.destroy()
      }
    })().finally(() => inflight.delete(key))
    inflight.set(key, task)
    return task
  }

  return { render: renderPage }
}
