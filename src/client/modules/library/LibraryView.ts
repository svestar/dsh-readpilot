import { React, h, useVirtualizer } from '../../runtime.ts'
import { readCoversEnabled, saveCoversEnabled } from '../../lib/helpers.ts'
import {
  bookRating,
  bookStatus,
  bookTags,
  categoryCounts,
  filterBooks,
  tagCatalogue,
} from './library-utils.ts'
import { BookCard } from './BookCard.ts'
import { DuplicateDialog, TagDialog } from './BookDialogs.ts'
import { VirtualBookGrid } from './VirtualBookGrid.ts'
import type { ClientBook, Snapshot, TextFn } from '../../lib/types.ts'

const FORMATS = ['txt', 'md', 'epub', 'pdf']

interface LibraryProps {
  t: TextFn
  snapshot: Snapshot
  busy: boolean
  onOpen: (book: ClientBook) => void
  onRefresh: () => void | Promise<void>
  onSettings: () => void
  onSetTags: (book: ClientBook, tags: string[]) => Promise<string[]>
  onSetStatus: (book: ClientBook, status: string | null) => Promise<string | null>
  onSetRating: (book: ClientBook, rating: number) => Promise<number | null>
  onDeleteDuplicate: (book: ClientBook) => Promise<void>
}

export function Library({ t, snapshot, busy, onOpen, onRefresh, onSettings, onSetTags, onSetStatus, onSetRating, onDeleteDuplicate }: LibraryProps) {
  const books = snapshot.books
  const tags = snapshot.tags ?? {}
  const statuses = snapshot.status ?? {}
  const ratings = snapshot.rating ?? {}
  const [category, setCategory] = React.useState('all')
  const [query, setQuery] = React.useState('')
  const [sort, setSort] = React.useState('recent')
  const [coversEnabled, setCoversEnabled] = React.useState(readCoversEnabled)
  const toggleCovers = React.useCallback(() => {
    setCoversEnabled(previous => {
      saveCoversEnabled(!previous)
      return !previous
    })
  }, [])
  const [tagEditor, setTagEditor] = React.useState<{ book: ClientBook; initialTags: string[] } | null>(null)
  const [duplicateOpen, setDuplicateOpen] = React.useState(false)
  const duplicates = books.filter(book => book.duplicateOf)
  const counts = React.useMemo(() => categoryCounts(books, tags, statuses), [books, tags, statuses])
  const tagStats = React.useMemo(() => tagCatalogue(books, tags), [books, tags])
  const visible = React.useMemo(
    () => filterBooks(books, tags, { category, query, sort, status: statuses }),
    [books, tags, statuses, category, query, sort],
  )
  const categoryTitle = category === 'all'
    ? t('allBooks')
    : category.startsWith('tag:')
      ? `#${category.slice(4)}`
      : category.startsWith('format:')
        ? category.slice(7).toUpperCase()
        : category === 'recent'
          ? t('recentReading')
          : category === 'unread'
            ? t('unread')
            : category === 'done'
              ? t('statusDone')
              : t('inProgress')

  const categoryButton = (key: string, label: string, count?: number) => h('button', {
    key,
    type: 'button',
    className: 'dsh-readpilot-library-category',
    'data-active': category === key ? 'true' : 'false',
    onClick: () => setCategory(key),
  },
  h('span', null, label),
  typeof count === 'number' ? h('span', { className: 'dsh-readpilot-library-count' }, count) : null)

  const renderBook = (book: ClientBook) => h(BookCard, {
    key: book.id,
    t,
    book,
    tags: bookTags(book.id, tags),
    status: bookStatus(book.id, statuses),
    rating: bookRating(book.id, ratings),
    showCover: coversEnabled,
    onOpen,
    onEditTags: (entry: ClientBook) => setTagEditor({
      book: entry,
      initialTags: bookTags(entry.id, tags),
    }),
  })
  const virtual = typeof useVirtualizer === 'function'

  return h('div', { className: 'dsh-readpilot-library' },
    h('aside', { className: 'dsh-readpilot-library-side' },
      h('div', { className: 'dsh-readpilot-library-side-title' }, t('categories')),
      categoryButton('all', t('allBooks'), counts.all),
      categoryButton('recent', t('recentReading'), counts.recent),
      categoryButton('reading', t('inProgress'), counts.reading),
      categoryButton('done', t('statusDone'), counts.done),
      categoryButton('unread', t('unread'), counts.unread),
      h('div', { className: 'dsh-readpilot-library-side-title' }, t('formats')),
      FORMATS.map(format => categoryButton(`format:${format}`, format.toUpperCase(), counts.formats[format])),
      tagStats.length > 0
        ? h('div', { className: 'dsh-readpilot-library-side-title' }, t('tags'))
        : null,
      tagStats.map(({ tag, count }) => categoryButton(`tag:${tag}`, `# ${tag}`, count))),
    h('div', { className: 'dsh-readpilot-library-main' },
      h('div', { className: 'dsh-readpilot-library-head' },
        h('div', null,
          h('h2', null, `${t('library')} · ${books.length}`),
          h('div', { className: 'dsh-readpilot-library-subtitle' }, t('librarySubtitle'))),
        h('div', { className: 'dsh-readpilot-header-actions' },
          duplicates.length > 0
            ? h('button', {
              type: 'button',
              className: 'dsh-readpilot-secondary',
              onClick: () => setDuplicateOpen(true),
            }, t('reviewDuplicates'))
            : null,
          h('button', { type: 'button', className: 'dsh-readpilot-secondary', onClick: onSettings }, t('settings')),
          h('button', { type: 'button', className: 'dsh-readpilot-secondary', disabled: busy, onClick: onRefresh }, t('rescan')))),
      h('div', { className: 'dsh-readpilot-library-toolbar' },
        h('input', {
          className: 'dsh-readpilot-library-search',
          value: query,
          placeholder: t('searchLibrary'),
          spellCheck: false,
          onChange: (event: any) => setQuery(event.target.value),
        }),
        h('select', {
          className: 'dsh-readpilot-palette-select',
          value: sort,
          onChange: (event: any) => setSort(event.target.value),
          'aria-label': t('sortBy'),
        },
        h('option', { value: 'recent' }, t('sortRecent')),
        h('option', { value: 'title' }, t('sortTitle')),
        h('option', { value: 'size' }, t('sortSize')),
        h('option', { value: 'added' }, t('sortAdded'))),
        h('button', {
          type: 'button',
          className: 'dsh-readpilot-cover-toggle',
          'data-active': coversEnabled ? 'true' : 'false',
          title: coversEnabled ? t('hideCovers') : t('showCovers'),
          onClick: toggleCovers,
        }, coversEnabled ? t('hideCovers') : t('showCovers'))),
      books.length === 0
        ? h('div', { className: 'dsh-readpilot-empty' },
          h('h2', null, t('empty')),
          h('p', null, t('emptyHint')))
        : h('div', { className: 'dsh-readpilot-library-scroll', 'data-virtual': virtual ? 'true' : 'false' },
          h('section', { className: 'dsh-readpilot-all-section' },
            h('div', { className: 'dsh-readpilot-section-head' },
              h('h3', null, categoryTitle),
              h('span', null, `${visible.length}`)),
            visible.length === 0
              ? h('div', { className: 'dsh-readpilot-library-empty' }, t('noMatches'))
              : virtual
                ? h(VirtualBookGrid, { items: visible, renderCard: renderBook })
                : h('div', { className: 'dsh-readpilot-grid' }, visible.map(renderBook))))),
    tagEditor
      ? h(TagDialog, {
        t,
        book: tagEditor.book,
        initialTags: tagEditor.initialTags,
        allTags: tagStats.map(item => item.tag),
        initialStatus: bookStatus(tagEditor.book.id, statuses),
        initialRating: bookRating(tagEditor.book.id, ratings),
        onClose: () => setTagEditor(null),
        onSave: async (nextTags: string[], nextStatus: string | null, nextRating: number) => {
          await onSetTags(tagEditor.book, nextTags)
          if (nextStatus !== bookStatus(tagEditor.book.id, statuses)) {
            await onSetStatus(tagEditor.book, nextStatus)
          }
          if (nextRating !== bookRating(tagEditor.book.id, ratings)) {
            await onSetRating(tagEditor.book, nextRating)
          }
          setTagEditor(null)
        },
      })
      : null,
    duplicateOpen
      ? h(DuplicateDialog, {
        t,
        books,
        onDelete: onDeleteDuplicate,
        onClose: () => setDuplicateOpen(false),
      })
      : null)
}
