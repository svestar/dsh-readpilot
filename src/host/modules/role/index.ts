import type { HostModule } from '../../types.ts'
import { ROLE_ENDPOINT } from '../../../shared/contracts/role.ts'
import type { CompanionSettings } from '../../../shared/contracts/companion.ts'
import type { WorkspaceLanguage } from '../../../shared/contracts/library.ts'
import type { Book } from '../library/book.ts'
import { createRoleHandlers, type RoleHandlerDeps } from './handlers.ts'
import { createRoleStore } from './store.ts'

export interface RoleModuleOptions {
  dataDir: string
  resolveBook(bookId: unknown): Promise<Book>
  getSettings(): CompanionSettings
  setSettings(value: CompanionSettings): void
  loadSettings(): Promise<CompanionSettings>
  saveSettings(value: CompanionSettings): Promise<void>
  readings: Map<string, { bookId: string }>
  workspaceLanguage(): WorkspaceLanguage
}

export interface RoleModule {
  module: HostModule
  handlers: ReturnType<typeof createRoleHandlers>
}

export function createRoleModule(options: RoleModuleOptions): RoleModule {
  const store = createRoleStore(options.dataDir)
  const handlers = createRoleHandlers({
    resolveBook: options.resolveBook,
    store,
    getSettings: options.getSettings,
    setSettings: options.setSettings,
    loadSettings: options.loadSettings,
    saveSettings: options.saveSettings,
    readings: options.readings,
    workspaceLanguage: options.workspaceLanguage,
  } satisfies RoleHandlerDeps)
  void handlers.refresh().catch(() => {})
  return {
    handlers,
    module: {
      id: 'role',
      handlers: {
        [ROLE_ENDPOINT]: (payload: unknown) => handlers.role(payload),
      },
      tools: [],
    },
  }
}
