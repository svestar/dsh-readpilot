import type { HostModule } from '../../types.ts'
import { MEMORY_ENDPOINT } from '../../../shared/contracts/memory.ts'
import type { CompanionSettings } from '../../../shared/contracts/companion.ts'
import type { Book } from '../library/book.ts'
import { createMemoryHandlers, type MemoryHandlerDeps } from './handlers.ts'
import { createMemoryStore, type MemoryStore } from './store.ts'

export interface MemoryModuleOptions {
  dataDir: string
  resolveBook(bookId: unknown): Promise<Book>
  books(): Promise<Book[]>
  findBook(books: Book[], key: unknown): Book | undefined
  getSettings(): CompanionSettings
  setSettings(value: CompanionSettings): void
  loadSettings(): Promise<CompanionSettings>
  saveSettings(value: CompanionSettings): Promise<void>
  readings: Map<string, { bookId: string }>
}

export interface MemoryModule {
  module: HostModule
  store: MemoryStore
  handlers: ReturnType<typeof createMemoryHandlers>
}

export function createMemoryModule(options: MemoryModuleOptions): MemoryModule {
  const store = createMemoryStore(options.dataDir)
  const cache = new Map<string, { text: string; characters: number; updatedAt: number }>()
  const handlers = createMemoryHandlers({
    resolveBook: options.resolveBook,
    books: options.books,
    findBook: options.findBook,
    store,
    getSettings: options.getSettings,
    setSettings: options.setSettings,
    loadSettings: options.loadSettings,
    saveSettings: options.saveSettings,
    readings: options.readings,
    cache,
  } satisfies MemoryHandlerDeps)
  return {
    store,
    handlers,
    module: {
      id: 'memory',
      handlers: {
        [MEMORY_ENDPOINT]: (payload: unknown) => handlers.memory(payload),
      },
      tools: [],
    },
  }
}
