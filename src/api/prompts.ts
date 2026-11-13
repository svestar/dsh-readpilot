import type { PromptPresetStore } from '../prompts/presets.ts'
import { ReaderError } from '../reading/error.ts'

export function createPromptHandlers({ store }: { store: PromptPresetStore }) {
  async function prompts(payload: any = {}): Promise<any> {
    try {
      if (payload.action === 'list') {
        return { presets: await store.list() }
      }
      if (payload.action === 'save') {
        const preset = await store.save(payload)
        return { preset, presets: await store.list() }
      }
      if (payload.action === 'delete') {
        return { deleted: await store.remove(payload.id), presets: await store.list() }
      }
      if (payload.action === 'reset') {
        return { presets: await store.reset() }
      }
      throw new ReaderError('invalid-prompt-action', `未知预设操作：${String(payload.action)}`)
    } catch (error) {
      if (error instanceof ReaderError) throw error
      throw new ReaderError('invalid-prompt', error instanceof Error ? error.message : String(error))
    }
  }

  return { prompts }
}
