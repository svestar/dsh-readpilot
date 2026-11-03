import { createHash } from 'node:crypto'
import { access, readdir, stat } from 'node:fs/promises'
import { basename, extname, join } from 'node:path'
import type { BookFormat } from './formats.ts'
import { formatOf, isSupportedFormat } from './formats.ts'
import { NOTES_DIR_NAME, NOTES_MARKER } from './note-files.ts'

export const MAX_LIBRARY_FILES = 2000

export interface Book {
  id: string
  title: string
  path: string
  format: BookFormat
  supported: boolean
  size: number
  mtimeMs: number
}

export interface ScanOptions {
  maxDepth?: number
  maxFiles?: number
}

export function bookIdFor(realPath: string): string {
  const identity = process.platform === 'win32' ? realPath.toLowerCase() : realPath
  return createHash('sha1').update(identity).digest('hex').slice(0, 16)
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
  const books: Book[] = []

  async function walk(directory: string, depth: number): Promise<void> {
    if (books.length >= maxFiles) return
    let entries
    try {
      entries = await readdir(directory, { withFileTypes: true })
    } catch {
      return
    }
    for (const entry of entries) {
      if (books.length >= maxFiles) return
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
      const format = formatOf(entry.name)
      if (!format) continue
      let info
      try {
        info = await stat(full)
      } catch {
        continue
      }
      if (!info.isFile() || info.size === 0) continue
      books.push({
        id: bookIdFor(full),
        title: basename(entry.name, extname(entry.name)),
        path: full,
        format,
        supported: isSupportedFormat(format),
        size: info.size,
        mtimeMs: info.mtimeMs,
      })
    }
  }

  await walk(root, 0)
  return books.sort((left, right) => right.mtimeMs - left.mtimeMs)
}
