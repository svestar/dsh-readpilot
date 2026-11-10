import { join } from 'node:path'
import { readJson, writeJson } from './fsjson.ts'
import type { Book } from './library.ts'
import type { LibraryFormat } from './formats.ts'

export const LIBRARY_INDEX_VERSION = 1

export interface LibraryRecord {
  bookId: string
  contentKey: string
  path: string
  title: string
  format: LibraryFormat
  size: number
  mtimeMs: number
  duplicateOf?: string
}

export interface LibraryIndex {
  version: number
  records: Record<string, LibraryRecord>
}

export function emptyLibraryIndex(): LibraryIndex {
  return { version: LIBRARY_INDEX_VERSION, records: {} }
}

function indexPath(dataDir: string): string {
  return join(dataDir, 'library-index.json')
}

export async function loadLibraryIndex(dataDir: string): Promise<LibraryIndex> {
  try {
    const value = await readJson<Partial<LibraryIndex>>(indexPath(dataDir), emptyLibraryIndex())
    if (value.version !== LIBRARY_INDEX_VERSION || !value.records || typeof value.records !== 'object') {
      return emptyLibraryIndex()
    }
    return {
      version: LIBRARY_INDEX_VERSION,
      records: value.records,
    }
  } catch {
    return emptyLibraryIndex()
  }
}

export async function saveLibraryIndex(dataDir: string, index: LibraryIndex): Promise<void> {
  await writeJson(indexPath(dataDir), index)
}

/** Remove one book record; the caller decides whether another path is promoted first. */
export function deleteLibraryRecord(index: LibraryIndex, bookId: string): void {
  delete index.records[bookId]
}

/**
 * Reuse an existing bookId when content moves; never auto-merge copies.
 * A duplicate is exposed with duplicateOf and resolved by the user.
 */
export function reconcileBooks(books: readonly Book[], index: LibraryIndex): Book[] {
  const currentPaths = new Set(books.map(book => book.path))
  const seenContent = new Map<string, string>()
  const result: Book[] = []

  for (const book of books) {
    const pathRecord = Object.values(index.records).find(record => record.path === book.path)
    let id = book.id
    let duplicateOf: string | undefined

    if (pathRecord) {
      id = pathRecord.bookId
      if (pathRecord.contentKey === book.contentKey) {
        duplicateOf = pathRecord.duplicateOf
      } else {
        pathRecord.contentKey = book.contentKey
        pathRecord.duplicateOf = undefined
      }
    } else {
      const candidates = Object.values(index.records).filter(record => record.contentKey === book.contentKey)
      const renamed = candidates.find(record => !currentPaths.has(record.path))
      if (renamed) {
        id = renamed.bookId
        renamed.path = book.path
        duplicateOf = renamed.duplicateOf
      } else {
        const canonical = seenContent.get(book.contentKey)
          ?? candidates.find(record => !record.duplicateOf)?.bookId
        if (canonical) duplicateOf = canonical
      }
    }

    const seen = seenContent.get(book.contentKey)
    if (!duplicateOf && seen && seen !== id) duplicateOf = seen
    if (!duplicateOf) seenContent.set(book.contentKey, id)

    const next: Book = {
      ...book,
      id,
      contentKey: book.contentKey,
      ...(duplicateOf ? { duplicateOf } : {}),
    }
    result.push(next)
    index.records[id] = {
      bookId: id,
      contentKey: book.contentKey,
      path: book.path,
      title: book.title,
      format: book.format,
      size: book.size,
      mtimeMs: book.mtimeMs,
      ...(duplicateOf ? { duplicateOf } : {}),
    }
  }

  return result.sort((left, right) => right.mtimeMs - left.mtimeMs || left.path.localeCompare(right.path))
}
