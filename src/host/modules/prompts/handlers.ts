import type { PromptPresetStore } from './store.ts'
import { ReaderError } from '../../lib/errors.ts'

export function createPromptHandlers({ store }: { store: PromptPresetStore }) {
  async function prompts(payload: any = {}): Promise<any> {
    const language = payload.locale === 'en' ? 'en' : 'zh'
    try {
      if (payload.action === 'list') {
        return { presets: await store.list(language) }
      }
      if (payload.action === 'save') {
        const preset = await store.save(payload, language)
        return { preset, presets: await store.list(language) }
      }
      if (payload.action === 'delete') {
        return { deleted: await store.remove(payload.id), presets: await store.list(language) }
      }
      if (payload.action === 'reset') {
        await store.reset()
        return { presets: await store.list(language) }
      }
      throw new ReaderError('invalid-prompt-action', `未知预设操作：${String(payload.action)}`)
    } catch (error) {
      if (error instanceof ReaderError) throw error
      throw new ReaderError('invalid-prompt', error instanceof Error ? error.message : String(error))
    }
  }

  return { prompts }
}
