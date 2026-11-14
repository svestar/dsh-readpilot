import type { HostModule, HostModuleOptions } from '../../types.ts'
import { createLibraryHandlers } from './handlers.ts'
import { createLibraryService, type LibraryService, type LibraryServiceDependencies } from './service.ts'

export interface LibraryModuleOptions extends HostModuleOptions {
  notes: LibraryServiceDependencies['notes']
  noteFiles: LibraryServiceDependencies['noteFiles']
  progress: LibraryServiceDependencies['progress']
  sessions: LibraryServiceDependencies['sessions']
  companion: LibraryServiceDependencies['companion']
  archivedSessionIds: LibraryServiceDependencies['archivedSessionIds']
}

export function createLibraryModule(options: LibraryModuleOptions): { module: HostModule; service: LibraryService } {
  const service = createLibraryService({
    dataDir: options.dataDir,
    ctx: options.ctx,
    notes: options.notes,
    noteFiles: options.noteFiles,
    progress: options.progress,
    sessions: options.sessions,
    companion: options.companion,
    archivedSessionIds: options.archivedSessionIds,
  })
  return {
    service,
    module: {
      id: 'library',
      handlers: createLibraryHandlers(service),
      tools: [],
      dispose: () => service.dispose(),
    },
  }
}
