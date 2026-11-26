import type { HostModule } from '../../types.ts'
import type { WorkspaceLanguage } from '../../../shared/contracts/library.ts'
import { PROMPTS_ENDPOINT } from '../../../shared/contracts/prompts.ts'
import { createPromptHandlers } from './handlers.ts'
import { createPromptPresetStore } from './store.ts'

export function createPromptsModule({ dataDir, workspaceLanguage }: {
  dataDir: string
  workspaceLanguage(): WorkspaceLanguage
}): {
  module: HostModule
  prompts: ReturnType<typeof createPromptHandlers>['prompts']
} {
  const store = createPromptPresetStore(dataDir)
  const { prompts } = createPromptHandlers({ store, language: workspaceLanguage })
  return {
    prompts,
    module: {
      id: 'prompts',
      handlers: {
        [PROMPTS_ENDPOINT]: (payload: unknown) => prompts(payload),
      },
      tools: [],
    },
  }
}
