import { React, h } from '../runtime.ts'
import { formatSize } from '../helpers.ts'
import {
  bookRating,
  bookStatus,
  bookTags,
  categoryCounts,
  filterBooks,
  tagCatalogue,
} from '../library-utils.ts'
import type {
  ClientBook,
  Snapshot,
  TextFn,
} from '../types.ts'

const FORMATS = ['txt', 'md', 'epub', 'pdf']
const STATUSES = ['want', 'reading', 'done'] as const
const RATINGS = [1, 2, 3, 4, 5]

function statusLabel(t: TextFn, status: string | null): string {
  if (status === 'want') return t('statusWant')
  if (status === 'reading') return t('statusReading')
  if (status === 'done') return t('statusDone')
  return ''
}

interface TagDialogProps {
  t: TextFn
  book: ClientBook
  initialTags: string[]
  allTags: string[]
  initialStatus: string | null
  initialRating: number
  onClose: () => void
  onSave: (tags: string[], status: string | null, rating: number) => Promise<void> | void
}

function TagDialog({ t, book, initialTags, allTags, initialStatus, initialRating, onClose, onSave }: TagDialogProps) {
  const [draft, setDraft] = React.useState('')
  const [tags, setTags] = React.useState<string[]>(() => initialTags.slice())
  const [status, setStatus] = React.useState<string | null>(initialStatus)
  const [rating, setRating] = React.useState(initialRating)
  const [saving, setSaving] = React.useState(false)
  const [error, setError] = React.useState('')
  const inputRef = React.useRef<HTMLInputElement | null>(null)

  React.useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const add = (value: unknown) => {
    const tag = String(value ?? '').replace(/\s+/g, ' ').trim()
    if (!tag || tags.includes(tag) || tags.length >= 20) return
    if (tag.length > 24) {
      setError(t('tagTooLong'))
      return
    }
    setTags(previous => [...previous, tag])
    setDraft('')
    setError('')
  }

  const save = async () => {
    if (saving) return
    setSaving(true)
    setError('')
    try {
      await onSave(tags, status, rating)
      onClose()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause))
    } finally {
      setSaving(false)
    }
  }

  return h('div', {
    className: 'dsh-readpilot-note-overlay',
    onMouseDown: (event: any) => {
      if (event.target === event.currentTarget) onClose()
    },
  },
  h('div', {
    className: 'dsh-readpilot-note-dialog dsh-readpilot-tag-dialog',
    role: 'dialog',
    'aria-modal': 'true',
    'aria-label': t('editBook'),
  },
  h('h3', null, t('editBook')),
  h('div', { className: 'dsh-readpilot-tag-book' }, book.title),
  h('div', { className: 'dsh-readpilot-tag-list' },
    tags.length === 0
      ? h('span', { className: 'dsh-readpilot-muted' }, t('noTags'))
      : tags.map(tag => h('span', { key: tag, className: 'dsh-readpilot-tag-chip' },
        tag,
        h('button', {
          type: 'button',
          className: 'dsh-readpilot-tag-remove',
          'aria-label': `${t('removeTag')} ${tag}`,
          onClick: () => setTags(previous => previous.filter(item => item !== tag)),
        }, '×')))),
  h('div', { className: 'dsh-readpilot-tag-input-row' },
    h('input', {
      ref: inputRef,
      value: draft,
      placeholder: t('tagPlaceholder'),
      spellCheck: false,
      onChange: (event: any) => setDraft(event.target.value),
      onKeyDown: (event: any) => {
        if (event.key === 'Enter' && !event.nativeEvent.isComposing) {
          event.preventDefault()
          add(draft)
        }
      },
    }),
    h('button', {
      type: 'button',
      className: 'dsh-readpilot-secondary',
      disabled: !draft.trim() || tags.length >= 20,
      onClick: () => add(draft),
    }, t('addTag'))),
  allTags.length > 0
    ? h('div', { className: 'dsh-readpilot-tag-suggestions' },
      allTags
        .filter(tag => !tags.includes(tag))
        .slice(0, 12)
        .map(tag => h('button', {
          key: tag,
          type: 'button',
          className: 'dsh-readpilot-tag-suggestion',
          onClick: () => add(tag),
        }, `+ ${tag}`)))
    : null,
  h('div', { className: 'dsh-readpilot-meta-field' },
    h('span', { className: 'dsh-readpilot-meta-label' }, t('readStatus')),
    h('div', { className: 'dsh-readpilot-meta-options' },
      h('button', {
        type: 'button',
        className: 'dsh-readpilot-status-option',
        'data-active': status === null ? 'true' : 'false',
        onClick: () => setStatus(null),
      }, t('statusNone')),
      STATUSES.map(value => h('button', {
        key: value,
        type: 'button',
        className: 'dsh-readpilot-status-option',
        'data-active': status === value ? 'true' : 'false',
        onClick: () => setStatus(value),
      }, statusLabel(t, value))))),
  h('div', { className: 'dsh-readpilot-meta-field' },
    h('span', { className: 'dsh-readpilot-meta-label' }, t('rating')),
    h('div', { className: 'dsh-readpilot-meta-options' },
      RATINGS.map(value => h('button', {
        key: value,
        type: 'button',
        className: 'dsh-readpilot-rating-star',
        'data-active': rating >= value ? 'true' : 'false',
        'aria-label': `${value}`,
        onClick: () => setRating(previous => (previous === value ? 0 : value)),
      }, '★')),
      rating > 0
        ? h('button', {
          type: 'button',
          className: 'dsh-readpilot-secondary dsh-readpilot-rating-clear',
          onClick: () => setRating(0),
        }, t('clear'))
        : null)),
  error ? h('div', { className: 'dsh-readpilot-note-dialog-error' }, error) : null,
  h('div', { className: 'dsh-readpilot-note-dialog-actions' },
    h('button', {
      type: 'button',
      className: 'dsh-readpilot-secondary',
      disabled: saving,
      onClick: onClose,
    }, t('cancel')),
    h('button', {
      type: 'button',
      className: 'dsh-readpilot-primary',
      disabled: saving,
      onClick: () => void save(),
    }, saving ? t('loading') : t('save')))))
}

interface BookCardProps {
  t: TextFn
  book: ClientBook
  tags: string[]
  status: string | null
  rating: number
  onOpen: (book: ClientBook) => void
  onEditTags: (book: ClientBook) => void
}

function BookCard({ t, book, tags, status, rating, onOpen, onEditTags }: BookCardProps) {
  const label = statusLabel(t, status)
  const [coverFailed, setCoverFailed] = React.useState(false)
  return h('div', {
    className: 'dsh-readpilot-book-card',
    'data-format': book.format,
  },
  h('button', {
    type: 'button',
    className: 'dsh-readpilot-book-open',
    onClick: () => onOpen(book),
  },
  h('div', { className: 'dsh-readpilot-book-cover' },
    coverFailed
      ? null
      : h('img', {
        className: 'dsh-readpilot-book-cover-img',
        src: `/api/dsh-readpilot/cover?bookId=${encodeURIComponent(book.id)}`,
        alt: '',
        loading: 'lazy',
        onError: () => setCoverFailed(true),
      }),
    h('span', { className: 'dsh-readpilot-book-format' }, book.format.toUpperCase()),
    h('span', { className: 'dsh-readpilot-book-cover-title' }, book.title)),
  h('div', { className: 'dsh-readpilot-book-info' },
    h('div', { className: 'dsh-readpilot-book-title' }, book.title),
    h('div', { className: 'dsh-readpilot-book-meta' },
      h('span', null, formatSize(book.size)),
      h('span', null, book.progress ? book.progress.chapterTitle || t('reading') : t('unread')),
      label ? h('span', { className: 'dsh-readpilot-book-status', 'data-status': status ?? '' }, label) : null,
      rating > 0 ? h('span', { className: 'dsh-readpilot-book-rating', title: `${rating}/5` }, '★'.repeat(rating)) : null),
    tags.length > 0
      ? h('div', { className: 'dsh-readpilot-book-tags' },
        tags.slice(0, 3).map(tag => h('span', { key: tag, className: 'dsh-readpilot-book-tag' }, tag)),
        tags.length > 3 ? h('span', { className: 'dsh-readpilot-book-tag' }, `+${tags.length - 3}`) : null)
      : null)),
  h('button', {
    type: 'button',
    className: 'dsh-readpilot-book-tag-edit',
    title: t('editTags'),
    onClick: () => onEditTags(book),
  }, t('tags')))
}

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
}

export function Library({ t, snapshot, busy, onOpen, onRefresh, onSettings, onSetTags, onSetStatus, onSetRating }: LibraryProps) {
  const books = snapshot.books
  const tags = snapshot.tags ?? {}
  const statuses = snapshot.status ?? {}
  const ratings = snapshot.rating ?? {}
  const [category, setCategory] = React.useState('all')
  const [query, setQuery] = React.useState('')
  const [sort, setSort] = React.useState('recent')
  const [tagEditor, setTagEditor] = React.useState<{ book: ClientBook; initialTags: string[] } | null>(null)
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
        h('option', { value: 'added' }, t('sortAdded')))),
      books.length === 0
        ? h('div', { className: 'dsh-readpilot-empty' },
          h('h2', null, t('empty')),
          h('p', null, t('emptyHint')))
        : h('div', { className: 'dsh-readpilot-library-scroll' },
          h('section', { className: 'dsh-readpilot-all-section' },
            h('div', { className: 'dsh-readpilot-section-head' },
              h('h3', null, categoryTitle),
              h('span', null, `${visible.length}`)),
            visible.length === 0
              ? h('div', { className: 'dsh-readpilot-library-empty' }, t('noMatches'))
              : h('div', { className: 'dsh-readpilot-grid' },
                visible.map(book => h(BookCard, {
                  key: book.id,
                  t,
                  book,
                  tags: bookTags(book.id, tags),
                  status: bookStatus(book.id, statuses),
                  rating: bookRating(book.id, ratings),
                  onOpen,
                  onEditTags: (entry: ClientBook) => setTagEditor({
                    book: entry,
                    initialTags: bookTags(entry.id, tags),
                  }),
                })))))),
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
      : null)
}
