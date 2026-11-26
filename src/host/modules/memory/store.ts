import { join } from 'node:path'
import { CardStoreError, createCardStore, type CardHistoryEntry, type CardValue } from '../../lib/card-store.ts'

export type MemoryCard = CardValue
export type MemoryHistoryEntry = CardHistoryEntry
export type MemoryHistorySnapshot = CardHistoryEntry
export { CardStoreError as MemoryStoreError } from '../../lib/card-store.ts'

export interface MemoryStore {
  readBook(bookId: string): Promise<MemoryCard>
  readReader(): Promise<MemoryCard>
  writeBook(bookId: string, text: string): Promise<MemoryCard>
  writeReader(text: string): Promise<MemoryCard>
  listHistory(bookId: string | null): Promise<MemoryHistoryEntry[]>
  readHistory(bookId: string | null, id: string): Promise<MemoryHistorySnapshot>
  restoreHistory(bookId: string | null, id: string): Promise<MemoryCard>
  removeHistory(bookId: string | null, id: string): Promise<boolean>
  clearHistory(bookId: string | null): Promise<number>
  undo(bookId: string | null): Promise<MemoryCard>
  clearBook(bookId: string): Promise<void>
  clearReader(): Promise<void>
}

const READER_CARD = 'reader'
const BOOK_ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/

export function createMemoryStore(dataDir: string): MemoryStore {
  const store = createCardStore(join(dataDir, 'memory'), {
    maxCharacters: 600,
    namePattern: BOOK_ID_PATTERN,
    invalidNameCode: 'invalid-book',
    tooLargeCode: 'memory-too-large',
    invalidContentCode: 'invalid-memory',
    invalidPathCode: 'invalid-memory',
  })

  function bookName(bookId: unknown): string {
    if (typeof bookId !== 'string' || !BOOK_ID_PATTERN.test(bookId) || bookId === READER_CARD) {
      throw new CardStoreError('invalid-book', 'bookId 不合法')
    }
    return bookId
  }

  const cardName = (bookId: string | null): string => bookId === null ? READER_CARD : bookName(bookId)

  return {
    readBook: async bookId => store.read(bookName(bookId)),
    readReader: async () => store.read(READER_CARD),
    writeBook: async (bookId, text) => store.write(bookName(bookId), text),
    writeReader: async text => store.write(READER_CARD, text),
    listHistory: async bookId => store.listHistory(cardName(bookId)),
    readHistory: async (bookId, id) => store.readHistory(cardName(bookId), id),
    restoreHistory: async (bookId, id) => store.restoreHistory(cardName(bookId), id),
    removeHistory: async (bookId, id) => store.removeHistory(cardName(bookId), id),
    clearHistory: async bookId => store.clearHistory(cardName(bookId)),
    undo: async bookId => store.undo(cardName(bookId)),
    clearBook: async bookId => store.clear(bookName(bookId)),
    clearReader: async () => store.clear(READER_CARD),
  }
}
