import { createHash } from 'node:crypto'
import { readdir, stat } from 'node:fs/promises'
import { basename, extname, join } from 'node:path'
import { formatOf, isSupportedFormat } from './formats.js'

export const MAX_LIBRARY_FILES = 2000

export function bookIdFor(realPath) {
  const identity = process.platform === 'win32' ? realPath.toLowerCase() : realPath
  return createHash('sha1').update(identity).digest('hex').slice(0, 16)
}

export function findBookByKey(books, key) {
  if (typeof key !== 'string' || !key.trim()) return undefined
  const wanted = key.trim()
  const lowered = wanted.toLowerCase()
  return books.find(book => book.id === wanted)
    ?? books.find(book => book.title === wanted)
    ?? books.find(book => book.title.toLowerCase() === lowered)
    ?? books.find(book => book.title.toLowerCase().includes(lowered))
}

export async function scanLibrary(root, options = {}) {
  const maxDepth = options.maxDepth ?? 3
  const maxFiles = options.maxFiles ?? MAX_LIBRARY_FILES
  const books = []

  async function walk(directory, depth) {
    if (books.length >= maxFiles) return
    let entries
    try {
      entries = await readdir(directory, { withFileTypes: true })
    } catch {
      return
    }
    for (const entry of entries) {
      if (books.length >= maxFiles) return
      if (entry.name.startsWith('.') || entry.name === 'node_modules') continue
      const full = join(directory, entry.name)
      if (entry.isDirectory()) {
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
