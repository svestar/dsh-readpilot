import { SEARCH_ENDPOINT } from '../../../shared/contracts/search.ts'
import type { RpcHandler } from '../../types.ts'
import type { createSearch } from './service.ts'

export function createSearchHandlers(search: ReturnType<typeof createSearch>): Record<string, RpcHandler> {
  return {
    [SEARCH_ENDPOINT]: payload => search(payload),
  }
}
