import { READING_ENDPOINTS } from '../../../shared/contracts/reading.ts'
import type { RpcHandler } from '../../types.ts'
import type { ReadingService } from './service.ts'

export function createReadingHandlers(service: ReadingService): Record<string, RpcHandler> {
  return {
    [READING_ENDPOINTS.open]: payload => service.open(payload as { bookId?: unknown }),
    [READING_ENDPOINTS.chapter]: payload => service.chapter(payload as { bookId?: unknown; chapterId?: unknown }),
    [READING_ENDPOINTS.progress]: payload => service.saveReadingProgress(payload),
    [READING_ENDPOINTS.pageView]: payload => service.pageView(payload),
  }
}
