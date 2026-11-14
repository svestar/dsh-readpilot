import type { LibraryMeta, ReadStatus } from '../../../shared/contracts/library.ts'
import { ReaderError } from '../../lib/errors.ts'
import type { Book } from './book.ts'
import type { LibraryMetaStore } from './meta-store.ts'

export interface LibraryMetaDependencies {
  resolveBook(bookId: unknown): Promise<Book>
  store: LibraryMetaStore
}

export interface LibraryMetaService {
  libraryMeta(): Promise<LibraryMeta>
  setBookTags(payload?: { bookId?: unknown; tags?: unknown }): Promise<{ bookId: string; tags: string[] }>
  setBookStatus(payload?: { bookId?: unknown; status?: unknown }): Promise<{ bookId: string; status: ReadStatus | null }>
  setBookRating(payload?: { bookId?: unknown; rating?: unknown }): Promise<{ bookId: string; rating: number | null }>
}

export function createLibraryMetaService(deps: LibraryMetaDependencies): LibraryMetaService {
  return {
    libraryMeta: () => deps.store.list(),
    async setBookTags({ bookId, tags } = {}) {
      const book = await deps.resolveBook(bookId)
      let normalized: string[]
      try {
        normalized = await deps.store.setTags(book.id, tags)
      } catch (error) {
        throw new ReaderError('invalid-tags', error instanceof Error ? error.message : String(error))
      }
      return { bookId: book.id, tags: normalized }
    },
    async setBookStatus({ bookId, status } = {}) {
      const book = await deps.resolveBook(bookId)
      let normalized: ReadStatus | null
      try {
        normalized = await deps.store.setStatus(book.id, status)
      } catch (error) {
        throw new ReaderError('invalid-status', error instanceof Error ? error.message : String(error))
      }
      return { bookId: book.id, status: normalized }
    },
    async setBookRating({ bookId, rating } = {}) {
      const book = await deps.resolveBook(bookId)
      let normalized: number | null
      try {
        normalized = await deps.store.setRating(book.id, rating)
      } catch (error) {
        throw new ReaderError('invalid-rating', error instanceof Error ? error.message : String(error))
      }
      return { bookId: book.id, rating: normalized }
    },
  }
}
