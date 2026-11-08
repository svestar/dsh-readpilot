import { Button, Modal, React, h } from '../runtime.ts'
import type { TextFn } from '../types.ts'
import type { PromptPreset } from '../../prompt-presets.ts'

interface PromptPresetManagerProps {
  t: TextFn
  presets: PromptPreset[]
  error?: string
  onSave: (input: { id?: string; title: string; template: string }) => Promise<void>
  onDelete: (id: string) => Promise<void>
  onReset: () => Promise<void>
  onClose: () => void
}

export function PromptPresetManager({ t, presets, error, onSave, onDelete, onReset, onClose }: PromptPresetManagerProps) {
  const [selectedId, setSelectedId] = React.useState<string | null>(null)
  const [title, setTitle] = React.useState('')
  const [template, setTemplate] = React.useState('')
  const [busy, setBusy] = React.useState(false)
  const [localError, setLocalError] = React.useState('')

  const select = (preset: PromptPreset) => {
    setSelectedId(preset.id)
    setTitle(preset.title)
    setTemplate(preset.template)
    setLocalError('')
  }
  const startNew = () => {
    setSelectedId(null)
    setTitle('')
    setTemplate('{{selection}}')
    setLocalError('')
  }
  const save = async () => {
    if (!title.trim() || !template.trim()) {
      setLocalError(t('presetRequired'))
      return
    }
    setBusy(true)
    setLocalError('')
    try {
      await onSave({
        ...(selectedId ? { id: selectedId } : {}),
        title: title.trim(),
        template: template.trim(),
      })
      setSelectedId(null)
      setTitle('')
      setTemplate('')
    } catch (cause) {
      setLocalError(`${t('presetSaveFailed')}：${cause instanceof Error ? cause.message : String(cause)}`)
    } finally {
      setBusy(false)
    }
  }
  const remove = async () => {
    if (!selectedId) return
    setBusy(true)
    setLocalError('')
    try {
      await onDelete(selectedId)
      setSelectedId(null)
      setTitle('')
      setTemplate('')
    } catch (cause) {
      setLocalError(`${t('presetSaveFailed')}：${cause instanceof Error ? cause.message : String(cause)}`)
    } finally {
      setBusy(false)
    }
  }
  const reset = async () => {
    setBusy(true)
    setLocalError('')
    try {
      await onReset()
      setSelectedId(null)
      setTitle('')
      setTemplate('')
    } catch (cause) {
      setLocalError(`${t('presetSaveFailed')}：${cause instanceof Error ? cause.message : String(cause)}`)
    } finally {
      setBusy(false)
    }
  }

  return h(Modal, {
    open: true,
    onClose,
    closeLabel: t('close'),
    title: t('managePresets'),
    headless: true,
    className: 'dsh-readpilot-preset-manager',
  },
  h('h3', null, t('managePresets')),
  h('div', { className: 'dsh-readpilot-preset-columns' },
    h('div', { className: 'dsh-readpilot-preset-list' },
      presets.map(preset => h('button', {
        key: preset.id,
        type: 'button',
        className: 'dsh-readpilot-preset-item',
        'data-active': selectedId === preset.id ? 'true' : 'false',
        onClick: () => select(preset),
      }, preset.title)),
      h('button', { type: 'button', className: 'dsh-readpilot-preset-new', onClick: startNew }, t('presetNew'))),
    h('div', { className: 'dsh-readpilot-preset-editor' },
      h('label', { className: 'dsh-readpilot-preset-field' },
        h('span', null, t('presetTitle')),
        h('input', {
          value: title,
          maxLength: 40,
          disabled: busy,
          onChange: (event: any) => setTitle(event.target.value),
        })),
      h('label', { className: 'dsh-readpilot-preset-field' },
        h('span', null, t('presetTemplate')),
        h('textarea', {
          value: template,
          rows: 10,
          disabled: busy,
          onChange: (event: any) => setTemplate(event.target.value),
        })),
      h('div', { className: 'dsh-readpilot-preset-hint' }, t('presetTemplateHint')),
      (localError || error)
        ? h('div', { className: 'dsh-readpilot-note-dialog-error' }, localError || error)
        : null,
      h('div', { className: 'dsh-readpilot-preset-actions' },
        h(Button, { variant: 'outline', disabled: busy, onClick: reset }, t('presetReset')),
        selectedId
          ? h(Button, { variant: 'outline', disabled: busy, onClick: () => void remove() }, t('delete'))
          : null,
        h(Button, { variant: 'primary', disabled: busy, onClick: () => void save() }, busy ? t('loading') : t('save'))))),
  h('div', { className: 'dsh-readpilot-preset-footer' },
    h(Button, { variant: 'outline', disabled: busy, onClick: onClose }, t('close'))))
}
