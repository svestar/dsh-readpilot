import { React, h } from '../../runtime.ts'
import type { TextFn } from '../../lib/types.ts'
import { ConfirmDialog } from '../common/ConfirmDialog.ts'

export type MemoryMode = 'off' | 'on'
export type BookMemoryState = 'inherit' | 'on' | 'off'
export type MemoryScope = 'book' | 'reader' | 'role'

export const MAX_MEMORY_CHARACTERS = 600

export interface MemoryHistoryView {
  id: string
  text: string
  createdAt: number
  characters: number
}

export interface MemoryView {
  mode: MemoryMode
  book: BookMemoryState
  effective: 'on' | 'off'
  bookText: string
  readerText: string
  roleText: string
  bookHistory: MemoryHistoryView[]
  readerHistory: MemoryHistoryView[]
  roleHistory: MemoryHistoryView[]
}

export interface MemoryPanelProps {
  t: TextFn
  status: MemoryView | null
  loading: boolean
  error: string
  busy: boolean
  onRefresh: () => void
  onMode: (mode: MemoryMode) => void
  onBookState: (state: BookMemoryState) => void
  onSave: (scope: MemoryScope, text: string) => void
  onRestoreHistory: (scope: MemoryScope, id: string) => void
  onRemoveHistory: (scope: MemoryScope, id: string) => void
  onClearHistory: (scope: MemoryScope) => void
  onUndo: (scope: MemoryScope) => void
  onClear: (scope: MemoryScope) => void
}

function modeLabel(t: TextFn, mode: MemoryMode): string {
  return mode === 'on' ? t('memoryModeOn') : t('memoryModeOff')
}

function bookStateLabel(t: TextFn, state: BookMemoryState): string {
  if (state === 'on') return t('memoryBookOn')
  if (state === 'off') return t('memoryBookOff')
  return t('memoryBookInherit')
}

function effectiveLabel(t: TextFn, effective: 'on' | 'off'): string {
  return effective === 'on' ? t('memoryEffectiveOn') : t('memoryEffectiveOff')
}

interface HistoryActions {
  onRestore: (id: string) => void
  onRemove: (id: string) => void
  onClear: () => void
}

type HistoryConfirm =
  | { kind: 'clear'; scope: MemoryScope }
  | { kind: 'remove'; scope: MemoryScope; id: string }

function cardEditor(
  t: TextFn,
  scope: MemoryScope,
  text: string,
  setText: (value: string) => void,
  history: MemoryHistoryView[],
  props: MemoryPanelProps,
  historyActions: HistoryActions | undefined,
  disabled: boolean,
) {
  return h('div', { className: 'dsh-readpilot-memory-card dsh-readpilot-card' },
    h('div', { className: 'dsh-readpilot-memory-card-head' },
      h('span', { className: 'dsh-readpilot-memory-card-title' },
        scope === 'book' ? t('memoryBookCard') : scope === 'reader' ? t('memoryReaderCard') : t('memoryRoleCard')),
      h('span', { className: 'dsh-readpilot-long-meta' },
        `${text.length}/${MAX_MEMORY_CHARACTERS} · ${t('memoryHistoryCount')} ${history.length}`)),
    h('textarea', {
      value: text,
      rows: 5,
      maxLength: MAX_MEMORY_CHARACTERS,
      disabled,
      placeholder: scope === 'book' ? t('memoryBookPlaceholder') : scope === 'reader' ? t('memoryReaderPlaceholder') : t('memoryRolePlaceholder'),
      onChange: (event: any) => setText(event.target.value),
    }),
    h('div', { className: 'dsh-readpilot-long-editor-actions' },
      h('button', {
        type: 'button',
        className: 'dsh-readpilot-chat-send',
        disabled: props.busy || disabled,
        onClick: () => props.onSave(scope, text),
      }, t('save')),
      h('button', {
        type: 'button',
        className: 'dsh-readpilot-note-jump',
        disabled: props.busy || disabled || history.length === 0,
        onClick: () => props.onUndo(scope),
      }, t('memoryUndo')),
      h('button', {
        type: 'button',
        className: 'dsh-readpilot-note-delete',
        disabled: props.busy || disabled || !text.trim(),
        onClick: () => props.onClear(scope),
      }, t('clear'))),
    history.length > 0
      ? h('details', { className: 'dsh-readpilot-memory-history' },
        h('summary', null, `${t('history')} · ${history.length}`),
        historyActions
          ? h('div', { className: 'dsh-readpilot-long-editor-actions' },
            h('button', {
              type: 'button',
              className: 'dsh-readpilot-note-delete',
              disabled: props.busy,
              onClick: historyActions.onClear,
            }, t('historyClear')))
          : null,
        history.slice(0, 10).map(entry => h('details', {
          key: entry.id,
          className: 'dsh-readpilot-memory-history-entry',
        },
        h('summary', null, `${new Date(entry.createdAt).toLocaleString()} · ${entry.characters} ${t('noteContextChars')}`),
        h('pre', { className: 'dsh-readpilot-memory-history-text' }, entry.text || t('memoryHistoryEmpty')),
        historyActions
          ? h('div', { className: 'dsh-readpilot-long-editor-actions' },
            h('button', {
              type: 'button',
              className: 'dsh-readpilot-note-jump',
              disabled: props.busy || disabled,
              onClick: () => historyActions.onRestore(entry.id),
            }, t('historyRestore')),
            h('button', {
              type: 'button',
              className: 'dsh-readpilot-note-delete',
              disabled: props.busy,
              onClick: () => historyActions.onRemove(entry.id),
            }, t('historyDelete')))
          : null)))
      : null)
}

export function MemoryPanel(props: MemoryPanelProps) {
  const { t, status } = props
  const [bookDraft, setBookDraft] = React.useState('')
  const [readerDraft, setReaderDraft] = React.useState('')
  const [roleDraft, setRoleDraft] = React.useState('')
  const [historyConfirm, setHistoryConfirm] = React.useState<HistoryConfirm | null>(null)

  const historyActionsFor = (scope: MemoryScope): HistoryActions => ({
    onRestore: id => props.onRestoreHistory(scope, id),
    onRemove: id => setHistoryConfirm({ kind: 'remove', scope, id }),
    onClear: () => setHistoryConfirm({ kind: 'clear', scope }),
  })

  const settleHistoryConfirm = (ok: boolean) => {
    const pending = historyConfirm
    setHistoryConfirm(null)
    if (!ok || !pending) return
    if (pending.kind === 'clear') props.onClearHistory(pending.scope)
    else props.onRemoveHistory(pending.scope, pending.id)
  }

  React.useEffect(() => {
    setBookDraft(status?.bookText ?? '')
    setReaderDraft(status?.readerText ?? '')
    setRoleDraft(status?.roleText ?? '')
  }, [status?.bookText, status?.readerText, status?.roleText])

  const emptyState = (title: string, hint: string) => h('div', { className: 'dsh-readpilot-empty-state' },
    h('div', { className: 'dsh-readpilot-empty-icon' }, '◍'),
    h('div', { className: 'dsh-readpilot-empty-title' }, title),
    hint ? h('div', { className: 'dsh-readpilot-empty-hint' }, hint) : null)
  const heading = h('header', { className: 'dsh-readpilot-page-head dsh-readpilot-memory-head' },
    h('div', { className: 'dsh-readpilot-page-heading' },
      h('div', { className: 'dsh-readpilot-page-title-row' },
        h('h3', null, t('memory')),
        status
          ? h('span', {
            className: 'dsh-readpilot-status-pill',
            'data-state': status.effective,
          }, effectiveLabel(t, status.effective))
          : null),
      h('p', { className: 'dsh-readpilot-page-subtitle' }, t('memoryPageHint'))),
    h('button', {
      type: 'button',
      className: 'dsh-readpilot-icon-action',
      title: t('refresh'),
      'aria-label': t('refresh'),
      disabled: props.busy,
      onClick: props.onRefresh,
    }, '↻'))

  if (!status && props.loading) {
    return h('section', { className: 'dsh-readpilot-memory dsh-readpilot-page' },
      heading,
      emptyState(t('loading'), ''))
  }
  if (!status) {
    return h('section', { className: 'dsh-readpilot-memory dsh-readpilot-page' },
      heading,
      props.error ? h('div', { className: 'dsh-readpilot-chat-error' }, props.error) : null,
      h('div', { className: 'dsh-readpilot-empty-state' },
        h('div', { className: 'dsh-readpilot-empty-icon' }, '◍'),
        h('button', {
          type: 'button',
          className: 'dsh-readpilot-chat-send',
          onClick: props.onRefresh,
        }, t('memoryLoad'))))
  }

  return h('section', { className: 'dsh-readpilot-memory dsh-readpilot-page' },
    heading,
    props.error ? h('div', { className: 'dsh-readpilot-chat-error' }, props.error) : null,
    h('div', { className: 'dsh-readpilot-card dsh-readpilot-memory-controls' },
      h('div', { className: 'dsh-readpilot-section-head' },
        h('h4', null, t('memorySettings'))),
      h('div', { className: 'dsh-readpilot-control-row' },
        h('span', { className: 'dsh-readpilot-control-label' }, t('memoryDefaultMode')),
        h('div', { className: 'dsh-readpilot-segmented' },
          (['off', 'on'] as MemoryMode[]).map(mode => h('button', {
            key: mode,
            type: 'button',
            className: 'dsh-readpilot-segment',
            'data-active': status.mode === mode ? 'true' : 'false',
            disabled: props.busy,
            onClick: () => props.onMode(mode),
          }, modeLabel(t, mode))))),
      h('div', { className: 'dsh-readpilot-control-row' },
        h('span', { className: 'dsh-readpilot-control-label' }, t('memoryThisBook')),
        h('div', { className: 'dsh-readpilot-segmented' },
          (['inherit', 'on', 'off'] as BookMemoryState[]).map(state => h('button', {
            key: state,
            type: 'button',
            className: 'dsh-readpilot-segment',
            'data-active': status.book === state ? 'true' : 'false',
            disabled: props.busy,
            onClick: () => props.onBookState(state),
          }, bookStateLabel(t, state)))),
        h('span', {
          className: 'dsh-readpilot-status-pill',
          'data-state': status.effective,
        }, `${t('memoryEffective')} ${effectiveLabel(t, status.effective)}`))),
    cardEditor(t, 'book', bookDraft, setBookDraft, status.bookHistory, props, historyActionsFor('book'), status.effective !== 'on'),
    cardEditor(t, 'reader', readerDraft, setReaderDraft, status.readerHistory, props, historyActionsFor('reader'), status.mode !== 'on'),
    cardEditor(t, 'role', roleDraft, setRoleDraft, status.roleHistory, props, historyActionsFor('role'), status.mode !== 'on'),
    h('div', { className: 'dsh-readpilot-long-hint dsh-readpilot-memory-hint' }, t('memoryHint')),
    h(ConfirmDialog, {
      t,
      message: !historyConfirm
        ? ''
        : historyConfirm.kind === 'clear'
          ? historyConfirm.scope === 'book'
            ? t('memoryBookHistoryClearConfirm')
            : historyConfirm.scope === 'reader'
              ? t('memoryHistoryClearConfirm')
              : t('memoryRoleHistoryClearConfirm')
          : t('historyDeleteConfirm'),
      onConfirm: () => settleHistoryConfirm(true),
      onCancel: () => settleHistoryConfirm(false),
    }))
}
