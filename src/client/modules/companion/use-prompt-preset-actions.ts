import { React } from '../../runtime.ts'
import type { StateSetter } from '../../runtime.ts'
import type { CallRpc } from '../../types.ts'
import type { PromptPreset } from '../../../shared/contracts/prompts.ts'
import type { WorkspaceLanguage } from '../../../shared/contracts/library.ts'
import type { TextFn } from '../../lib/types.ts'
import { messageOf } from '../../lib/helpers.ts'

interface PromptPresetActionsOptions {
  call: CallRpc
  t: TextFn
  locale: WorkspaceLanguage
  setPromptPresets: StateSetter<PromptPreset[]>
  setPresetError: StateSetter<string>
}

export function usePromptPresetActions({
  call,
  t,
  locale,
  setPromptPresets,
  setPresetError,
}: PromptPresetActionsOptions) {
  const savePromptPreset = React.useCallback(async (input: { id?: string; title: string; template: string }) => {
    try {
      const value = await call('prompts', { action: 'save', locale, ...input })
      setPromptPresets(Array.isArray(value.presets) ? value.presets : [])
      setPresetError('')
    } catch (cause) {
      setPresetError(`${t('presetSaveFailed')}${t('errorSeparator')}${messageOf(cause, t)}`)
      throw cause
    }
  }, [call, locale, t])

  const deletePromptPreset = React.useCallback(async (id: string) => {
    try {
      const value = await call('prompts', { action: 'delete', id, locale })
      setPromptPresets(Array.isArray(value.presets) ? value.presets : [])
      setPresetError('')
    } catch (cause) {
      setPresetError(`${t('presetSaveFailed')}${t('errorSeparator')}${messageOf(cause, t)}`)
      throw cause
    }
  }, [call, locale, t])

  const resetPromptPresets = React.useCallback(async () => {
    try {
      const value = await call('prompts', { action: 'reset', locale })
      setPromptPresets(Array.isArray(value.presets) ? value.presets : [])
      setPresetError('')
    } catch (cause) {
      setPresetError(`${t('presetSaveFailed')}${t('errorSeparator')}${messageOf(cause, t)}`)
      throw cause
    }
  }, [call, locale, t])

  return { savePromptPreset, deletePromptPreset, resetPromptPresets }
}
