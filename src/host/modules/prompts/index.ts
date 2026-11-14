import type { HostModule } from '../../types.ts'
import { PROMPTS_ENDPOINT } from '../../../shared/contracts/prompts.ts'
import { createPromptHandlers } from './handlers.ts'
import { createPromptPresetStore } from './store.ts'

export function createPromptsModule({ dataDir }: { dataDir: string }): {
  module: HostModule
  prompts: ReturnType<typeof createPromptHandlers>['prompts']
} {
  const store = createPromptPresetStore(dataDir)
  const { prompts } = createPromptHandlers({ store })
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
