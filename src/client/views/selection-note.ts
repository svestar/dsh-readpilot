import { h } from '../runtime.ts'
import type { StateSetter } from '../runtime.ts'
import type { MutableRef, NoteEditor, NoteRef, Selection, TextFn } from '../types.ts'

const COLORS = ['yellow', 'green', 'blue', 'pink', 'purple']

interface SelectionToolbarProps {
  t: TextFn
  selection: Selection | null
  prefill: (kind: 'explain' | 'summarize' | 'translate') => void
  onNote: () => void
  onHighlight: (color: string) => void
}

export function SelectionToolbar({ t, selection, prefill, onNote, onHighlight }: SelectionToolbarProps) {
  if (!selection) return null
  return h('div', {
    className: 'dsh-reader-selection',
    style: { left: selection.x, top: Math.max(8, selection.y - 48) },
    onMouseDown: (event: any) => event.preventDefault(),
  },
  selection.blockIndex == null
    ? null
    : h('div', { className: 'dsh-reader-selection-colors', role: 'group', 'aria-label': t('highlight') },
      COLORS.map(color => h('button', {
        key: color,
        type: 'button',
        className: 'dsh-reader-color-btn',
        'data-color': color,
        title: `${t('highlight')}：${t(`highlight${color[0].toUpperCase()}${color.slice(1)}`)}`,
        'aria-label': `${t('highlight')}：${t(`highlight${color[0].toUpperCase()}${color.slice(1)}`)}`,
        onClick: () => onHighlight(color),
      }))),
  h('button', { type: 'button', onClick: () => prefill('explain') }, t('explain')),
  h('button', { type: 'button', onClick: () => prefill('summarize') }, t('summarize')),
  h('button', { type: 'button', onClick: () => prefill('translate') }, t('translate')),
  selection.blockIndex == null
    ? null
    : h('button', { type: 'button', onClick: () => onNote() }, t('noteAction')))
}

interface NoteDialogProps {
  t: TextFn
  noteEditor: NoteEditor | null
  noteDraft: string
  setNoteDraft: StateSetter<string>
  noteColor: string
  setNoteColor: StateSetter<string>
  noteSaving: boolean
  noteError: string
  noteInputRef: MutableRef<HTMLTextAreaElement | null>
  activeBookId: string | null
  deleteNote: (note: NoteRef) => Promise<void> | void
  closeNoteEditor: () => void
  saveNote: () => Promise<void> | void
}

export function NoteDialog({
  t,
  noteEditor,
  noteDraft,
  setNoteDraft,
  noteColor,
  setNoteColor,
  noteSaving,
  noteError,
  noteInputRef,
  activeBookId,
  deleteNote,
  closeNoteEditor,
  saveNote,
}: NoteDialogProps) {
  if (!noteEditor) return null
  const isHighlight = noteEditor.kind === 'highlight'
  const title = isHighlight ? t('annotationTitle') : noteEditor.noteId ? t('noteEditTitle') : t('noteDialogTitle')
  return h('div', {
    className: 'dsh-reader-note-overlay',
    onMouseDown: (event: any) => {
      if (event.target === event.currentTarget) closeNoteEditor()
    },
  },
  h('div', {
    className: 'dsh-reader-note-dialog',
    role: 'dialog',
    'aria-modal': 'true',
    'aria-label': title,
  },
  h('h3', null, title),
  h('div', { className: 'dsh-reader-note-dialog-quote' }, noteEditor.quote),
  isHighlight
    ? h('div', { className: 'dsh-reader-note-colors', role: 'group', 'aria-label': t('highlight') },
      COLORS.map(color => h('button', {
        key: color,
        type: 'button',
        className: 'dsh-reader-color-btn',
        'data-color': color,
        'data-active': noteColor === color ? 'true' : 'false',
        title: t(`highlight${color[0].toUpperCase()}${color.slice(1)}`),
        'aria-label': t(`highlight${color[0].toUpperCase()}${color.slice(1)}`),
        onClick: () => setNoteColor(color),
      })))
    : null,
  h('textarea', {
    ref: noteInputRef,
    value: noteDraft,
    rows: 4,
    placeholder: isHighlight ? t('annotationPlaceholder') : t('notePlaceholder'),
    disabled: noteSaving,
    onChange: (event: any) => setNoteDraft(event.target.value),
  }),
  noteError ? h('div', { className: 'dsh-reader-note-dialog-error' }, noteError) : null,
  h('div', { className: 'dsh-reader-note-dialog-actions' },
    noteEditor.noteId
      ? h('button', {
        type: 'button',
        className: 'dsh-reader-secondary',
        disabled: noteSaving,
        onClick: async () => {
          await deleteNote({ id: noteEditor.noteId!, bookId: activeBookId })
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
      disabled: noteSaving || (!isHighlight && !noteDraft.trim()),
      onClick: () => void saveNote(),
    }, noteSaving ? t('noteSaving') : t('save')))))
}
