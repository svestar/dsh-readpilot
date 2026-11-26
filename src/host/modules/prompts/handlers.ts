import type { WorkspaceLanguage } from '../../../shared/contracts/library.ts'
import type { PromptPresetStore } from './store.ts'
import { ReaderError } from '../../lib/errors.ts'

export function createPromptHandlers({ store, language }: {
  store: PromptPresetStore
  language(): WorkspaceLanguage
}) {
  async function prompts(payload: any = {}): Promise<any> {
    const currentLanguage = language()
    try {
      if (payload.action === 'list') {
        return { presets: await store.list(currentLanguage) }
      }
      if (payload.action === 'save') {
        const preset = await store.save(payload, currentLanguage)
        return { preset, presets: await store.list(currentLanguage) }
      }
      if (payload.action === 'delete') {
        return { deleted: await store.remove(payload.id), presets: await store.list(currentLanguage) }
      }
      if (payload.action === 'reset') {
        await store.reset()
        return { presets: await store.list(currentLanguage) }
      }
      throw new ReaderError('invalid-prompt-action', `未知预设操作：${String(payload.action)}`)
    } catch (error) {
      if (error instanceof ReaderError) throw error
      throw new ReaderError('invalid-prompt', error instanceof Error ? error.message : String(error))
    }
  }

  return { prompts }
}
