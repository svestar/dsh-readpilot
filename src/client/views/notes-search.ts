import { React, h, useVirtualizer } from '../runtime.ts'
import { bookmarkContext } from '../bookmark-label.ts'
import { filterMarks, markChapterIds, markColors } from '../mark-filters.ts'
import type { StateSetter } from '../runtime.ts'
import type {
  MutableRef,
  Note,
  NoteRef,
  Screen,
  SearchMatch,
  SearchResults,
  TextFn,
} from '../types.ts'

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

interface NotesBodyProps {
  t: TextFn
  notesError: string
  notesLoading: boolean
  notes: Note[]
  highlights: Note[]
  bookmarks: Note[]
  screen: Screen
  openNote: (note: Note) => void
  noteDeletingId: string | null
  deleteNote: (note: NoteRef) => Promise<void> | void
}

function colorLabel(t: TextFn, color: string): string {
  const key = `highlight${color.slice(0, 1).toUpperCase()}${color.slice(1)}`
  return t(key)
}

type MarkListRow =
  | { type: 'header'; key: string; title: string; count: number }
  | { type: 'mark'; key: string; kind: 'highlight' | 'note' | 'bookmark'; item: Note }

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

export function NotesBody({ t, notesError, notesLoading, notes, highlights, bookmarks, screen, openNote, noteDeletingId, deleteNote }: NotesBodyProps) {
  const [chapterFilter, setChapterFilter] = React.useState('all')
  const [colorFilter, setColorFilter] = React.useState('all')
  const allMarks = [...highlights, ...notes, ...bookmarks]
  const chapterIds = markChapterIds(allMarks)
  const chapterIdSet = new Set(chapterIds)
  const toc = screen.kind === 'book' ? screen.detail.toc : null
  const chapterTitleById = React.useMemo(
    () => new Map<string, string>(toc ? toc.map(item => [item.id, item.title]) : []),
    [toc],
  )
  const bookmarkContexts = React.useMemo(() => {
    const cache = new Map<string, { chapterTitle: string; pageLabel: string }>()
    return (chapterId: string | null) => {
      const key = chapterId ?? ''
      const cached = cache.get(key)
      if (cached) return cached
      const value = bookmarkContext(screen, chapterId)
      cache.set(key, value)
      return value
    }
  }, [screen])
  const colors = markColors(allMarks)
  const chapterTitles = screen.kind === 'book'
    ? screen.detail.toc.filter(item => chapterIdSet.has(item.id))
    : []
  const knownChapterIds = new Set(chapterTitles.map(item => item.id))
  const chapterOptions = [
    ...chapterTitles.map(item => ({ id: item.id, title: item.title })),
    ...chapterIds
      .filter(id => !knownChapterIds.has(id))
      .map(id => ({ id, title: id })),
  ]
  const filter = {
    chapterId: chapterFilter === 'all' ? null : chapterFilter,
    color: colorFilter === 'all' ? null : colorFilter,
  }
  const visibleHighlights = filterMarks(highlights, filter)
  const visibleNotes = filterMarks(notes, filter)
  const visibleBookmarks = filterMarks(bookmarks, filter)
  const total = visibleHighlights.length + visibleNotes.length + visibleBookmarks.length
  const allTotal = allMarks.length
  const virtual = typeof useVirtualizer === 'function' && total > 40
  const rows: MarkListRow[] = []
  if (virtual) {
    if (visibleHighlights.length > 0) {
      rows.push({ type: 'header', key: 'header:highlights', title: t('highlights'), count: visibleHighlights.length })
      for (const item of visibleHighlights) rows.push({ type: 'mark', key: `highlight:${item.id}`, kind: 'highlight', item })
    }
    if (visibleNotes.length > 0) {
      rows.push({ type: 'header', key: 'header:notes', title: t('shortNotes'), count: visibleNotes.length })
      for (const item of visibleNotes) rows.push({ type: 'mark', key: `note:${item.id}`, kind: 'note', item })
    }
    if (visibleBookmarks.length > 0) {
      rows.push({ type: 'header', key: 'header:bookmarks', title: t('bookmarks'), count: visibleBookmarks.length })
      for (const item of visibleBookmarks) rows.push({ type: 'mark', key: `bookmark:${item.id}`, kind: 'bookmark', item })
    }
  }
  const renderMarkRow = (row: MarkListRow) => {
    if (row.type === 'header') {
      return h('div', { className: 'dsh-readpilot-mark-section-head' },
        h('div', { className: 'dsh-readpilot-section-head' },
          h('h4', null, row.title),
          h('span', { className: 'dsh-readpilot-section-count' }, String(row.count))))
    }
    if (row.kind === 'highlight') {
      return h('div', { className: 'dsh-readpilot-note dsh-readpilot-mark-highlight' },
        h('button', {
          type: 'button',
          className: 'dsh-readpilot-note-main',
          onClick: () => openNote(row.item),
        },
        h('div', { className: 'dsh-readpilot-note-chapter' },
          h('span', { className: `dsh-readpilot-color-dot dsh-readpilot-color-${row.item.color ?? 'yellow'}` }),
          chapterTitleById.get(row.item.chapterId) || t('reading')),
        h('div', { className: 'dsh-readpilot-note-quote' }, row.item.quote),
        row.item.annotation
          ? h('div', { className: 'dsh-readpilot-note-body' }, row.item.annotation)
          : null),
        ...markActions({ t, item: row.item, noteDeletingId, deleteNote, openNote }))
    }
    if (row.kind === 'note') {
      return h('div', { className: 'dsh-readpilot-note' },
        h('button', {
          type: 'button',
          className: 'dsh-readpilot-note-main',
          onClick: () => openNote(row.item),
        },
        h('div', { className: 'dsh-readpilot-note-chapter' }, chapterTitleById.get(row.item.chapterId) || t('reading')),
        row.item.quote ? h('div', { className: 'dsh-readpilot-note-quote' }, row.item.quote) : null,
        h('div', { className: 'dsh-readpilot-note-body' }, row.item.note)),
        ...markActions({ t, item: row.item, noteDeletingId, deleteNote, openNote }))
    }
    const context = bookmarkContexts(row.item.chapterId)
    const title = context.chapterTitle || row.item.note || t('bookmark')
    const detail = row.item.annotation
      || (context.pageLabel && context.pageLabel !== context.chapterTitle ? context.pageLabel : '')
    return h('div', { className: 'dsh-readpilot-note dsh-readpilot-mark-bookmark' },
      h('button', {
        type: 'button',
        className: 'dsh-readpilot-note-main',
        onClick: () => openNote(row.item),
      },
      h('div', { className: 'dsh-readpilot-note-chapter' }, title),
      detail ? h('div', { className: 'dsh-readpilot-note-body' }, detail) : null),
      ...markActions({ t, item: row.item, noteDeletingId, deleteNote, openNote }))
  }
  const emptyState = (title: string, hint: string) => h('div', { className: 'dsh-readpilot-empty-state' },
    h('div', { className: 'dsh-readpilot-empty-icon' }, '✎'),
    h('div', { className: 'dsh-readpilot-empty-title' }, title),
    hint ? h('div', { className: 'dsh-readpilot-empty-hint' }, hint) : null)
  return h('div', {
    className: 'dsh-readpilot-notes dsh-readpilot-page',
    style: virtual ? { display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' } : undefined,
  },
    h('header', { className: 'dsh-readpilot-page-head' },
      h('div', { className: 'dsh-readpilot-page-heading' },
        h('div', { className: 'dsh-readpilot-page-title-row' },
          h('h3', null, t('notes')),
          h('span', { className: 'dsh-readpilot-page-count' }, total === allTotal ? String(total) : `${total} / ${allTotal}`)),
        h('p', { className: 'dsh-readpilot-page-subtitle' }, t('notesPageHint')))),
    allTotal > 0
      ? h('div', { className: 'dsh-readpilot-mark-filters' },
        chapterOptions.length > 1
          ? h('select', {
            className: 'dsh-readpilot-palette-select',
            value: chapterFilter,
            'aria-label': t('filterChapter'),
            onChange: (event: any) => setChapterFilter(event.target.value),
          },
          h('option', { value: 'all' }, t('allChapters')),
          chapterOptions.map(item => h('option', { key: item.id, value: item.id }, item.title)))
          : null,
        colors.length > 0
          ? h('div', { className: 'dsh-readpilot-color-filters' },
            colors.map(color => h('button', {
              key: color,
              type: 'button',
              className: `dsh-readpilot-color-filter dsh-readpilot-color-${color}`,
              'data-active': colorFilter === color ? 'true' : 'false',
              title: colorLabel(t, color),
              'aria-label': colorLabel(t, color),
              onClick: () => setColorFilter(previous => (previous === color ? 'all' : color)),
            })))
          : null)
      : null,
    notesError ? h('div', { className: 'dsh-readpilot-chat-error' }, notesError) : null,
    notesLoading && total === 0
      ? emptyState(t('loading'), '')
      : allTotal === 0
        ? notesError ? null : emptyState(t('noteEmpty'), t('notesEmptyHint'))
        : total === 0
          ? emptyState(t('noMatches'), '')
          : virtual
            ? h(VirtualMarkList, { rows, renderRow: renderMarkRow })
            : h('div', { className: 'dsh-readpilot-page-content' },
            visibleHighlights.length > 0
              ? h('section', { key: 'highlights', className: 'dsh-readpilot-card dsh-readpilot-mark-section' },
                h('div', { className: 'dsh-readpilot-section-head' },
                  h('h4', null, t('highlights')),
                  h('span', { className: 'dsh-readpilot-section-count' }, String(visibleHighlights.length))),
                visibleHighlights.map(highlight => h('div', { key: highlight.id, className: 'dsh-readpilot-note dsh-readpilot-mark-highlight' },
                  h('button', {
                    type: 'button',
                    className: 'dsh-readpilot-note-main',
                    onClick: () => openNote(highlight),
                  },
                  h('div', { className: 'dsh-readpilot-note-chapter' },
                    h('span', { className: `dsh-readpilot-color-dot dsh-readpilot-color-${highlight.color ?? 'yellow'}` }),
                    chapterTitleById.get(highlight.chapterId) || t('reading')),
                  h('div', { className: 'dsh-readpilot-note-quote' }, highlight.quote),
                  highlight.annotation
                    ? h('div', { className: 'dsh-readpilot-note-body' }, highlight.annotation)
                    : null),
                  ...markActions({ t, item: highlight, noteDeletingId, deleteNote, openNote }))))
              : null,
            visibleNotes.length > 0
              ? h('section', { key: 'notes', className: 'dsh-readpilot-card dsh-readpilot-mark-section' },
                h('div', { className: 'dsh-readpilot-section-head' },
                  h('h4', null, t('shortNotes')),
                  h('span', { className: 'dsh-readpilot-section-count' }, String(visibleNotes.length))),
                visibleNotes.map(note => h('div', { key: note.id, className: 'dsh-readpilot-note' },
                  h('button', {
                    type: 'button',
                    className: 'dsh-readpilot-note-main',
                    onClick: () => openNote(note),
                  },
                  h('div', { className: 'dsh-readpilot-note-chapter' }, chapterTitleById.get(note.chapterId) || t('reading')),
                  note.quote ? h('div', { className: 'dsh-readpilot-note-quote' }, note.quote) : null,
                  h('div', { className: 'dsh-readpilot-note-body' }, note.note)),
                  ...markActions({ t, item: note, noteDeletingId, deleteNote, openNote }))))
              : null,
            visibleBookmarks.length > 0
              ? h('section', { key: 'bookmarks', className: 'dsh-readpilot-card dsh-readpilot-mark-section' },
                h('div', { className: 'dsh-readpilot-section-head' },
                  h('h4', null, t('bookmarks')),
                  h('span', { className: 'dsh-readpilot-section-count' }, String(visibleBookmarks.length))),
                visibleBookmarks.map(bookmark => {
                  const context = bookmarkContexts(bookmark.chapterId)
                  const title = context.chapterTitle || bookmark.note || t('bookmark')
                  const detail = bookmark.annotation
                    || (context.pageLabel && context.pageLabel !== context.chapterTitle ? context.pageLabel : '')
                  return h('div', { key: bookmark.id, className: 'dsh-readpilot-note dsh-readpilot-mark-bookmark' },
                    h('button', {
                      type: 'button',
                      className: 'dsh-readpilot-note-main',
                      onClick: () => openNote(bookmark),
                    },
                    h('div', { className: 'dsh-readpilot-note-chapter' }, title),
                    detail ? h('div', { className: 'dsh-readpilot-note-body' }, detail) : null),
                    ...markActions({ t, item: bookmark, noteDeletingId, deleteNote, openNote }))
                }))
              : null))
}

interface SearchPanelProps {
  t: TextFn
  open: boolean
  screen: Screen
  searchInputRef: MutableRef<HTMLInputElement | null>
  searchQuery: string
  setSearchQuery: StateSetter<string>
  runSearch: () => Promise<void> | void
  searchBusy: boolean
  setSearchOpen: StateSetter<boolean>
  searchError: string
  searchResults: SearchResults | null
  openSearchMatch: (match: SearchMatch) => void
}

export function SearchPanel({
  t,
  open,
  screen,
  searchInputRef,
  searchQuery,
  setSearchQuery,
  runSearch,
  searchBusy,
  setSearchOpen,
  searchError,
  searchResults,
  openSearchMatch,
}: SearchPanelProps) {
  if (!open || screen.kind !== 'book') return null
  return h('div', { className: 'dsh-readpilot-search' },
    h('div', { className: 'dsh-readpilot-search-bar' },
      h('input', {
        ref: searchInputRef,
        value: searchQuery,
        placeholder: t('searchPlaceholder'),
        spellCheck: false,
        onChange: (event: any) => setSearchQuery(event.target.value),
        onKeyDown: (event: any) => {
          if (event.key === 'Enter' && !event.nativeEvent.isComposing) {
            event.preventDefault()
            void runSearch()
          }
        },
      }),
      h('button', {
        type: 'button',
        className: 'dsh-readpilot-primary',
        disabled: searchBusy || !searchQuery.trim(),
        onClick: () => void runSearch(),
      }, searchBusy ? t('searching') : t('search')),
      h('button', {
        type: 'button',
        className: 'dsh-readpilot-icon-btn',
        title: t('closeSearch'),
        'aria-label': t('closeSearch'),
        onClick: () => setSearchOpen(false),
      }, '×')),
    searchError
      ? h('div', { className: 'dsh-readpilot-search-hint', 'data-error': 'true' }, searchError)
      : searchBusy
        ? h('div', { className: 'dsh-readpilot-search-hint' }, t('searching'))
        : searchResults === null
          ? null
          : h('div', null,
            searchResults.matches.length === 0
              ? h('div', { className: 'dsh-readpilot-search-hint' }, t('searchEmpty'))
              : h('div', { className: 'dsh-readpilot-search-list' },
                searchResults.matches.map((match, index) => h('button', {
                  key: `${match.chapterId}:${match.offset}:${index}`,
                  type: 'button',
                  className: 'dsh-readpilot-search-result',
                  onClick: () => openSearchMatch(match),
                },
                h('div', { className: 'dsh-readpilot-search-chapter' }, match.chapterTitle),
                h('div', { className: 'dsh-readpilot-search-snippet' }, match.snippet)))),
            searchResults.truncated
              ? h('div', { className: 'dsh-readpilot-search-hint' },
                `${t('searchTruncated')}（${searchResults.booksScanned}/${searchResults.booksTotal}）`)
              : null,
            searchResults.unreadable
              ? h('div', { className: 'dsh-readpilot-search-hint' }, t('searchUnreadable'))
              : null))
}
