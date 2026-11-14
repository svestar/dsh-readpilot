import type { HostModule } from '../../types.ts'
import { createCompanionHandlers } from './handlers.ts'
import { createCompanionService, type CompanionServiceOptions } from './service.ts'

export function createCompanionModule(options: CompanionServiceOptions): {
  module: HostModule
  service: ReturnType<typeof createCompanionService>
} {
  const service = createCompanionService(options)
  return {
    service,
    module: {
      id: 'companion',
      handlers: createCompanionHandlers(service),
      tools: [],
    },
  }
}
