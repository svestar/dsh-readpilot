import type { HostModule } from '../../types.ts'
import { ACTIONS_ENDPOINTS } from '../../../shared/contracts/actions.ts'
import { createActionsService, type ActionsServiceDependencies } from './service.ts'

export function createActionsModule(deps: ActionsServiceDependencies): {
  module: HostModule
  service: ReturnType<typeof createActionsService>
} {
  const service = createActionsService(deps)
  return {
    service,
    module: {
      id: 'actions',
      handlers: {
        [ACTIONS_ENDPOINTS.readerActions]: payload => service.readerActions(payload),
        [ACTIONS_ENDPOINTS.readerReceipts]: payload => service.readerReceipts(payload),
      },
      tools: [],
    },
  }
}
