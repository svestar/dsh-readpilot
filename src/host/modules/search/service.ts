import type { SearchMatch, SearchResult } from '../../../shared/contracts/search.ts'
import { buildReaderJumpUrl } from '../../../shared/jump-url.ts'
import type { Book } from '../library/book.ts'
import type { BookCacheRecord } from '../reading/cache-store.ts'
import { chapterText } from '../reading/formats.ts'
import { ReaderError } from '../../lib/errors.ts'

const MAX_SEARCH_BOOKS = 20
const MAX_SEARCH_RESULTS = 5000
const MAX_SEARCH_PARSE_BYTES = 128 * 1024 * 1024
const MAX_SEARCH_PARSE_MS = 3000

export interface SearchDependencies {
  resolveBook(bookId: unknown): Promise<Book>
  libraryBooks(): Promise<Book[]>
  ensureParsed(book: Book): Promise<BookCacheRecord>
}

function positiveInteger(value: unknown, fallback: number): number {
  const numeric = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(numeric) && numeric > 0 ? Math.floor(numeric) : fallback
}

export function createSearch({ resolveBook, libraryBooks, ensureParsed }: SearchDependencies) {
  return async function search({ bookId, query, limit }: any = {}): Promise<SearchResult> {
    if (typeof query !== 'string' || query.trim().length < 2) {
      throw new ReaderError('invalid-query', '检索词至少需要 2 个字符')
    }
    const wanted = query.trim()
    const lowered = wanted.toLowerCase()
    const allResults = limit === 0 || limit === 'all'
    const maxResults = allResults ? MAX_SEARCH_RESULTS : Math.min(positiveInteger(limit, 20), 50)
    const scoped = typeof bookId === 'string' && bookId.length > 0
    const supported = (scoped ? [await resolveBook(bookId)] : await libraryBooks())
      .filter(book => book.supported)
    const books = scoped ? supported : supported.slice(0, MAX_SEARCH_BOOKS)
    const matches: SearchMatch[] = []
    let limited = false
    let unreadable = false
    let scanned = 0
    let parsedBytes = 0
    const startedAt = Date.now()

    for (const book of books) {
      if (!book.supported) continue
      if (!scoped && (
        parsedBytes + book.size > MAX_SEARCH_PARSE_BYTES
        || Date.now() - startedAt > MAX_SEARCH_PARSE_MS
      )) break
      parsedBytes += book.size
      scanned += 1
      let parsed: BookCacheRecord
      try {
        parsed = await ensureParsed(book)
      } catch {
        unreadable = true
        continue
      }
      for (const chapter of parsed.chapters) {
        const text = chapterText(chapter)
        const haystack = text.toLowerCase()
        let from = 0
        while (from < haystack.length) {
          const index = haystack.indexOf(lowered, from)
          if (index === -1) break
          const start = Math.max(0, index - 60)
          const end = Math.min(text.length, index + wanted.length + 120)
          matches.push({
            bookId: book.id,
            bookTitle: book.title,
            chapterId: chapter.id,
            chapterTitle: chapter.title,
            offset: index,
            snippet: text.slice(start, end).replace(/\s+/g, ' ').trim(),
            locator: `${book.id}:${chapter.id}:${index}`,
            jumpUrl: buildReaderJumpUrl(book.id, chapter.id, index),
          })
          if (matches.length >= maxResults) {
            limited = true
            break
          }
          from = index + Math.max(wanted.length, 1)
        }
        if (matches.length >= maxResults) break
      }
      if (matches.length >= maxResults) break
    }
    return {
      matches,
      truncated: limited || scanned < supported.length,
      query: wanted,
      booksScanned: scanned,
      booksTotal: supported.length,
      unreadable,
    }
  }
}
