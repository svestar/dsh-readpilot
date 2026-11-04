import { h } from '../runtime.ts'
import type { TextFn } from '../types.ts'

export interface ModalShellProps {
  t: TextFn
  title: string
  meta?: string
  onClose: () => void
  children: any[]
}

export function ModalShell({ t, title, meta, onClose, children }: ModalShellProps) {
  return h('div', {
    className: 'dsh-readpilot-modal-overlay',
    role: 'presentation',
    onClick: onClose,
  },
  h('div', {
    className: 'dsh-readpilot-modal',
    role: 'dialog',
    'aria-modal': 'true',
    'aria-label': title,
    onClick: (event: any) => event.stopPropagation(),
  },
  h('div', { className: 'dsh-readpilot-modal-head' },
    h('div', { className: 'dsh-readpilot-modal-title' },
      h('h3', null, title),
      meta ? h('span', { className: 'dsh-readpilot-modal-meta' }, meta) : null),
    h('button', {
      type: 'button',
      className: 'dsh-readpilot-icon-action',
      title: t('close'),
      'aria-label': t('close'),
      onClick: onClose,
    }, '×')),
  ...children))
}
