import { COMPANION_ENDPOINTS } from '../../../shared/contracts/companion.ts'
import type { RpcHandler } from '../../types.ts'
import type { createCompanionService } from './service.ts'

export function createCompanionHandlers(service: ReturnType<typeof createCompanionService>): Record<string, RpcHandler> {
  return {
    [COMPANION_ENDPOINTS.session]: payload => service.setCompanionSession(payload),
    [COMPANION_ENDPOINTS.sessionAlive]: payload => service.sessionAlive(payload as { sessionId?: unknown }),
    [COMPANION_ENDPOINTS.sessionBook]: payload => service.sessionBook(payload as { sessionId?: unknown }),
    [COMPANION_ENDPOINTS.companionPolicy]: payload => service.setCompanionPolicy(payload as { sessionId?: unknown }),
    [COMPANION_ENDPOINTS.companionContext]: payload => service.setCompanionContext(payload),
  }
}
