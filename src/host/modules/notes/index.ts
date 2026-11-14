import type { HostModule } from '../../types.ts'
import { createNotesModuleHandlers } from './module-handlers.ts'
import { createNotesService, type NotesServiceOptions } from './service.ts'

export function createNotesModule(options: NotesServiceOptions): { module: HostModule; service: ReturnType<typeof createNotesService> } {
  const service = createNotesService(options)
  return {
    service,
    module: {
      id: 'notes',
      handlers: createNotesModuleHandlers(service),
      tools: [],
    },
  }
}
