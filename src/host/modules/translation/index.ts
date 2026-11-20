import type { HostModule } from '../../types.ts'
import { createTranslationHandlers } from './handlers.ts'
import { createTranslationService, type TranslationServiceOptions } from './service.ts'

export function createTranslationModule(options: TranslationServiceOptions): {
  module: HostModule
  service: ReturnType<typeof createTranslationService>
} {
  const service = createTranslationService(options)
  return {
    service,
    module: {
      id: 'translation',
      handlers: createTranslationHandlers(service),
      tools: [],
    },
  }
}
