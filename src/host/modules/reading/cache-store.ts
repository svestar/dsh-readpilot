import { cachePath } from '../../lib/data-paths.ts'
import { readJson, writeJson } from '../../lib/fs-json.ts'
import type { ParsedBook } from './formats.ts'

export interface BookSource {
  path: string
  mtimeMs: number
  size: number
}

export interface BookCacheRecord extends ParsedBook {
  parserVersion: number
  source: BookSource
}

export async function loadBookCache(dataDir: string, bookId: string): Promise<BookCacheRecord | null> {
  return readJson<BookCacheRecord | null>(cachePath(dataDir, bookId), null)
}

export async function saveBookCache(dataDir: string, bookId: string, record: BookCacheRecord): Promise<void> {
  await writeJson(cachePath(dataDir, bookId), record)
}
