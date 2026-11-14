import { mkdir, readFile, readdir, stat, unlink, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { PdfTextItem } from '../../../../shared/contracts/reading.ts'

export const RENDER_VERSION = 2
export const DEFAULT_MAX_CACHE_BYTES = 500 * 1024 * 1024

export interface PdfCacheMeta {
  rendererVersion: number
  sourceMtimeMs: number
  sourceSize: number
  width: number
  height: number
  pageCount: number
  textItems: PdfTextItem[]
}

export interface PdfCache {
  png: Buffer
  meta: PdfCacheMeta
}

export async function readCache(cacheDir: string, bookId: string, page: number, scale: number): Promise<PdfCache | null> {
  const base = join(cacheDir, bookId, `${page}@${scale}`)
  try {
    const [png, metaText] = await Promise.all([
      readFile(`${base}.png`),
      readFile(`${base}.json`, 'utf8'),
    ])
    const meta = JSON.parse(metaText) as PdfCacheMeta
    return meta.rendererVersion === RENDER_VERSION ? { png, meta } : null
  } catch {
    return null
  }
}

export async function writeCache(cacheDir: string, bookId: string, page: number, scale: number, png: Buffer, meta: PdfCacheMeta): Promise<void> {
  await mkdir(join(cacheDir, bookId), { recursive: true })
  const base = join(cacheDir, bookId, `${page}@${scale}`)
  await writeFile(`${base}.png`, png)
  await writeFile(`${base}.json`, `${JSON.stringify(meta)}\n`, 'utf8')
}

export async function pruneCache(cacheDir: string, maxBytes: number): Promise<void> {
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
