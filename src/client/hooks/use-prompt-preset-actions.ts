import { React } from '../runtime.ts'
import type { StateSetter } from '../runtime.ts'
import type { CallRpc } from '../../api/rpc.ts'
import type { PromptPreset } from '../../prompts/presets.ts'
import type { TextFn } from '../types.ts'
import { messageOf } from '../helpers.ts'

interface PromptPresetActionsOptions {
  call: CallRpc
  t: TextFn
  setPromptPresets: StateSetter<PromptPreset[]>
  setPresetError: StateSetter<string>
}

export function usePromptPresetActions({
  call,
  t,
  setPromptPresets,
  setPresetError,
}: PromptPresetActionsOptions) {
  const savePromptPreset = React.useCallback(async (input: { id?: string; title: string; template: string }) => {
    try {
      const value = await call('prompts', { action: 'save', ...input })
      setPromptPresets(Array.isArray(value.presets) ? value.presets : [])
      setPresetError('')
    } catch (cause) {
      setPresetError(`${t('presetSaveFailed')}：${messageOf(cause)}`)
      throw cause
    }
  }, [call, t])

  const deletePromptPreset = React.useCallback(async (id: string) => {
    try {
      const value = await call('prompts', { action: 'delete', id })
      setPromptPresets(Array.isArray(value.presets) ? value.presets : [])
      setPresetError('')
    } catch (cause) {
      setPresetError(`${t('presetSaveFailed')}：${messageOf(cause)}`)
      throw cause
    }
  }, [call, t])

  const resetPromptPresets = React.useCallback(async () => {
    try {
      const value = await call('prompts', { action: 'reset' })
      setPromptPresets(Array.isArray(value.presets) ? value.presets : [])
      setPresetError('')
    } catch (cause) {
      setPresetError(`${t('presetSaveFailed')}：${messageOf(cause)}`)
      throw cause
    }
  }, [call, t])

  return { savePromptPreset, deletePromptPreset, resetPromptPresets }
}
