import { React, Toast, h, useVirtualizer } from '../runtime.ts'
import { buildNoteResource } from '../note-resource.ts'
import { diffLines, formatSize } from '../helpers.ts'
import { MarkdownMessage } from './markdown.ts'
import { ConfirmDialog } from './confirm-dialog.ts'
import { ModalShell } from './modal.ts'
import type { NoteAutoApplyToggle, NoteContextToggle, TextFn } from '../types.ts'
import type { LongNotesState } from '../hooks/use-long-notes.ts'
import type { LongNoteHistory } from '../types.ts'

interface LongNotesProps {
  t: TextFn
  state: LongNotesState
  noteContext?: NoteContextToggle
  autoApply?: NoteAutoApplyToggle
  useResource?: (address: string) => any
}

function VirtualNoteList({ notes, renderNote }: {
  notes: any[]
  renderNote: (note: any) => any
}) {
  const scrollRef = React.useRef<HTMLDivElement | null>(null)
  const virtualizer = useVirtualizer({
    count: notes.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 62,
    overscan: 6,
  })
  return h('div', { ref: scrollRef, className: 'dsh-readpilot-long-list-virtual' },
    h('div', { className: 'dsh-readpilot-long-list-virtual-inner', style: { height: `${virtualizer.getTotalSize()}px` } },
      virtualizer.getVirtualItems().map((row: any) => {
        const note = notes[row.index]
        return h('div', {
          key: note.id,
          ref: virtualizer.measureElement,
          'data-index': row.index,
          className: 'dsh-readpilot-long-list-virtual-row',
          style: { transform: `translateY(${row.start}px)` },
        }, renderNote(note))
      })))
}

function ActiveNoteSync({ useResource, address, onValue }: {
  useResource: (address: string) => any
  address: string
  onValue: (value: any) => void
}) {
  const resource = useResource(address)
  React.useEffect(() => {
    if (resource?.status === 'live' && resource.value) onValue(resource.value)
  }, [onValue, resource?.status, resource?.value])
  return null
}

function historyView(t: TextFn, state: LongNotesState) {
  return h('div', { className: 'dsh-readpilot-history' },
    h('div', { className: 'dsh-readpilot-section-head' },
      h('div', { className: 'dsh-readpilot-history-summary' },
        h('h4', null, t('history')),
        h('span', { className: 'dsh-readpilot-section-count' }, String(state.history.length))),
      h('button', {
        type: 'button',
        className: 'dsh-readpilot-note-delete',
        disabled: state.historyBusy || state.history.length === 0,
        onClick: () => void state.clearHistory(),
      }, t('historyClear'))),
    state.history.length === 0
      ? h('div', { className: 'dsh-readpilot-chat-empty' }, t('historyEmpty'))
      : state.history.map((entry: LongNoteHistory) => h('div', { key: entry.id, className: 'dsh-readpilot-history-row' },
        h('span', { className: 'dsh-readpilot-long-meta' }, new Date(entry.createdAt).toLocaleString()),
        h('span', { className: 'dsh-readpilot-long-meta' },
          `${entry.characters} ${t('noteContextChars')}`),
        h('button', {
          type: 'button',
          className: 'dsh-readpilot-note-jump',
          disabled: state.historyBusy,
          onClick: () => void state.restoreHistory(entry),
        }, t('historyRestore')),
        h('button', {
          type: 'button',
          className: 'dsh-readpilot-note-delete',
          disabled: state.historyBusy,
          onClick: () => void state.removeHistory(entry),
        }, t('historyDelete')))),
    h('button', {
      type: 'button',
      className: 'dsh-readpilot-note-jump',
      onClick: state.toggleHistory,
    }, t('historyClose')))
}

export function LongNotes({ t, state, noteContext, autoApply, useResource }: LongNotesProps) {
  const [previewOpen, setPreviewOpen] = React.useState(false)
  const showActions = !state.active && !state.creating
  const virtual = typeof useVirtualizer === 'function' && state.notes.length > 30
  const renderNote = (note: any) => h('button', {
    key: note.id,
    type: 'button',
    className: 'dsh-readpilot-long-note',
    'data-kind': note.kind,
    onClick: () => void state.open(note),
  },
  h('span', { className: 'dsh-readpilot-long-kind' },
    note.kind === 'book' ? t('bookNote') : t('noteKindTopic')),
  h('span', { className: 'dsh-readpilot-long-title' }, note.title),
  h('span', { className: 'dsh-readpilot-long-meta' },
    `${formatSize(note.size)} · ${new Date(note.updatedAt).toLocaleDateString()}`))

  React.useEffect(() => {
    setPreviewOpen(Boolean(state.active))
  }, [state.active])

  React.useEffect(() => {
    if (!previewOpen || typeof document === 'undefined' || !document.body) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
    }
  }, [previewOpen])

  const emptyState = (title: string, hint: string) => h('div', { className: 'dsh-readpilot-empty-state' },
    h('div', { className: 'dsh-readpilot-empty-icon' }, '▤'),
    h('div', { className: 'dsh-readpilot-empty-title' }, title),
    hint ? h('div', { className: 'dsh-readpilot-empty-hint' }, hint) : null)
  const draftsCard = state.drafts.length > 0
    ? h('div', { className: 'dsh-readpilot-card dsh-readpilot-drafts' },
      h('div', { className: 'dsh-readpilot-section-head' },
        h('h4', null, t('noteDrafts')),
        h('span', { className: 'dsh-readpilot-section-count' }, String(state.drafts.length))),
      state.drafts.map(draft => {
        const lines = diffLines(draft.baseBody, draft.body)
        const added = lines.filter(line => line.type === 'add').length
        const removed = lines.filter(line => line.type === 'del').length
        return h('div', { key: draft.id, className: 'dsh-readpilot-draft' },
          h('div', { className: 'dsh-readpilot-draft-head' },
            h('span', { className: 'dsh-readpilot-long-kind' },
              draft.action === 'create'
                ? t('draftCreate')
                : draft.action === 'append' ? t('draftAppend') : t('draftEdit')),
            h('span', { className: 'dsh-readpilot-long-title' }, draft.title),
            h('span', { className: 'dsh-readpilot-long-meta' }, `+${added} −${removed}`)),
          h('div', { className: 'dsh-readpilot-long-editor-actions' },
            h('button', {
              type: 'button',
              className: 'dsh-readpilot-chat-send',
              disabled: state.draftBusyId === draft.id,
              onClick: () => void state.applyDraft(draft),
            }, t('applyDraft')),
            h('button', {
              type: 'button',
              className: 'dsh-readpilot-note-jump',
              disabled: state.draftBusyId === draft.id,
              onClick: () => void state.rejectDraft(draft),
            }, t('rejectDraft'))))
      }))
    : null
  return h('section', {
    className: 'dsh-readpilot-long-notes dsh-readpilot-page',
    style: virtual ? { flex: 1, minHeight: 0, overflow: 'hidden' } : undefined,
  },
    h('header', { className: 'dsh-readpilot-page-head dsh-readpilot-long-notes-head' },
      h('div', { className: 'dsh-readpilot-page-heading' },
        h('div', { className: 'dsh-readpilot-page-title-row' },
          h('h3', null, t('longNotes')),
          h('span', { className: 'dsh-readpilot-page-count' }, String(state.notes.length))),
        h('p', { className: 'dsh-readpilot-page-subtitle' }, t('longNotesPageHint'))),
      showActions
        ? h('div', { className: 'dsh-readpilot-page-actions' },
          h('button', {
            type: 'button',
            className: 'dsh-readpilot-note-jump dsh-readpilot-pill',
            onClick: () => state.beginCreate('book'),
          }, t('bookNote')),
          h('button', {
            type: 'button',
            className: 'dsh-readpilot-note-jump dsh-readpilot-pill',
            onClick: () => state.beginCreate('topic'),
          }, t('newTopicNote')))
        : null),
    h('div', { className: 'dsh-readpilot-page-toolbar' },
      h('button', {
        type: 'button',
        className: 'dsh-readpilot-note-jump dsh-readpilot-tool-btn',
        disabled: state.exporting,
        onClick: () => void state.exportNotes(false),
      }, t('exportNotes')),
      h('button', {
        type: 'button',
        className: 'dsh-readpilot-note-jump dsh-readpilot-tool-btn',
        disabled: state.exporting,
        onClick: () => void state.exportNotes(true),
      }, t('exportSave'))),
    noteContext
      ? h('button', {
        type: 'button',
        className: 'dsh-readpilot-note-context',
        'data-on': noteContext.enabled ? 'true' : 'false',
        disabled: noteContext.busy,
        title: t('noteContextHint'),
        onClick: noteContext.toggle,
      },
      h('span', {
        className: 'dsh-readpilot-note-context-switch',
        'data-on': noteContext.enabled ? 'true' : 'false',
      }),
      h('span', { className: 'dsh-readpilot-note-context-label' }, t('noteContext')),
      h('span', { className: 'dsh-readpilot-note-context-state' },
        noteContext.enabled ? t('noteContextOn') : t('noteContextOff')),
      noteContext.enabled && noteContext.characters > 0
        ? h('span', { className: 'dsh-readpilot-note-context-chars' },
          `${noteContext.characters} ${t('noteContextChars')}`)
        : null)
      : null,
    autoApply
      ? h('button', {
        type: 'button',
        className: 'dsh-readpilot-note-context dsh-readpilot-note-auto',
        'data-on': autoApply.enabled ? 'true' : 'false',
        disabled: autoApply.busy,
        title: t('autoApplyNotesHint'),
        onClick: autoApply.toggle,
      },
      h('span', {
        className: 'dsh-readpilot-note-context-switch',
        'data-on': autoApply.enabled ? 'true' : 'false',
      }),
      h('span', { className: 'dsh-readpilot-note-context-label' }, t('autoApplyNotes')),
      h('span', { className: 'dsh-readpilot-note-context-state' },
        autoApply.enabled ? t('autoApplyNotesOn') : t('autoApplyNotesOff')))
      : null,
    draftsCard,
    state.error ? h('div', { className: 'dsh-readpilot-chat-error' }, state.error) : null,
    state.creating
      ? h('div', { className: 'dsh-readpilot-card dsh-readpilot-create-card' },
        h('div', { className: 'dsh-readpilot-section-head' },
          h('h4', null, state.createKind === 'book' ? t('bookNote') : t('newTopicNote'))),
        h('input', {
          value: state.title,
          placeholder: t('longNoteTitle'),
          spellCheck: false,
          onChange: (event: any) => state.setTitle(event.target.value),
        }),
        h('div', { className: 'dsh-readpilot-long-editor-actions' },
          h('button', {
            type: 'button',
            className: 'dsh-readpilot-chat-send',
            disabled: state.saving || !state.title.trim(),
            onClick: () => void state.create(),
          }, state.saving ? t('noteSaving') : t('createNote')),
          h('button', {
            type: 'button',
            className: 'dsh-readpilot-note-jump',
            onClick: state.cancelCreate,
          }, t('cancel'))))
      : state.loading
        ? emptyState(t('loading'), '')
        : state.notes.length === 0
          ? emptyState(t('longNoteEmpty'), t('longNotesHint'))
          : h('div', { className: 'dsh-readpilot-long-list', 'data-virtual': virtual ? 'true' : 'false' },
            h('div', { className: 'dsh-readpilot-list-head' },
              h('span', null, t('allNotes')),
              h('span', { className: 'dsh-readpilot-section-count' }, String(state.notes.length))),
            virtual
              ? h(VirtualNoteList, { notes: state.notes, renderNote })
              : state.notes.map(renderNote)),
    previewOpen && state.active
      ? h(ModalShell, {
        t,
        title: state.active.note.title,
        meta: `${state.active.note.kind === 'book' ? t('bookNote') : t('noteKindTopic')} · ${formatSize(state.active.note.size)} · ${new Date(state.active.note.updatedAt).toLocaleDateString()}`,
        onClose: () => state.close(),
        children: [
          state.error ? h('div', { className: 'dsh-readpilot-chat-error' }, state.error) : null,
          h('div', { className: 'dsh-readpilot-modal-actions' },
            h('button', {
              type: 'button',
              className: 'dsh-readpilot-chat-send',
              disabled: state.externalBusy,
              title: t('openExternalHint'),
              onClick: () => void state.openExternal(),
            }, t('openExternal')),
            h('button', {
              type: 'button',
              className: 'dsh-readpilot-note-jump',
              disabled: state.saving,
              onClick: () => void state.reload(),
            }, t('refresh')),
            h('button', {
              type: 'button',
              className: 'dsh-readpilot-note-jump',
              disabled: state.historyBusy,
              onClick: state.toggleHistory,
            }, t('history')),
            h('button', {
              type: 'button',
              className: 'dsh-readpilot-note-delete',
              disabled: state.saving,
              onClick: () => void state.remove(),
            }, t('delete')),
            h('button', {
              type: 'button',
              className: 'dsh-readpilot-note-jump',
              onClick: state.close,
            }, t('backToNotes'))),
          h('div', { className: 'dsh-readpilot-modal-body' },
            state.historyOpen
              ? historyView(t, state)
              : h(MarkdownMessage, { text: state.active.body, prefix: 'long-note' })),
          state.historyOpen
            ? null
            : h('div', { className: 'dsh-readpilot-long-hint' }, t('openExternalHint')),
        ],
      })
      : null,
    state.exportStatus
      ? h(Toast, {
        text: state.exportStatus,
        tone: 'success',
        onDone: state.clearExportStatus,
      })
      : null,
    state.active && useResource
      ? h(ActiveNoteSync, {
        useResource,
        address: buildNoteResource(state.active.note.bookId, state.active.note.id),
        onValue: state.applyExternalNote,
      })
      : null,
    h(ConfirmDialog, {
      t,
      message: state.confirmMessage,
      onConfirm: () => state.settleConfirm(true),
      onCancel: () => state.settleConfirm(false),
    })
  )
}
