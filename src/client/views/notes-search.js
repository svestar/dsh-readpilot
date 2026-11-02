import { h } from '../runtime.js'

export function NotesBody({ t, notesError, notesLoading, notes, screen, openNote, noteDeletingId, deleteNote }) {
  return h('div', { className: 'dsh-reader-notes' },
    notesError ? h('div', { className: 'dsh-reader-chat-error' }, notesError) : null,
    notesLoading && notes.length === 0
      ? h('div', { className: 'dsh-reader-chat-empty' }, t('loading'))
      : notes.length === 0
        ? notesError ? null : h('div', { className: 'dsh-reader-chat-empty' }, t('noteEmpty'))
        : notes.map(note => {
          const chapterTitle = screen.kind === 'book'
            ? screen.detail.toc.find(item => item.id === note.chapterId)?.title
            : ''
          return h('div', { key: note.id, className: 'dsh-reader-note' },
            h('button', {
              type: 'button',
              className: 'dsh-reader-note-main',
              onClick: () => openNote(note),
            },
            h('div', { className: 'dsh-reader-note-chapter' }, chapterTitle || t('reading')),
            note.quote ? h('div', { className: 'dsh-reader-note-quote' }, note.quote) : null,
            h('div', { className: 'dsh-reader-note-body' }, note.note)),
            h('button', {
              type: 'button',
              className: 'dsh-reader-note-jump',
              title: t('jump'),
              onClick: () => openNote(note),
            }, t('jump')),
            h('button', {
              type: 'button',
              className: 'dsh-reader-note-delete',
              disabled: noteDeletingId === note.id,
              onClick: () => void deleteNote(note),
            }, noteDeletingId === note.id ? t('loading') : t('delete')))
        }))
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
}) {
  if (!open || screen.kind !== 'book') return null
  return h('div', { className: 'dsh-reader-search' },
    h('div', { className: 'dsh-reader-search-bar' },
      h('input', {
        ref: searchInputRef,
        value: searchQuery,
        placeholder: t('searchPlaceholder'),
        spellCheck: false,
        onChange: event => setSearchQuery(event.target.value),
        onKeyDown: event => {
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
