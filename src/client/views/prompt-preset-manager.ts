import { Button, Modal, React, h } from '../runtime.ts'
import { renderPrompt } from '../../prompt-render.ts'
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

const VARIABLES = ['selection', 'book', 'chapter', 'notes'] as const

export function PromptPresetManager({ t, presets, error, onSave, onDelete, onReset, onClose }: PromptPresetManagerProps) {
  const initial = presets[0]
  const [selectedId, setSelectedId] = React.useState<string | null>(initial?.id ?? null)
  const [title, setTitle] = React.useState(initial?.title ?? '')
  const [template, setTemplate] = React.useState(initial?.template ?? '')
  const [busy, setBusy] = React.useState(false)
  const [localError, setLocalError] = React.useState('')
  const textareaRef = React.useRef<HTMLTextAreaElement | null>(null)

  const selected = presets.find(preset => preset.id === selectedId) ?? null
  const preview = template.trim()
    ? renderPrompt(template, {
      selection: t('presetSampleSelection'),
      book: t('presetSampleBook'),
      chapter: t('presetSampleChapter'),
      notes: t('presetSampleNotes'),
    })
    : ''

  React.useEffect(() => {
    if (selectedId || title || template || presets.length === 0) return
    select(presets[0])
  }, [presets, selectedId, template, title])

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
    requestAnimationFrame(() => textareaRef.current?.focus())
  }
  const insertVariable = (name: string) => {
    const token = `{{${name}}}`
    const textarea = textareaRef.current
    const start = textarea?.selectionStart ?? template.length
    const end = textarea?.selectionEnd ?? start
    const next = `${template.slice(0, start)}${token}${template.slice(end)}`
    setTemplate(next)
    requestAnimationFrame(() => {
      textarea?.focus()
      textarea?.setSelectionRange(start + token.length, start + token.length)
    })
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
  h('div', { className: 'dsh-readpilot-preset-header' },
    h('div', null,
      h('h3', null, t('managePresets')),
      h('span', { className: 'dsh-readpilot-preset-count' }, `${presets.length}`)),
    h(Button, { variant: 'outline', disabled: busy, onClick: startNew }, t('presetNew'))),
  h('div', { className: 'dsh-readpilot-preset-columns' },
    h('div', { className: 'dsh-readpilot-preset-list' },
      presets.length === 0
        ? h('div', { className: 'dsh-readpilot-preset-empty' }, t('presetEmpty'))
        : presets.map(preset => h('button', {
          key: preset.id,
          type: 'button',
          className: 'dsh-readpilot-preset-item',
          'data-active': selectedId === preset.id ? 'true' : 'false',
          onClick: () => select(preset),
        },
        h('span', { className: 'dsh-readpilot-preset-item-title' }, preset.title),
        h('span', { className: 'dsh-readpilot-preset-item-preview' }, preset.template.replace(/\s+/g, ' ').slice(0, 72)),
        preset.builtin
          ? h('span', { className: 'dsh-readpilot-preset-badge' }, t('presetBuiltin'))
          : null))),
    h('div', { className: 'dsh-readpilot-preset-editor' },
      h('div', { className: 'dsh-readpilot-preset-editor-head' },
        h('span', { className: 'dsh-readpilot-preset-editor-title' }, selectedId ? (selected?.title ?? '') : t('presetNew')),
        selected?.builtin
          ? h('span', { className: 'dsh-readpilot-preset-badge' }, t('presetBuiltin'))
          : null),
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
          ref: textareaRef,
          value: template,
          rows: 8,
          disabled: busy,
          onChange: (event: any) => setTemplate(event.target.value),
        })),
      h('div', { className: 'dsh-readpilot-preset-variables', role: 'group', 'aria-label': t('presetVariables') },
        h('span', { className: 'dsh-readpilot-preset-hint' }, t('presetVariables')),
        VARIABLES.map(name => h('button', {
          key: name,
          type: 'button',
          className: 'dsh-readpilot-preset-chip',
          disabled: busy,
          onClick: () => insertVariable(name),
        }, `{{${name}}}`))),
      h('div', { className: 'dsh-readpilot-preset-hint' }, t('presetTemplateHint')),
      preview
        ? h('div', { className: 'dsh-readpilot-preset-preview' },
          h('div', { className: 'dsh-readpilot-preset-preview-title' }, t('presetPreview')),
          h('pre', null, preview))
        : null,
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
