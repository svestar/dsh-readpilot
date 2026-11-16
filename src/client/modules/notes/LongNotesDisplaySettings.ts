import { React, h } from '../../runtime.ts'
import type { TextFn } from '../../lib/types.ts'

export interface LongNotesDisplay {
  exportTools: boolean
  context: boolean
  autoApply: boolean
}

export const DEFAULT_LONG_NOTES_DISPLAY: LongNotesDisplay = {
  exportTools: true,
  context: true,
  autoApply: true,
}

const LONG_NOTES_DISPLAY_KEY = 'dsh-readpilot.long-notes-display'

export function readLongNotesDisplay(): LongNotesDisplay {
  if (typeof window === 'undefined') return { ...DEFAULT_LONG_NOTES_DISPLAY }
  try {
    const value = JSON.parse(window.localStorage.getItem(LONG_NOTES_DISPLAY_KEY) ?? '{}')
    return {
      exportTools: value.exportTools !== false,
      context: value.context !== false,
      autoApply: value.autoApply !== false,
    }
  } catch {
    return { ...DEFAULT_LONG_NOTES_DISPLAY }
  }
}

export function writeLongNotesDisplay(value: LongNotesDisplay): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(LONG_NOTES_DISPLAY_KEY, JSON.stringify(value))
  } catch {
    // A disabled storage policy must not break the page.
  }
}

interface LongNotesDisplaySettingsProps {
  t: TextFn
  display: LongNotesDisplay
  onChange: (value: LongNotesDisplay) => void
  onClose: () => void
}

export function LongNotesDisplaySettings({ t, display, onChange, onClose }: LongNotesDisplaySettingsProps) {
  React.useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const checkbox = (key: keyof LongNotesDisplay, label: string) => h('label', {
    className: 'dsh-readpilot-settings-check',
  },
  h('input', {
    type: 'checkbox',
    checked: display[key],
    onChange: () => onChange({ ...display, [key]: !display[key] }),
  }),
  label)

  return h('div', {
    className: 'dsh-readpilot-settings-backdrop',
    onClick: (event: any) => {
      if (event.target === event.currentTarget) onClose()
    },
  },
  h('section', { className: 'dsh-readpilot-settings' },
    h('header', { className: 'dsh-readpilot-settings-head' },
      h('h3', null, t('longNotesDisplaySettings')),
      h('button', {
        type: 'button',
        className: 'dsh-readpilot-icon-action',
        title: t('close'),
        'aria-label': t('close'),
        onClick: onClose,
      }, '×')),
    h('section', { className: 'dsh-readpilot-settings-section' },
      h('div', { className: 'dsh-readpilot-settings-label' }, t('longNotesShowSections')),
      checkbox('exportTools', t('longNotesShowExport')),
      checkbox('context', t('longNotesShowContext')),
      checkbox('autoApply', t('longNotesShowAutoApply'))),
    h('div', { className: 'dsh-readpilot-long-editor-actions' },
      h('button', {
        type: 'button',
        className: 'dsh-readpilot-note-jump',
        onClick: () => onChange({ ...DEFAULT_LONG_NOTES_DISPLAY }),
      }, t('longNotesShowAll')),
      h('button', {
        type: 'button',
        className: 'dsh-readpilot-chat-send',
        onClick: onClose,
      }, t('close')))))
}
