import { LIBRARY_ENDPOINTS } from '../../../shared/contracts/library.ts'
import type { RpcHandler } from '../../types.ts'
import type { LibraryService } from './service.ts'

export function createLibraryHandlers(service: LibraryService): Record<string, RpcHandler> {
  return {
    [LIBRARY_ENDPOINTS.state]: () => service.state(),
    [LIBRARY_ENDPOINTS.rescan]: () => service.rescan(),
    [LIBRARY_ENDPOINTS.configure]: payload => service.configure(payload as { path?: unknown }),
    [LIBRARY_ENDPOINTS.deleteDuplicate]: payload => service.deleteDuplicate(payload as { bookId?: unknown }),
    [LIBRARY_ENDPOINTS.libraryMeta]: () => service.libraryMeta(),
    [LIBRARY_ENDPOINTS.setBookTags]: payload => service.setBookTags(payload as { bookId?: unknown; tags?: unknown }),
    [LIBRARY_ENDPOINTS.setBookStatus]: payload => service.setBookStatus(payload as { bookId?: unknown; status?: unknown }),
    [LIBRARY_ENDPOINTS.setBookRating]: payload => service.setBookRating(payload as { bookId?: unknown; rating?: unknown }),
  }
}
