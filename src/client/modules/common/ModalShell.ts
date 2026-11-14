import { Modal, h } from '../../runtime.ts'
import type { TextFn } from '../../lib/types.ts'

export interface ModalShellProps {
  t: TextFn
  title: string
  meta?: string
  onClose: () => void
  children: any[]
}

export function ModalShell({ t, title, meta, onClose, children }: ModalShellProps) {
  // Headless keeps this package's header/body layout; the host supplies the
  // portal, mask, focus trap, Escape handling and modal stack registration.
  return h(Modal, {
    open: true,
    onClose,
    closeLabel: t('close'),
    title,
    headless: true,
    className: 'dsh-readpilot-modal',
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
  ...children)
}
