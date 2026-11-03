import { h } from '../runtime.ts'
import { bookmarkContext } from '../bookmark-label.ts'
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

function chapterTitleOf(screen: Screen, chapterId: string): string | undefined {
  return screen.kind === 'book'
    ? screen.detail.toc.find(item => item.id === chapterId)?.title
    : ''
}

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
      className: 'dsh-reader-note-jump',
      title: t('jump'),
      onClick: () => openNote(item),
    }, t('jump')),
    h('button', {
      key: 'delete',
      type: 'button',
      className: 'dsh-reader-note-delete',
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

export function NotesBody({ t, notesError, notesLoading, notes, highlights, bookmarks, screen, openNote, noteDeletingId, deleteNote }: NotesBodyProps) {
  const hasMarks = notes.length + highlights.length + bookmarks.length > 0
  return h('div', { className: 'dsh-reader-notes' },
    notesError ? h('div', { className: 'dsh-reader-chat-error' }, notesError) : null,
    notesLoading && !hasMarks
      ? h('div', { className: 'dsh-reader-chat-empty' }, t('loading'))
      : !hasMarks
        ? notesError ? null : h('div', { className: 'dsh-reader-chat-empty' }, t('noteEmpty'))
        : [
          highlights.length > 0
            ? h('section', { key: 'highlights', className: 'dsh-reader-mark-section' },
              h('h4', null, `${t('highlights')} · ${highlights.length}`),
              highlights.map(highlight => h('div', { key: highlight.id, className: 'dsh-reader-note dsh-reader-mark-highlight' },
                h('button', {
                  type: 'button',
                  className: 'dsh-reader-note-main',
                  onClick: () => openNote(highlight),
                },
                h('div', { className: 'dsh-reader-note-chapter' },
                  h('span', { className: `dsh-reader-color-dot dsh-reader-color-${highlight.color ?? 'yellow'}` }),
                  chapterTitleOf(screen, highlight.chapterId) || t('reading')),
                h('div', { className: 'dsh-reader-note-quote' }, highlight.quote),
                highlight.annotation
                  ? h('div', { className: 'dsh-reader-note-body' }, highlight.annotation)
                  : null),
                ...markActions({ t, item: highlight, noteDeletingId, deleteNote, openNote }))))
            : null,
          notes.length > 0
            ? h('section', { key: 'notes', className: 'dsh-reader-mark-section' },
              h('h4', null, `${t('notes')} · ${notes.length}`),
              notes.map(note => h('div', { key: note.id, className: 'dsh-reader-note' },
                h('button', {
                  type: 'button',
                  className: 'dsh-reader-note-main',
                  onClick: () => openNote(note),
                },
                h('div', { className: 'dsh-reader-note-chapter' }, chapterTitleOf(screen, note.chapterId) || t('reading')),
                note.quote ? h('div', { className: 'dsh-reader-note-quote' }, note.quote) : null,
                h('div', { className: 'dsh-reader-note-body' }, note.note)),
                ...markActions({ t, item: note, noteDeletingId, deleteNote, openNote }))))
            : null,
          bookmarks.length > 0
            ? h('section', { key: 'bookmarks', className: 'dsh-reader-mark-section' },
              h('h4', null, `${t('bookmarks')} · ${bookmarks.length}`),
              bookmarks.map(bookmark => {
                const context = bookmarkContext(screen, bookmark.chapterId)
                const title = context.chapterTitle || bookmark.note || t('bookmark')
                const detail = bookmark.annotation
                  || (context.pageLabel && context.pageLabel !== context.chapterTitle ? context.pageLabel : '')
                return h('div', { key: bookmark.id, className: 'dsh-reader-note dsh-reader-mark-bookmark' },
                  h('button', {
                    type: 'button',
                    className: 'dsh-reader-note-main',
                    onClick: () => openNote(bookmark),
                  },
                  h('div', { className: 'dsh-reader-note-chapter' }, title),
                  detail ? h('div', { className: 'dsh-reader-note-body' }, detail) : null),
                  ...markActions({ t, item: bookmark, noteDeletingId, deleteNote, openNote }))
              }))
            : null,
        ])
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
  return h('div', { className: 'dsh-reader-search' },
    h('div', { className: 'dsh-reader-search-bar' },
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
        className: 'dsh-reader-primary',
        disabled: searchBusy || !searchQuery.trim(),
        onClick: () => void runSearch(),
      }, searchBusy ? t('searching') : t('search')),
      h('button', {
        type: 'button',
        className: 'dsh-reader-icon-btn',
        title: t('closeSearch'),
        'aria-label': t('closeSearch'),
        onClick: () => setSearchOpen(false),
      }, '×')),
    searchError
      ? h('div', { className: 'dsh-reader-search-hint', 'data-error': 'true' }, searchError)
      : searchBusy
        ? h('div', { className: 'dsh-reader-search-hint' }, t('searching'))
        : searchResults === null
          ? null
          : searchResults.matches.length === 0
            ? h('div', { className: 'dsh-reader-search-hint' }, t('searchEmpty'))
            : h('div', { className: 'dsh-reader-search-list' },
              searchResults.matches.map((match, index) => h('button', {
                key: `${match.chapterId}:${match.offset}:${index}`,
                type: 'button',
                className: 'dsh-reader-search-result',
                onClick: () => openSearchMatch(match),
              },
              h('div', { className: 'dsh-reader-search-chapter' }, match.chapterTitle),
              h('div', { className: 'dsh-reader-search-snippet' }, match.snippet))),
              searchResults.truncated
                ? h('div', { className: 'dsh-reader-search-hint' }, t('searchTruncated'))
                : null))
}
