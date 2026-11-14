import { React, h, useVirtualizer } from '../../runtime.ts'
import type { Note, NoteRef, TextFn } from '../../lib/types.ts'

interface MarkActionsArgs {
  t: TextFn
  item: Note
  noteDeletingId: string | null
  deleteNote: (note: NoteRef) => Promise<void> | void
  openNote: (note: Note) => void
}

function markActions({ t, item, noteDeletingId, deleteNote, openNote }: MarkActionsArgs): any[] {
  return [
    h('button', {
      key: 'jump',
      type: 'button',
      className: 'dsh-readpilot-note-jump',
      title: t('jump'),
      onClick: () => openNote(item),
    }, t('jump')),
    h('button', {
      key: 'delete',
      type: 'button',
      className: 'dsh-readpilot-note-delete',
      disabled: noteDeletingId === item.id,
      onClick: () => void deleteNote(item),
    }, noteDeletingId === item.id ? t('loading') : t('delete')),
  ]
}

function colorLabel(t: TextFn, color: string): string {
  const key = `highlight${color.slice(0, 1).toUpperCase()}${color.slice(1)}`
  return t(key)
}

type MarkListRow =
  | { type: 'header'; key: string; section: 'annotations' | 'bookmarks'; title: string; count: number }
  | { type: 'mark'; key: string; kind: 'annotation' | 'bookmark'; item: Note }

function VirtualMarkList({ rows, renderRow }: {
  rows: MarkListRow[]
  renderRow: (row: MarkListRow) => any
}) {
  const scrollRef = React.useRef<HTMLDivElement | null>(null)
  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 76,
    overscan: 6,
  })
  return h('div', { ref: scrollRef, className: 'dsh-readpilot-mark-list-virtual' },
    h('div', { className: 'dsh-readpilot-mark-list-virtual-inner', style: { height: `${virtualizer.getTotalSize()}px` } },
      virtualizer.getVirtualItems().map((row: any) => {
        const item = rows[row.index]
        return h('div', {
          key: item.key,
          ref: virtualizer.measureElement,
          'data-index': row.index,
          className: 'dsh-readpilot-mark-list-virtual-row',
          style: { transform: `translateY(${row.start}px)` },
        }, renderRow(item))
      })))
}

export { markActions, colorLabel, VirtualMarkList }
export type { MarkListRow }
