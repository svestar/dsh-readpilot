import { React, h } from '../../runtime.ts'
import type { TextFn } from '../../lib/types.ts'
import type { RoleHistoryView, RoleScope, RoleSource, RoleState } from '../../../shared/contracts/role.ts'
import { ConfirmDialog } from '../common/ConfirmDialog.ts'

const MAX_ROLE_CHARACTERS = 600

export interface RolePanelProps {
  t: TextFn
  status: RoleState | null
  loading: boolean
  error: string
  busy: boolean
  onRefresh: () => void
  onEnabled: (enabled: boolean) => void
  onBookEnabled: (enabled: boolean) => void
  onSave: (scope: RoleScope, text: string) => void
  onRestoreHistory: (scope: RoleScope, id: string) => void
  onRemoveHistory: (scope: RoleScope, id: string) => void
  onClearHistory: (scope: RoleScope) => void
  onUndo: (scope: RoleScope) => void
  onClear: (scope: RoleScope) => void
}

function sourceLabel(t: TextFn, source: RoleSource): string {
  if (source === 'book') return t('roleSourceBook')
  if (source === 'global') return t('roleSourceGlobal')
  return t('roleSourceDefault')
}

const sourceState: Record<RoleSource, string> = { book: 'on', global: 'on', default: 'off' }

interface HistoryActions {
  onRestore: (id: string) => void
  onRemove: (id: string) => void
  onClearHistory: () => void
}

interface EditorActions extends HistoryActions {
  onSave: (text: string) => void
  onUndo: () => void
  onClear: () => void
}

function historyBlock(t: TextFn, history: RoleHistoryView[], actions: HistoryActions, busy: boolean) {
  if (history.length === 0) return null
  return h('details', { className: 'dsh-readpilot-memory-history' },
    h('summary', null, `${t('history')} · ${history.length}`),
    h('div', { className: 'dsh-readpilot-long-editor-actions' },
      h('button', {
        type: 'button',
        className: 'dsh-readpilot-note-delete',
        disabled: busy,
        onClick: actions.onClearHistory,
      }, t('historyClear'))),
    history.slice(0, 10).map(entry => h('details', {
      key: entry.id,
      className: 'dsh-readpilot-memory-history-entry',
    },
    h('summary', null, `${new Date(entry.createdAt).toLocaleString()} · ${entry.characters}`),
    h('pre', { className: 'dsh-readpilot-memory-history-text' }, entry.text),
    h('div', { className: 'dsh-readpilot-long-editor-actions' },
      h('button', {
        type: 'button',
        className: 'dsh-readpilot-note-jump',
        disabled: busy,
        onClick: () => actions.onRestore(entry.id),
      }, t('historyRestore')),
      h('button', {
        type: 'button',
        className: 'dsh-readpilot-note-delete',
        disabled: busy,
        onClick: () => actions.onRemove(entry.id),
      }, t('historyDelete'))))))
}

function editor(
  t: TextFn,
  title: string,
  placeholder: string,
  text: string,
  setText: (value: string) => void,
  history: RoleHistoryView[],
  actions: EditorActions,
  busy: boolean,
  disabled: boolean,
) {
  return h('div', { className: 'dsh-readpilot-memory-card dsh-readpilot-card' },
    h('div', { className: 'dsh-readpilot-memory-card-head' },
      h('span', { className: 'dsh-readpilot-memory-card-title' }, title),
      h('span', { className: 'dsh-readpilot-long-meta' },
        `${text.length}/${MAX_ROLE_CHARACTERS} · ${t('memoryHistoryCount')} ${history.length}`)),
    h('textarea', {
      value: text,
      rows: 5,
      maxLength: MAX_ROLE_CHARACTERS,
      disabled,
      placeholder,
      onChange: (event: any) => setText(event.target.value),
    }),
    h('div', { className: 'dsh-readpilot-long-editor-actions' },
      h('button', {
        type: 'button',
        className: 'dsh-readpilot-chat-send',
        disabled: busy || disabled,
        onClick: () => actions.onSave(text),
      }, t('save')),
      h('button', {
        type: 'button',
        className: 'dsh-readpilot-note-jump',
        disabled: busy || disabled || history.length === 0,
        onClick: () => actions.onUndo(),
      }, t('memoryUndo')),
      h('button', {
        type: 'button',
        className: 'dsh-readpilot-note-delete',
        disabled: busy || disabled || !text.trim(),
        onClick: () => actions.onClear(),
      }, t('clear'))),
    historyBlock(t, history, actions, busy))
}

export function RolePanel(props: RolePanelProps) {
  const { t, status } = props
  const [globalDraft, setGlobalDraft] = React.useState(status?.globalText || status?.defaultText || '')
  const [bookDraft, setBookDraft] = React.useState(status?.bookText ?? '')
  const [confirm, setConfirm] = React.useState<{ kind: 'remove' | 'clear'; scope: RoleScope; id?: string } | null>(null)

  React.useEffect(() => {
    setGlobalDraft(status?.globalText || status?.defaultText || '')
    setBookDraft(status?.bookText ?? '')
  }, [status?.globalText, status?.bookText, status?.defaultText])

  const settle = (ok: boolean) => {
    const pending = confirm
    setConfirm(null)
    if (!ok || !pending) return
    if (pending.kind === 'clear') props.onClearHistory(pending.scope)
    else if (pending.id) props.onRemoveHistory(pending.scope, pending.id)
  }

  const heading = h('header', { className: 'dsh-readpilot-page-head dsh-readpilot-memory-head' },
    h('div', { className: 'dsh-readpilot-page-heading' },
      h('div', { className: 'dsh-readpilot-page-title-row' },
        h('h3', null, t('role')),
        status
          ? h('span', {
            className: 'dsh-readpilot-status-pill',
            'data-state': sourceState[status.effectiveSource],
          }, `${t('roleEffective')} ${sourceLabel(t, status.effectiveSource)}`)
          : null),
      h('p', { className: 'dsh-readpilot-page-subtitle' }, t('rolePageHint'))),
    h('button', {
      type: 'button',
      className: 'dsh-readpilot-icon-action',
      title: t('refresh'),
      'aria-label': t('refresh'),
      disabled: props.busy,
      onClick: props.onRefresh,
    }, '↻'))

  if (!status && props.loading) {
    return h('section', { className: 'dsh-readpilot-memory dsh-readpilot-page' }, heading,
      h('div', { className: 'dsh-readpilot-empty-state' }, t('loading')))
  }
  if (!status) {
    return h('section', { className: 'dsh-readpilot-memory dsh-readpilot-page' }, heading,
      props.error ? h('div', { className: 'dsh-readpilot-chat-error' }, props.error) : null,
      h('div', { className: 'dsh-readpilot-empty-state' },
        h('button', {
          type: 'button',
          className: 'dsh-readpilot-chat-send',
          onClick: props.onRefresh,
        }, t('roleLoad'))))
  }

  const globalActions: EditorActions = {
    onSave: text => {
      // The empty global card falls back to the default identity; saving that same text is a no-op.
      if (!status.globalText.trim() && text.trim() === status.defaultText.trim()) return
      props.onSave('global', text)
    },
    onUndo: () => props.onUndo('global'),
    onClear: () => props.onClear('global'),
    onRestore: id => props.onRestoreHistory('global', id),
    onRemove: id => setConfirm({ kind: 'remove', scope: 'global', id }),
    onClearHistory: () => setConfirm({ kind: 'clear', scope: 'global' }),
  }
  const bookActions: EditorActions = {
    onSave: text => props.onSave('book', text),
    onUndo: () => props.onUndo('book'),
    onClear: () => props.onClear('book'),
    onRestore: id => props.onRestoreHistory('book', id),
    onRemove: id => setConfirm({ kind: 'remove', scope: 'book', id }),
    onClearHistory: () => setConfirm({ kind: 'clear', scope: 'book' }),
  }

  return h('section', { className: 'dsh-readpilot-memory dsh-readpilot-page' },
    heading,
    props.error ? h('div', { className: 'dsh-readpilot-chat-error' }, props.error) : null,
    h('div', { className: 'dsh-readpilot-card dsh-readpilot-memory-controls' },
      h('div', { className: 'dsh-readpilot-section-head' },
        h('h4', null, t('roleEnabled'))),
      h('div', { className: 'dsh-readpilot-control-row' },
        h('div', { className: 'dsh-readpilot-segmented' },
          [true, false].map(enabled => h('button', {
            key: String(enabled),
            type: 'button',
            className: 'dsh-readpilot-segment',
            'data-active': status.enabled === enabled ? 'true' : 'false',
            disabled: props.busy,
            onClick: () => props.onEnabled(enabled),
          }, enabled ? t('roleEnabledOn') : t('roleEnabledOff'))))),
      h('div', { className: 'dsh-readpilot-long-hint' }, t('roleDefaultHint'))),
    editor(t, t('roleGlobal'), t('roleGlobalPlaceholder'), globalDraft, setGlobalDraft,
      status.globalHistory, globalActions, props.busy, !status.enabled),
    h('div', { className: 'dsh-readpilot-card dsh-readpilot-memory-controls' },
      h('div', { className: 'dsh-readpilot-section-head' },
        h('h4', null, t('roleThisBook'))),
      h('div', { className: 'dsh-readpilot-control-row' },
        h('span', { className: 'dsh-readpilot-control-label' }, t('roleUseBook')),
        h('div', { className: 'dsh-readpilot-segmented' },
          [false, true].map(enabled => h('button', {
            key: String(enabled),
            type: 'button',
            className: 'dsh-readpilot-segment',
            'data-active': status.bookEnabled === enabled ? 'true' : 'false',
            disabled: props.busy,
            onClick: () => props.onBookEnabled(enabled),
          }, enabled ? t('roleEnabledOn') : t('roleEnabledOff')))))),
    editor(t, t('roleThisBook'), t('roleBookPlaceholder'), bookDraft, setBookDraft,
      status.bookHistory, bookActions, props.busy, !status.enabled),
    h('div', { className: 'dsh-readpilot-memory-card dsh-readpilot-card' },
      h('div', { className: 'dsh-readpilot-section-head' },
        h('h4', null, t('roleEffective'))),
      h('div', { className: 'dsh-readpilot-long-meta' }, sourceLabel(t, status.effectiveSource)),
      h('pre', { className: 'dsh-readpilot-memory-history-text' }, status.effectiveText)),
    h(ConfirmDialog, {
      t,
      message: !confirm
        ? ''
        : confirm.kind === 'clear'
          ? t('roleHistoryClearConfirm')
          : t('historyDeleteConfirm'),
      onConfirm: () => settle(true),
      onCancel: () => settle(false),
    }))
}
