import { h } from '../runtime.ts'
import { diffLines, formatSize } from '../helpers.ts'
import { MarkdownMessage } from './markdown.ts'
import type { NoteContextToggle, TextFn } from '../types.ts'
import type { LongNotesState } from '../hooks/use-long-notes.ts'

interface LongNotesProps {
  t: TextFn
  state: LongNotesState
  noteContext?: NoteContextToggle
}

export function LongNotes({ t, state, noteContext }: LongNotesProps) {
  const showActions = !state.active && !state.creating
  const emptyState = (title: string, hint: string) => h('div', { className: 'dsh-readpilot-empty-state' },
    h('div', { className: 'dsh-readpilot-empty-icon' }, '▤'),
    h('div', { className: 'dsh-readpilot-empty-title' }, title),
    hint ? h('div', { className: 'dsh-readpilot-empty-hint' }, hint) : null)
  return h('section', { className: 'dsh-readpilot-long-notes dsh-readpilot-page' },
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
      }, t('exportSave')),
      state.exportStatus
        ? h('span', { className: 'dsh-readpilot-long-hint' }, state.exportStatus)
        : null),
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
    state.drafts.length > 0
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
            h('pre', { className: 'dsh-readpilot-diff' },
              lines.slice(0, 80).map((line, index) => h('div', {
                key: `${draft.id}-${index}`,
                className: `dsh-readpilot-diff-line dsh-readpilot-diff-${line.type}`,
              }, `${line.type === 'add' ? '+ ' : line.type === 'del' ? '- ' : '  '}${line.text}`))),
            lines.length > 80
              ? h('div', { className: 'dsh-readpilot-long-hint' }, t('draftDiffTruncated'))
              : null,
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
      : null,
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
      : state.active
        ? h('div', { className: 'dsh-readpilot-card dsh-readpilot-preview-card' },
          h('div', { className: 'dsh-readpilot-preview-head' },
            h('span', { className: 'dsh-readpilot-long-kind' },
              state.active.note.kind === 'book' ? t('bookNote') : t('noteKindTopic')),
            h('h4', null, state.active.note.title),
            h('span', { className: 'dsh-readpilot-long-meta' },
              `${formatSize(state.active.note.size)} · ${new Date(state.active.note.updatedAt).toLocaleDateString()}`)),
          h('div', { className: 'dsh-readpilot-preview-actions' },
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
          h('div', { className: 'dsh-readpilot-preview-body' },
            h(MarkdownMessage, { text: state.active.body, prefix: 'long-note' })),
          state.historyOpen
            ? h('div', { className: 'dsh-readpilot-history' },
              h('div', { className: 'dsh-readpilot-section-head' },
                h('h4', null, t('history')),
                h('span', { className: 'dsh-readpilot-section-count' }, String(state.history.length))),
              state.history.length === 0
                ? h('div', { className: 'dsh-readpilot-chat-empty' }, t('historyEmpty'))
                : state.history.map(entry => h('div', { key: entry.id, className: 'dsh-readpilot-history-row' },
                  h('span', { className: 'dsh-readpilot-long-meta' }, new Date(entry.createdAt).toLocaleString()),
                  h('span', { className: 'dsh-readpilot-long-meta' },
                    `${entry.characters} ${t('noteContextChars')}`),
                  h('button', {
                    type: 'button',
                    className: 'dsh-readpilot-note-jump',
                    disabled: state.historyBusy,
                    onClick: () => void state.restoreHistory(entry),
                  }, t('historyRestore')))),
              h('button', {
                type: 'button',
                className: 'dsh-readpilot-note-jump',
                onClick: state.toggleHistory,
              }, t('historyClose')))
            : null,
          h('div', { className: 'dsh-readpilot-long-hint' }, t('openExternalHint')))
        : state.loading
          ? emptyState(t('loading'), '')
          : state.notes.length === 0
            ? emptyState(t('longNoteEmpty'), t('longNotesHint'))
            : h('div', { className: 'dsh-readpilot-long-list' },
              h('div', { className: 'dsh-readpilot-list-head' },
                h('span', null, t('allNotes')),
                h('span', { className: 'dsh-readpilot-section-count' }, String(state.notes.length))),
              state.notes.map(note => h('button', {
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
                `${formatSize(note.size)} · ${new Date(note.updatedAt).toLocaleDateString()}`)))))
}
