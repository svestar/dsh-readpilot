import { Modal, React, h, useVirtualizer } from '../common/runtime.ts'
import { bookmarkContext } from './bookmark-label.ts'
import { filterMarks, markChapterIds, markColors } from './mark-filters.ts'
import type { StateSetter } from '../common/runtime.ts'
import type {
  CallRpc,
  MutableRef,
  Note,
  NoteRef,
  Screen,
  SearchMatch,
  SearchResults,
  TextFn,
} from '../common/types.ts'

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
  annotations: Note[]
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

export function NotesBody({ t, notesError, notesLoading, annotations, bookmarks, screen, openNote, noteDeletingId, deleteNote }: NotesBodyProps) {
  const [chapterFilter, setChapterFilter] = React.useState('all')
  const [colorFilter, setColorFilter] = React.useState('all')
  const [collapsed, setCollapsed] = React.useState({ annotations: false, bookmarks: false })
  const toggleSection = (section: 'annotations' | 'bookmarks') => {
    setCollapsed(previous => ({ ...previous, [section]: !previous[section] }))
  }
  const allMarks = [...annotations, ...bookmarks]
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
  const visibleAnnotations = filterMarks(annotations, filter)
  const visibleBookmarks = filterMarks(bookmarks, filter)
  const total = visibleAnnotations.length + visibleBookmarks.length
  const allTotal = allMarks.length
  const renderedItems = (collapsed.annotations ? 0 : visibleAnnotations.length)
    + (collapsed.bookmarks ? 0 : visibleBookmarks.length)
  const virtual = typeof useVirtualizer === 'function' && renderedItems > 40
  const rows: MarkListRow[] = []
  if (virtual) {
    if (visibleAnnotations.length > 0) {
      rows.push({ type: 'header', key: 'header:annotations', section: 'annotations', title: t('annotations'), count: visibleAnnotations.length })
      if (!collapsed.annotations) {
        for (const item of visibleAnnotations) rows.push({ type: 'mark', key: `annotation:${item.id}`, kind: 'annotation', item })
      }
    }
    if (visibleBookmarks.length > 0) {
      rows.push({ type: 'header', key: 'header:bookmarks', section: 'bookmarks', title: t('bookmarks'), count: visibleBookmarks.length })
      if (!collapsed.bookmarks) {
        for (const item of visibleBookmarks) rows.push({ type: 'mark', key: `bookmark:${item.id}`, kind: 'bookmark', item })
      }
    }
  }
  const sectionHead = (section: 'annotations' | 'bookmarks', title: string, count: number) =>
    h('div', { className: 'dsh-readpilot-mark-section-head' },
      h('div', { className: 'dsh-readpilot-section-head' },
        h('button', {
          type: 'button',
          className: 'dsh-readpilot-section-toggle',
          'aria-expanded': !collapsed[section],
          onClick: () => toggleSection(section),
        },
        h('span', {
          className: 'dsh-readpilot-section-chevron',
          'data-collapsed': collapsed[section] ? 'true' : 'false',
        }, collapsed[section] ? '▸' : '▾'),
        h('h4', null, title),
        h('span', { className: 'dsh-readpilot-section-count' }, String(count)))))
  const renderMarkRow = (row: MarkListRow) => {
    if (row.type === 'header') {
      return sectionHead(row.section, row.title, row.count)
    }
    if (row.kind === 'annotation') {
      const body = row.item.note || row.item.annotation
      return h('div', { className: 'dsh-readpilot-note dsh-readpilot-mark-annotation' },
        h('button', {
          type: 'button',
          className: 'dsh-readpilot-note-main',
          onClick: () => openNote(row.item),
        },
        h('div', { className: 'dsh-readpilot-note-chapter' },
          h('span', { className: `dsh-readpilot-color-dot dsh-readpilot-color-${row.item.color ?? 'yellow'}` }),
          chapterTitleById.get(row.item.chapterId) || t('reading')),
        row.item.quote ? h('div', { className: 'dsh-readpilot-note-quote' }, row.item.quote) : null,
        body ? h('div', { className: 'dsh-readpilot-note-body' }, body) : null),
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
            visibleAnnotations.length > 0
              ? h('section', { key: 'annotations', className: 'dsh-readpilot-card dsh-readpilot-mark-section' },
                sectionHead('annotations', t('annotations'), visibleAnnotations.length),
                collapsed.annotations ? null : visibleAnnotations.map(annotation => {
                  const body = annotation.note || annotation.annotation
                  return h('div', { key: annotation.id, className: 'dsh-readpilot-note dsh-readpilot-mark-annotation' },
                    h('button', {
                      type: 'button',
                      className: 'dsh-readpilot-note-main',
                      onClick: () => openNote(annotation),
                    },
                    h('div', { className: 'dsh-readpilot-note-chapter' },
                      h('span', { className: `dsh-readpilot-color-dot dsh-readpilot-color-${annotation.color ?? 'yellow'}` }),
                      chapterTitleById.get(annotation.chapterId) || t('reading')),
                    annotation.quote ? h('div', { className: 'dsh-readpilot-note-quote' }, annotation.quote) : null,
                    body ? h('div', { className: 'dsh-readpilot-note-body' }, body) : null),
                    ...markActions({ t, item: annotation, noteDeletingId, deleteNote, openNote }))
                }))
              : null,
            visibleBookmarks.length > 0
              ? h('section', { key: 'bookmarks', className: 'dsh-readpilot-card dsh-readpilot-mark-section' },
                sectionHead('bookmarks', t('bookmarks'), visibleBookmarks.length),
                collapsed.bookmarks ? null : visibleBookmarks.map(bookmark => {
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
  call: CallRpc
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

function SearchResultList({
  matches,
  onOpen,
}: {
  matches: SearchMatch[]
  onOpen: (match: SearchMatch) => void
}) {
  return h('div', { className: 'dsh-readpilot-search-list' },
    matches.map((match, index) => h('button', {
      key: `${match.chapterId}:${match.offset}:${index}`,
      type: 'button',
      className: 'dsh-readpilot-search-result',
      onClick: () => onOpen(match),
    },
    h('div', { className: 'dsh-readpilot-search-chapter' }, match.chapterTitle),
    h('div', { className: 'dsh-readpilot-search-snippet' }, match.snippet))))
}

interface SearchAllDialogProps {
  t: TextFn
  call: CallRpc
  bookId: string
  query: string
  onOpen: (match: SearchMatch) => void
  onClose: () => void
}

function SearchAllDialog({ t, call, bookId, query, onOpen, onClose }: SearchAllDialogProps) {
  const [results, setResults] = React.useState<SearchResults | null>(null)
  const [error, setError] = React.useState('')

  React.useEffect(() => {
    let active = true
    setResults(null)
    setError('')
    void call('search', { bookId, query, limit: 0 }).then(value => {
      if (!active) return
      setResults({
        matches: value.matches,
        truncated: value.truncated,
        booksScanned: value.booksScanned,
        booksTotal: value.booksTotal,
        unreadable: value.unreadable,
      })
    }).catch(cause => {
      if (active) setError(`${t('searchFailed')}：${cause instanceof Error ? cause.message : String(cause)}`)
    })
    return () => { active = false }
  }, [bookId, call, query, t])

  return h(Modal, {
    open: true,
    onClose,
    closeLabel: t('close'),
    title: t('searchAllTitle'),
    headless: true,
    className: 'dsh-readpilot-search-all',
  },
  error
    ? h('div', { className: 'dsh-readpilot-search-hint', 'data-error': 'true' }, error)
    : results === null
      ? h('div', { className: 'dsh-readpilot-search-hint' }, t('searching'))
      : h('div', { className: 'dsh-readpilot-search-all-body' },
        h('div', { className: 'dsh-readpilot-search-all-summary' },
          `${results.matches.length} ${t('searchAllCount')}`),
        results.matches.length === 0
          ? h('div', { className: 'dsh-readpilot-search-hint' }, t('searchEmpty'))
          : h('div', { className: 'dsh-readpilot-search-all-list' },
            h(SearchResultList, { matches: results.matches, onOpen })),
        results.truncated
          ? h('div', { className: 'dsh-readpilot-search-hint' }, t('searchAllTruncated'))
          : null,
        results.unreadable
          ? h('div', { className: 'dsh-readpilot-search-hint' }, t('searchUnreadable'))
          : null,
        h('div', { className: 'dsh-readpilot-search-all-footer' },
          h('button', { type: 'button', className: 'dsh-readpilot-secondary', onClick: onClose }, t('close')))))
}

export function SearchPanel({
  t,
  open,
  screen,
  call,
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
  const [allOpen, setAllOpen] = React.useState(false)
  React.useEffect(() => {
    if (!open) setAllOpen(false)
  }, [open])
  if (!open || screen.kind !== 'book') return null
  return h('div', { className: 'dsh-readpilot-search-host' },
    h('div', { className: 'dsh-readpilot-search' },
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
                : h(SearchResultList, { matches: searchResults.matches, onOpen: openSearchMatch }),
              searchResults.truncated
                ? h('button', {
                  type: 'button',
                  className: 'dsh-readpilot-secondary dsh-readpilot-search-more',
                  onClick: () => setAllOpen(true),
                }, t('searchMore'))
                : null,
              searchResults.truncated
                ? h('div', { className: 'dsh-readpilot-search-hint' },
                  `${t('searchTruncated')}（${searchResults.booksScanned}/${searchResults.booksTotal}）`)
                : null,
              searchResults.unreadable
                ? h('div', { className: 'dsh-readpilot-search-hint' }, t('searchUnreadable'))
                : null)),
    allOpen
      ? h(SearchAllDialog, {
        t,
        call,
        bookId: screen.detail.book.id,
        query: searchQuery,
        onOpen: (match: SearchMatch) => {
          setAllOpen(false)
          openSearchMatch(match)
        },
        onClose: () => setAllOpen(false),
      })
      : null)
}
