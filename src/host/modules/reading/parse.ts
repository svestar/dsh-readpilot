import { readFile, stat } from 'node:fs/promises'
import { isSupportedFormat, parseBookAsync } from './formats.ts'
import { loadBookCache, saveBookCache, type BookCacheRecord } from './cache-store.ts'
import type { Book } from '../library/book.ts'
import { ReaderError } from '../../lib/errors.ts'

const PARSER_VERSION = 12
const DEFAULT_MAX_BOOK_BYTES = 100 * 1024 * 1024

export interface BookParser {
  ensureParsed(book: Book): Promise<BookCacheRecord>
}

export function createBookParser({
  dataDir,
  maxBookBytes = DEFAULT_MAX_BOOK_BYTES,
}: {
  dataDir: string
  maxBookBytes?: number
}): BookParser {
  async function ensureParsed(book: Book): Promise<BookCacheRecord> {
    if (!isSupportedFormat(book.format)) {
      throw new ReaderError('unsupported-format', `暂不支持 ${book.format} 格式，当前支持 txt 与 md`)
    }
    const cached = await loadBookCache(dataDir, book.id)
    if (
      cached
      && cached.parserVersion === PARSER_VERSION
      && cached.source
      && cached.source.mtimeMs === book.mtimeMs
      && cached.source.size === book.size
    ) {
      return cached
    }
    const info = await stat(book.path)
    if (info.size > maxBookBytes) {
      throw new ReaderError('book-too-large', `书籍超过 ${Math.round(maxBookBytes / 1024 / 1024)} MB 限制`)
    }
    const buffer = await readFile(book.path)
    const parsed = await parseBookAsync(buffer, book.format, book.path)
    const record: BookCacheRecord = {
      parserVersion: PARSER_VERSION,
      source: { path: book.path, mtimeMs: info.mtimeMs, size: info.size },
      ...parsed,
    }
    await saveBookCache(dataDir, book.id, record)
    return record
  }

  return { ensureParsed }
}
