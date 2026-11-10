import { createHash } from 'node:crypto'
import { access, open, readdir, stat } from 'node:fs/promises'
import { basename, extname, join } from 'node:path'
import type { LibraryFormat } from './formats.ts'
import { isSupportedFormat, libraryFormatOf } from './formats.ts'
import { NOTES_DIR_NAME, NOTES_MARKER } from './note-files.ts'

export const MAX_LIBRARY_FILES = 2000
const SCAN_STAT_CONCURRENCY = 16
const CONTENT_SAMPLE_BYTES = 64 * 1024

interface BookCandidate {
  path: string
  title: string
  format: LibraryFormat
}

async function mapLimit<T, R>(items: readonly T[], limit: number, mapper: (item: T) => Promise<R>): Promise<R[]> {
  const results = new Array<R>(items.length)
  let next = 0
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const index = next++
      results[index] = await mapper(items[index])
    }
  })
  await Promise.all(workers)
  return results
}

export interface Book {
  id: string
  title: string
  path: string
  format: LibraryFormat
  supported: boolean
  size: number
  mtimeMs: number
  contentKey: string
  duplicateOf?: string
}

export interface ScanOptions {
  maxDepth?: number
  maxFiles?: number
}

export function bookIdFor(realPath: string): string {
  const identity = process.platform === 'win32' ? realPath.toLowerCase() : realPath
  return createHash('sha1').update(identity).digest('hex').slice(0, 16)
}

/** Sample the head and tail so large PDFs do not need a full read. */
export async function contentKeyFor(filePath: string, size: number): Promise<string> {
  const handle = await open(filePath, 'r')
  try {
    const headSize = Math.min(size, CONTENT_SAMPLE_BYTES)
    const tailSize = Math.min(Math.max(size - headSize, 0), CONTENT_SAMPLE_BYTES)
    const head = Buffer.alloc(headSize)
    const tail = Buffer.alloc(tailSize)
    if (headSize > 0) await handle.read(head, 0, headSize, 0)
    if (tailSize > 0) await handle.read(tail, 0, tailSize, size - tailSize)
    const hash = createHash('sha256')
    hash.update(`size:${size}\n`)
    hash.update(head)
    if (tailSize > 0) hash.update(tail)
    return hash.digest('hex')
  } finally {
    await handle.close()
  }
}

export function findBookByKey(books: readonly Book[], key: unknown): Book | undefined {
  if (typeof key !== 'string' || !key.trim()) return undefined
  const wanted = key.trim()
  const lowered = wanted.toLowerCase()
  return books.find(book => book.id === wanted)
    ?? books.find(book => book.title === wanted)
    ?? books.find(book => book.title.toLowerCase() === lowered)
    ?? books.find(book => book.title.toLowerCase().includes(lowered))
}

export async function scanLibrary(root: string, options: ScanOptions = {}): Promise<Book[]> {
  const maxDepth = options.maxDepth ?? 3
  const maxFiles = options.maxFiles ?? MAX_LIBRARY_FILES
  const candidates: BookCandidate[] = []

  async function walk(directory: string, depth: number): Promise<void> {
    if (candidates.length >= maxFiles) return
    let entries
    try {
      entries = await readdir(directory, { withFileTypes: true })
    } catch {
      return
    }
    for (const entry of entries) {
      if (candidates.length >= maxFiles) return
      if (entry.name.startsWith('.') || entry.name === 'node_modules' || entry.name === 'AGENTS.md') continue
      const full = join(directory, entry.name)
      if (entry.isDirectory()) {
        if (entry.name === NOTES_DIR_NAME) {
          try {
            await access(join(full, NOTES_MARKER))
            continue
          } catch {
            // A plain directory named notes is still a possible book folder.
          }
        }
        if (depth < maxDepth) await walk(full, depth + 1)
        continue
      }
      if (!entry.isFile()) continue
      const format = libraryFormatOf(entry.name)
      if (!format) continue
      candidates.push({
        path: full,
        title: basename(entry.name, extname(entry.name)),
        format,
      })
    }
  }

  await walk(root, 0)
  const books = await mapLimit(candidates, SCAN_STAT_CONCURRENCY, async candidate => {
    let info
    try {
      info = await stat(candidate.path)
    } catch {
      return null
    }
    if (!info.isFile() || info.size === 0) return null
    let contentKey: string
    try {
      contentKey = await contentKeyFor(candidate.path, info.size)
    } catch {
      return null
    }
    return {
      id: bookIdFor(candidate.path),
      title: candidate.title,
      path: candidate.path,
      format: candidate.format,
      supported: isSupportedFormat(candidate.format),
      size: info.size,
      mtimeMs: info.mtimeMs,
      contentKey,
    } satisfies Book
  })
  return books
    .filter((book): book is Book => book !== null)
    .sort((left, right) => right.mtimeMs - left.mtimeMs || left.path.localeCompare(right.path))
}
