import { React, createPortal, Modal, h } from '../runtime.ts'
import type { StateSetter } from '../runtime.ts'
import type { MutableRef, NoteEditor, NoteRef, Selection, TextFn } from '../types.ts'

const COLORS = ['yellow', 'green', 'blue', 'pink', 'purple']

interface SelectionToolbarProps {
  t: TextFn
  selection: Selection | null
  onAsk?: () => void
  onNote: () => void
  onHighlight: (color: string) => void
}

const EDGE = 8
const GAP = 10

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

/** Format selected text as a Markdown quote draft with a closing blank line. */
export function quoteDraft(text: string): string {
  return `${text.split('\n').map(line => `> ${line}`).join('\n')}\n\n`
}

export function SelectionToolbar({ t, selection, onAsk, onNote, onHighlight }: SelectionToolbarProps) {
  const menuRef = React.useRef<HTMLDivElement | null>(null)
  const [position, setPosition] = React.useState<{ left: number; top: number } | null>(null)

  React.useEffect(() => {
    if (!selection) {
      setPosition(null)
      return
    }
    const menu = menuRef.current
    if (!menu) return
    setPosition(null)
    const place = () => {
      const rect = menu.getBoundingClientRect()
      const above = selection.y - rect.height - GAP
      const below = selection.y + 18
      const top = clamp(
        above >= EDGE ? above : below,
        EDGE,
        Math.max(EDGE, window.innerHeight - rect.height - EDGE),
      )
      const left = clamp(
        selection.x - rect.width / 2,
        EDGE,
        Math.max(EDGE, window.innerWidth - rect.width - EDGE),
      )
      setPosition(previous => previous?.left === left && previous.top === top ? previous : { left, top })
    }
    place()
    const observer = typeof ResizeObserver === 'function' ? new ResizeObserver(place) : null
    observer?.observe(menu)
    window.addEventListener('resize', place)
    return () => {
      observer?.disconnect()
      window.removeEventListener('resize', place)
    }
  }, [selection?.x, selection?.y])

  if (!selection || !document.body) return null
  // The menu is fixed to the viewport. Rendering it in place would let any
  // ancestor with a filter/transform (the glass sidebar's backdrop-filter, for
  // one) become its containing block, so viewport coordinates would land off
  // screen; the body portal keeps the initial containing block.
  return createPortal(h('div', {
    ref: menuRef,
    className: 'dsh-readpilot-selection',
    style: position ? { left: position.left, top: position.top } : { visibility: 'hidden' },
    onMouseDown: (event: any) => {
      event.preventDefault()
      event.stopPropagation()
    },
    onPointerUp: (event: any) => event.stopPropagation(),
  },
  selection.blockIndex == null
    ? null
    : h('div', { className: 'dsh-readpilot-selection-colors', role: 'group', 'aria-label': t('highlight') },
      COLORS.map(color => h('button', {
        key: color,
        type: 'button',
        className: 'dsh-readpilot-color-btn',
        'data-color': color,
        title: `${t('highlight')}：${t(`highlight${color[0].toUpperCase()}${color.slice(1)}`)}`,
        'aria-label': `${t('highlight')}：${t(`highlight${color[0].toUpperCase()}${color.slice(1)}`)}`,
        onClick: () => onHighlight(color),
      }))),
  onAsk ? h('button', { type: 'button', onClick: onAsk }, t('askCompanion')) : null,
  h('button', { type: 'button', onClick: () => onNote() }, t('noteAction'))), document.body)
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
  return h(Modal, {
    open: true,
    onClose: closeNoteEditor,
    closeLabel: t('close'),
    title,
    headless: true,
    className: 'dsh-readpilot-note-dialog',
  },
  h('h3', null, title),
  h('div', { className: 'dsh-readpilot-note-dialog-quote' }, noteEditor.quote),
  isHighlight
    ? h('div', { className: 'dsh-readpilot-note-colors', role: 'group', 'aria-label': t('highlight') },
      COLORS.map(color => h('button', {
        key: color,
        type: 'button',
        className: 'dsh-readpilot-color-btn',
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
  noteError ? h('div', { className: 'dsh-readpilot-note-dialog-error' }, noteError) : null,
  h('div', { className: 'dsh-readpilot-note-dialog-actions' },
    noteEditor.noteId
      ? h('button', {
        type: 'button',
        className: 'dsh-readpilot-secondary',
        disabled: noteSaving,
        onClick: async () => {
          await deleteNote({ id: noteEditor.noteId!, bookId: activeBookId })
          closeNoteEditor()
        },
      }, t('delete'))
      : null,
    h('button', {
      type: 'button',
      className: 'dsh-readpilot-secondary',
      disabled: noteSaving,
      onClick: closeNoteEditor,
    }, t('cancel')),
    h('button', {
      type: 'button',
      className: 'dsh-readpilot-primary',
      disabled: noteSaving || (!isHighlight && !noteDraft.trim()),
      onClick: () => void saveNote(),
    }, noteSaving ? t('noteSaving') : t('save'))))
}
