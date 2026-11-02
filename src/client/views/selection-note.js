import { h } from '../runtime.js'

export function SelectionToolbar({ t, selection, prefill, onNote }) {
  if (!selection) return null
  return h('div', {
    className: 'dsh-reader-selection',
    style: { left: selection.x, top: Math.max(8, selection.y - 48) },
    onMouseDown: event => event.preventDefault(),
  },
  h('button', { type: 'button', onClick: () => prefill('explain') }, t('explain')),
  h('button', { type: 'button', onClick: () => prefill('summarize') }, t('summarize')),
  h('button', { type: 'button', onClick: () => prefill('translate') }, t('translate')),
  selection.blockIndex == null
    ? null
    : h('button', { type: 'button', onClick: () => onNote() }, t('noteAction')))
}

export function NoteDialog({
  t,
  noteEditor,
  noteDraft,
  setNoteDraft,
  noteSaving,
  noteError,
  noteInputRef,
  activeBookId,
  deleteNote,
  closeNoteEditor,
  saveNote,
}) {
  if (!noteEditor) return null
  return h('div', {
    className: 'dsh-reader-note-overlay',
    onMouseDown: event => {
      if (event.target === event.currentTarget) closeNoteEditor()
    },
  },
  h('div', {
    className: 'dsh-reader-note-dialog',
    role: 'dialog',
    'aria-modal': 'true',
    'aria-label': noteEditor.noteId ? t('noteEditTitle') : t('noteDialogTitle'),
  },
  h('h3', null, noteEditor.noteId ? t('noteEditTitle') : t('noteDialogTitle')),
  h('div', { className: 'dsh-reader-note-dialog-quote' }, noteEditor.quote),
  h('textarea', {
    ref: noteInputRef,
    value: noteDraft,
    rows: 4,
    placeholder: t('notePlaceholder'),
    disabled: noteSaving,
    onChange: event => setNoteDraft(event.target.value),
  }),
  noteError ? h('div', { className: 'dsh-reader-note-dialog-error' }, noteError) : null,
  h('div', { className: 'dsh-reader-note-dialog-actions' },
    noteEditor.noteId
      ? h('button', {
        type: 'button',
        className: 'dsh-reader-secondary',
        disabled: noteSaving,
        onClick: async () => {
          await deleteNote({ id: noteEditor.noteId, bookId: activeBookId })
          closeNoteEditor()
        },
      }, t('delete'))
      : null,
    h('button', {
      type: 'button',
      className: 'dsh-reader-secondary',
      disabled: noteSaving,
      onClick: closeNoteEditor,
    }, t('cancel')),
    h('button', {
      type: 'button',
      className: 'dsh-reader-primary',
      disabled: noteSaving || !noteDraft.trim(),
      onClick: () => void saveNote(),
    }, noteSaving ? t('noteSaving') : t('save')))))
}
