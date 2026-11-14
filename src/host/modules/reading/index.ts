import type { HostModule } from '../../types.ts'
import type { Book } from '../library/book.ts'
import type { Settings } from '../../../shared/contracts/library.ts'
import { createReadingHandlers } from './handlers.ts'
import { createReadingMediaRoutes } from './media.ts'
import { createReadingService, type ReadingService } from './service.ts'

export interface ReadingModuleOptions {
  dataDir: string
  resolveBook(bookId: unknown): Promise<Book>
  currentSettings(): Promise<Settings>
  maxBookBytes?: number
}

export function createReadingModule(options: ReadingModuleOptions): { module: HostModule; service: ReadingService } {
  const service = createReadingService(options)
  const mediaRoutes = createReadingMediaRoutes(service)
  return {
    service,
    module: {
      id: 'reading',
      handlers: createReadingHandlers(service),
      tools: [],
      mediaRoutes,
    },
  }
}
