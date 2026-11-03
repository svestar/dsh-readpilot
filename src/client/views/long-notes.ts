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
  const editing = Boolean(state.active || state.creating)
  const kind = state.active?.note.kind ?? state.createKind
  return h('section', { className: 'dsh-reader-long-notes' },
    h('div', { className: 'dsh-reader-long-notes-head' },
      h('h4', null, t('longNotes')),
      editing
        ? null
        : h('div', { className: 'dsh-reader-long-notes-actions' },
          h('button', {
            type: 'button',
            className: 'dsh-reader-note-jump',
            onClick: () => state.start('book'),
          }, t('bookNote')),
          h('button', {
            type: 'button',
            className: 'dsh-reader-note-jump',
            onClick: () => state.start('topic'),
          }, t('newTopicNote')))),
    noteContext
      ? h('button', {
        type: 'button',
        className: 'dsh-reader-note-context',
        'data-on': noteContext.enabled ? 'true' : 'false',
        disabled: noteContext.busy,
        title: t('noteContextHint'),
        onClick: noteContext.toggle,
      },
      h('span', {
        className: 'dsh-reader-note-context-switch',
        'data-on': noteContext.enabled ? 'true' : 'false',
      }),
      h('span', { className: 'dsh-reader-note-context-label' }, t('noteContext')),
      h('span', { className: 'dsh-reader-note-context-state' },
        noteContext.enabled ? t('noteContextOn') : t('noteContextOff')),
      noteContext.enabled && noteContext.characters > 0
        ? h('span', { className: 'dsh-reader-note-context-chars' },
          `${noteContext.characters} ${t('noteContextChars')}`)
        : null)
      : null,
    state.drafts.length > 0
      ? h('div', { className: 'dsh-reader-drafts' },
        h('div', { className: 'dsh-reader-drafts-head' }, t('noteDrafts')),
        state.drafts.map(draft => {
          const lines = diffLines(draft.baseBody, draft.body)
          const added = lines.filter(line => line.type === 'add').length
          const removed = lines.filter(line => line.type === 'del').length
          return h('div', { key: draft.id, className: 'dsh-reader-draft' },
            h('div', { className: 'dsh-reader-draft-head' },
              h('span', { className: 'dsh-reader-long-kind' },
                draft.action === 'create'
                  ? t('draftCreate')
                  : draft.action === 'append' ? t('draftAppend') : t('draftEdit')),
              h('span', { className: 'dsh-reader-long-title' }, draft.title),
              h('span', { className: 'dsh-reader-long-meta' }, `+${added} −${removed}`)),
            h('pre', { className: 'dsh-reader-diff' },
              lines.slice(0, 80).map((line, index) => h('div', {
                key: `${draft.id}-${index}`,
                className: `dsh-reader-diff-line dsh-reader-diff-${line.type}`,
              }, `${line.type === 'add' ? '+ ' : line.type === 'del' ? '- ' : '  '}${line.text}`))),
            lines.length > 80
              ? h('div', { className: 'dsh-reader-long-hint' }, t('draftDiffTruncated'))
              : null,
            h('div', { className: 'dsh-reader-long-editor-actions' },
              h('button', {
                type: 'button',
                className: 'dsh-reader-chat-send',
                disabled: state.draftBusyId === draft.id,
                onClick: () => void state.applyDraft(draft),
              }, t('applyDraft')),
              h('button', {
                type: 'button',
                className: 'dsh-reader-note-jump',
                disabled: state.draftBusyId === draft.id,
                onClick: () => void state.rejectDraft(draft),
              }, t('rejectDraft'))))
        }))
      : null,
    h('div', { className: 'dsh-reader-long-notes-actions' },
      h('button', {
        type: 'button',
        className: 'dsh-reader-note-jump',
        disabled: state.exporting,
        onClick: () => void state.exportNotes(false),
      }, t('exportNotes')),
      h('button', {
        type: 'button',
        className: 'dsh-reader-note-jump',
        disabled: state.exporting,
        onClick: () => void state.exportNotes(true),
      }, t('exportSave')),
      state.exportStatus
        ? h('span', { className: 'dsh-reader-long-hint' }, state.exportStatus)
        : null),
    state.error ? h('div', { className: 'dsh-reader-chat-error' }, state.error) : null,
    editing
      ? h('div', { className: 'dsh-reader-long-editor' },
        h('div', { className: 'dsh-reader-long-editor-head' },
          h('input', {
            value: state.title,
            placeholder: t('longNoteTitle'),
            spellCheck: false,
            onChange: (event: any) => state.setTitle(event.target.value),
          }),
          h('span', { className: 'dsh-reader-long-kind' },
            kind === 'book' ? t('bookNote') : t('noteKindTopic'))),
        h('textarea', {
          value: state.draft,
          placeholder: t('notePlaceholder'),
          rows: 10,
          spellCheck: false,
          onChange: (event: any) => state.setDraft(event.target.value),
          onKeyDown: (event: any) => {
            if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
              event.preventDefault()
              void state.save()
            }
          },
        }),
        state.conflict
          ? h('div', { className: 'dsh-reader-long-conflict' },
            h('span', null, t('longNoteConflict')),
            h('button', {
              type: 'button',
              className: 'dsh-reader-note-jump',
              onClick: () => void state.reload(),
            }, t('reload')))
          : null,
        h('div', { className: 'dsh-reader-long-editor-actions' },
          h('button', {
            type: 'button',
            className: 'dsh-reader-chat-send',
            disabled: state.saving || !state.draft.trim(),
            onClick: () => void state.save(),
          }, state.saving ? t('noteSaving') : t('save')),
          h('button', {
            type: 'button',
            className: 'dsh-reader-note-jump',
            onClick: state.cancel,
          }, t('cancel')),
          state.active
            ? h('button', {
              type: 'button',
              className: 'dsh-reader-note-delete',
              disabled: state.saving,
              onClick: () => void state.remove(),
            }, t('delete'))
            : null,
          state.active
            ? h('button', {
              type: 'button',
              className: 'dsh-reader-note-jump',
              disabled: state.historyBusy,
              onClick: state.toggleHistory,
            }, t('history'))
            : null),
        state.active && state.historyOpen
          ? h('div', { className: 'dsh-reader-history' },
            h('div', { className: 'dsh-reader-drafts-head' }, t('history')),
            state.history.length === 0
              ? h('div', { className: 'dsh-reader-chat-empty' }, t('historyEmpty'))
              : state.history.map(entry => h('div', { key: entry.id, className: 'dsh-reader-history-row' },
                h('span', { className: 'dsh-reader-long-meta' }, new Date(entry.createdAt).toLocaleString()),
                h('span', { className: 'dsh-reader-long-meta' },
                  `${entry.characters} ${t('noteContextChars')}`),
                h('button', {
                  type: 'button',
                  className: 'dsh-reader-note-jump',
                  disabled: state.historyBusy,
                  onClick: () => void state.restoreHistory(entry),
                }, t('historyRestore')))),
            h('button', {
              type: 'button',
              className: 'dsh-reader-note-jump',
              onClick: state.toggleHistory,
            }, t('historyClose')))
          : null,
        h('details', { className: 'dsh-reader-long-preview' },
          h('summary', null, t('longNotePreview')),
          h(MarkdownMessage, { text: state.draft, prefix: 'long-note' })))
      : state.loading
        ? h('div', { className: 'dsh-reader-chat-empty' }, t('loading'))
        : state.notes.length === 0
          ? h('div', { className: 'dsh-reader-chat-empty' },
            h('div', null, t('longNoteEmpty')),
            h('div', { className: 'dsh-reader-long-hint' }, t('longNotesHint')))
          : h('div', { className: 'dsh-reader-long-list' },
            state.notes.map(note => h('button', {
              key: note.id,
              type: 'button',
              className: 'dsh-reader-long-note',
              onClick: () => void state.open(note),
            },
            h('span', { className: 'dsh-reader-long-kind' },
              note.kind === 'book' ? t('bookNote') : t('noteKindTopic')),
            h('span', { className: 'dsh-reader-long-title' }, note.title),
            h('span', { className: 'dsh-reader-long-meta' },
              `${formatSize(note.size)} · ${new Date(note.updatedAt).toLocaleDateString()}`)))))
}
