import { React, h } from '../runtime.ts'
import type { TextFn } from '../types.ts'

export type MemoryMode = 'off' | 'ask' | 'on'
export type BookMemoryState = 'inherit' | 'on' | 'off'
export type MemoryScope = 'book' | 'reader'

export interface MemoryHistoryView {
  id: string
  createdAt: number
  characters: number
}

export interface MemoryProposalView {
  id: string
  scope: MemoryScope
  mode: 'append' | 'replace'
  preview: string
  createdAt: number
}

export interface MemoryView {
  mode: MemoryMode
  book: BookMemoryState
  effective: 'on' | 'off' | 'ask'
  bookText: string
  readerText: string
  bookHistory: MemoryHistoryView[]
  readerHistory: MemoryHistoryView[]
  proposals: MemoryProposalView[]
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
  onUndo: (scope: MemoryScope) => void
  onClear: (scope: MemoryScope) => void
  onApprove: (id: string) => void
  onReject: (id: string) => void
}

function modeLabel(t: TextFn, mode: MemoryMode): string {
  if (mode === 'off') return t('memoryModeOff')
  if (mode === 'on') return t('memoryModeOn')
  return t('memoryModeAsk')
}

function bookStateLabel(t: TextFn, state: BookMemoryState): string {
  if (state === 'on') return t('memoryBookOn')
  if (state === 'off') return t('memoryBookOff')
  return t('memoryBookInherit')
}

function effectiveLabel(t: TextFn, effective: 'on' | 'off' | 'ask'): string {
  if (effective === 'on') return t('memoryEffectiveOn')
  if (effective === 'off') return t('memoryEffectiveOff')
  return t('memoryEffectiveAsk')
}

function cardEditor(
  t: TextFn,
  scope: MemoryScope,
  text: string,
  setText: (value: string) => void,
  history: MemoryHistoryView[],
  props: MemoryPanelProps,
) {
  return h('div', { className: 'dsh-readpilot-memory-card' },
    h('div', { className: 'dsh-readpilot-memory-card-head' },
      h('span', null, scope === 'book' ? t('memoryBookCard') : t('memoryReaderCard')),
      h('span', { className: 'dsh-readpilot-long-meta' },
        `${text.length} ${t('noteContextChars')} · ${t('memoryHistoryCount')} ${history.length}`)),
    h('textarea', {
      value: text,
      rows: 5,
      placeholder: scope === 'book' ? t('memoryBookPlaceholder') : t('memoryReaderPlaceholder'),
      onChange: (event: any) => setText(event.target.value),
    }),
    h('div', { className: 'dsh-readpilot-long-editor-actions' },
      h('button', {
        type: 'button',
        className: 'dsh-readpilot-chat-send',
        disabled: props.busy,
        onClick: () => props.onSave(scope, text),
      }, t('save')),
      h('button', {
        type: 'button',
        className: 'dsh-readpilot-note-jump',
        disabled: props.busy || history.length === 0,
        onClick: () => props.onUndo(scope),
      }, t('memoryUndo')),
      h('button', {
        type: 'button',
        className: 'dsh-readpilot-note-delete',
        disabled: props.busy || !text.trim(),
        onClick: () => props.onClear(scope),
      }, t('clear'))),
    history.length > 0
      ? h('details', { className: 'dsh-readpilot-memory-history' },
        h('summary', null, `${t('history')} · ${history.length}`),
        history.slice(0, 10).map(entry => h('div', { key: entry.id, className: 'dsh-readpilot-long-hint' },
          `${new Date(entry.createdAt).toLocaleString()} · ${entry.characters} ${t('noteContextChars')}`)))
      : null)
}

export function MemoryPanel(props: MemoryPanelProps) {
  const { t, status } = props
  const [bookDraft, setBookDraft] = React.useState('')
  const [readerDraft, setReaderDraft] = React.useState('')

  React.useEffect(() => {
    setBookDraft(status?.bookText ?? '')
    setReaderDraft(status?.readerText ?? '')
  }, [status?.bookText, status?.readerText])

  if (!status && props.loading) {
    return h('section', { className: 'dsh-readpilot-memory' },
      h('div', { className: 'dsh-readpilot-chat-empty' }, t('loading')))
  }
  if (!status) {
    return h('section', { className: 'dsh-readpilot-memory' },
      props.error ? h('div', { className: 'dsh-readpilot-chat-error' }, props.error) : null,
      h('button', { type: 'button', className: 'dsh-readpilot-note-jump', onClick: props.onRefresh }, t('memoryLoad')))
  }

  return h('section', { className: 'dsh-readpilot-memory' },
    h('div', { className: 'dsh-readpilot-memory-head' },
      h('h4', null, t('memory')),
      h('button', {
        type: 'button',
        className: 'dsh-readpilot-note-jump',
        disabled: props.busy,
        onClick: props.onRefresh,
      }, t('refresh'))),
    props.error ? h('div', { className: 'dsh-readpilot-chat-error' }, props.error) : null,
    h('div', { className: 'dsh-readpilot-memory-modes' },
      h('span', { className: 'dsh-readpilot-long-meta' }, t('memoryDefaultMode')),
      (['off', 'ask', 'on'] as MemoryMode[]).map(mode => h('button', {
        key: mode,
        type: 'button',
        className: 'dsh-readpilot-chat-tab',
        'data-active': status.mode === mode ? 'true' : 'false',
        disabled: props.busy,
        onClick: () => props.onMode(mode),
      }, modeLabel(t, mode)))),
    h('div', { className: 'dsh-readpilot-memory-modes' },
      h('span', { className: 'dsh-readpilot-long-meta' }, t('memoryThisBook')),
      (['inherit', 'on', 'off'] as BookMemoryState[]).map(state => h('button', {
        key: state,
        type: 'button',
        className: 'dsh-readpilot-chat-tab',
        'data-active': status.book === state ? 'true' : 'false',
        disabled: props.busy,
        onClick: () => props.onBookState(state),
      }, bookStateLabel(t, state))),
      h('span', { className: 'dsh-readpilot-long-meta' }, `${t('memoryEffective')} ${effectiveLabel(t, status.effective)}`)),
    status.proposals.length > 0
      ? h('div', { className: 'dsh-readpilot-memory-proposals' },
        h('div', { className: 'dsh-readpilot-drafts-head' }, t('memoryProposals')),
        status.proposals.map(proposal => h('div', { key: proposal.id, className: 'dsh-readpilot-draft' },
          h('div', { className: 'dsh-readpilot-draft-head' },
            h('span', { className: 'dsh-readpilot-long-kind' },
              proposal.scope === 'book' ? t('memoryBookCard') : t('memoryReaderCard')),
            h('span', { className: 'dsh-readpilot-long-title' },
              proposal.mode === 'append' ? t('memoryAppend') : t('memoryReplace')),
            h('span', { className: 'dsh-readpilot-long-meta' }, new Date(proposal.createdAt).toLocaleTimeString())),
          h('pre', { className: 'dsh-readpilot-diff' }, proposal.preview.slice(0, 1200)),
          h('div', { className: 'dsh-readpilot-long-editor-actions' },
            h('button', {
              type: 'button',
              className: 'dsh-readpilot-chat-send',
              disabled: props.busy,
              onClick: () => props.onApprove(proposal.id),
            }, t('memoryApprove')),
            h('button', {
              type: 'button',
              className: 'dsh-readpilot-note-jump',
              disabled: props.busy,
              onClick: () => props.onReject(proposal.id),
            }, t('memoryReject'))))))
      : null,
    cardEditor(t, 'book', bookDraft, setBookDraft, status.bookHistory, props),
    cardEditor(t, 'reader', readerDraft, setReaderDraft, status.readerHistory, props),
    h('div', { className: 'dsh-readpilot-long-hint' }, t('memoryHint')))
}
