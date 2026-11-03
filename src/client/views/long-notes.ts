import { h } from '../runtime.ts'
import { formatSize } from '../helpers.ts'
import { MarkdownMessage } from './markdown.ts'
import type { TextFn } from '../types.ts'
import type { LongNotesState } from '../hooks/use-long-notes.ts'

interface LongNotesProps {
  t: TextFn
  state: LongNotesState
}

export function LongNotes({ t, state }: LongNotesProps) {
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
            : null),
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
