import type { HostModule } from '../../types.ts'
import type { Book } from '../library/book.ts'
import type { BookCacheRecord } from '../reading/cache-store.ts'
import { createSearchHandlers } from './handlers.ts'
import { createSearch } from './service.ts'

export interface SearchModuleOptions {
  resolveBook(bookId: unknown): Promise<Book>
  libraryBooks(): Promise<Book[]>
  ensureParsed(book: Book): Promise<BookCacheRecord>
}

export function createSearchModule(options: SearchModuleOptions): { module: HostModule; search: ReturnType<typeof createSearch> } {
  const search = createSearch(options)
  return {
    search,
    module: {
      id: 'search',
      handlers: createSearchHandlers(search),
      tools: [],
    },
  }
}
