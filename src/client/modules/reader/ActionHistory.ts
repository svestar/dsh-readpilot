import { Modal, h } from '../../runtime.ts'
import type { TextFn } from '../../lib/types.ts'
import type { ReaderActionReceipt } from '../../../shared/contracts/actions.ts'

interface ActionHistoryProps {
  t: TextFn
  receipts: ReaderActionReceipt[]
  busyId: string | null
  onUndo: (receiptId: string) => Promise<void> | void
  onRefresh: () => Promise<void> | void
  onClose: () => void
}

const LABELS: Record<string, string> = {
  'annotation.add': 'actionAdded',
  'annotation.update': 'actionUpdated',
  'annotation.delete': 'actionDeleted',
  'longNote.write': 'actionLongWrite',
  'longNote.delete': 'actionLongDelete',
  'tag.update': 'actionTags',
  'status.update': 'actionStatus',
}

export function ActionHistory({ t, receipts, busyId, onUndo, onRefresh, onClose }: ActionHistoryProps) {
  return h(Modal, {
    open: true,
    onClose,
    closeLabel: t('close'),
    title: t('actionHistory'),
    headless: true,
    className: 'dsh-readpilot-action-history',
  },
  h('header', { className: 'dsh-readpilot-action-history-head' },
    h('div', { className: 'dsh-readpilot-action-history-heading' },
      h('h3', null, t('actionHistory')),
      h('p', null, t('actionHistoryHint'))),
    h('button', {
      type: 'button',
      className: 'dsh-readpilot-secondary dsh-readpilot-action-history-refresh',
      onClick: () => void onRefresh(),
    }, t('refresh'))),
  receipts.length === 0
    ? h('div', { className: 'dsh-readpilot-action-history-empty' }, t('actionHistoryEmpty'))
    : h('div', { className: 'dsh-readpilot-action-history-list' },
      receipts.map(receipt => h('article', {
        key: receipt.id,
        className: 'dsh-readpilot-action-history-row',
        'data-undone': receipt.undoneAt ? 'true' : 'false',
      },
      h('div', { className: 'dsh-readpilot-action-history-main' },
        h('div', { className: 'dsh-readpilot-action-history-title' },
          h('span', { className: 'dsh-readpilot-action-history-kind' }, t(LABELS[receipt.type] ?? 'actionStatus')),
          h('span', { className: 'dsh-readpilot-action-history-time' }, new Date(receipt.createdAt).toLocaleTimeString())),
        h('div', { className: 'dsh-readpilot-action-history-summary' }, receipt.summary)),
      receipt.undoable && !receipt.undoneAt
        ? h('button', {
          type: 'button',
          className: 'dsh-readpilot-secondary dsh-readpilot-action-history-undo',
          disabled: busyId === receipt.id,
          onClick: () => void onUndo(receipt.id),
        }, t('undo'))
        : h('span', { className: 'dsh-readpilot-action-history-done' }, t('undone'))))),
  h('footer', { className: 'dsh-readpilot-action-history-footer' },
    h('button', { type: 'button', className: 'dsh-readpilot-secondary', onClick: onClose }, t('close'))))
}
