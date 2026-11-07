import { Modal, h } from '../runtime.ts'
import type { TextFn } from '../types.ts'

interface ConfirmDialogProps {
  t: TextFn
  message: string
  onConfirm: () => void
  onCancel: () => void
}

/** Host Modal based confirmation used by long-note destructive actions. */
export function ConfirmDialog({ t, message, onConfirm, onCancel }: ConfirmDialogProps) {
  if (!message) return null
  return h(Modal, {
    open: true,
    onClose: onCancel,
    closeLabel: t('cancel'),
    title: t('confirmTitle'),
    description: message,
    footer: h('div', { className: 'dsh-readpilot-confirm-actions' },
      h('button', {
        type: 'button',
        className: 'dsh-readpilot-secondary',
        onClick: onCancel,
      }, t('cancel')),
      h('button', {
        type: 'button',
        className: 'dsh-readpilot-primary',
        onClick: onConfirm,
      }, t('confirmAction'))),
  })
}
