import { h } from '../../runtime.ts'
import type { NoteContextToggle, TextFn } from '../../lib/types.ts'

interface NoteContextCardProps {
  t: TextFn
  noteContext: NoteContextToggle
}

export function NoteContextCard({ t, noteContext }: NoteContextCardProps) {
  return h('div', { className: 'dsh-readpilot-card dsh-readpilot-memory-controls' },
    h('div', { className: 'dsh-readpilot-section-head' },
      h('h4', null, t('noteContextTitle'))),
    h('div', { className: 'dsh-readpilot-control-row' },
      h('span', { className: 'dsh-readpilot-control-label' }, t('memoryDefaultMode')),
      h('div', { className: 'dsh-readpilot-segmented' },
        ([false, true] as const).map(enabled => h('button', {
          key: String(enabled),
          type: 'button',
          className: 'dsh-readpilot-segment',
          'data-active': noteContext.global === enabled ? 'true' : 'false',
          disabled: noteContext.busy,
          onClick: () => void noteContext.setGlobal(enabled),
        }, enabled ? t('memoryModeOn') : t('memoryModeOff'))))),
    h('div', { className: 'dsh-readpilot-control-row' },
      h('span', { className: 'dsh-readpilot-control-label' }, t('memoryThisBook')),
      h('div', { className: 'dsh-readpilot-segmented' },
        (['inherit', 'on', 'off'] as const).map(state => h('button', {
          key: state,
          type: 'button',
          className: 'dsh-readpilot-segment',
          'data-active': noteContext.state === state ? 'true' : 'false',
          disabled: noteContext.busy,
          onClick: () => void noteContext.setBookState(state),
        }, state === 'on' ? t('memoryBookOn') : state === 'off' ? t('memoryBookOff') : t('memoryBookInherit')))),
      h('span', {
        className: 'dsh-readpilot-status-pill',
        'data-state': noteContext.enabled ? 'on' : 'off',
      }, `${t('memoryEffective')} ${noteContext.enabled ? t('memoryEffectiveOn') : t('memoryEffectiveOff')}`)),
    h('div', { className: 'dsh-readpilot-long-hint dsh-readpilot-memory-hint' }, t('noteContextHint')))
}
