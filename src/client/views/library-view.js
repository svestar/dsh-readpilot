import { React, h } from '../runtime.js'
import { formatSize } from '../helpers.js'
import {
  bookTags,
  categoryCounts,
  filterBooks,
  recentBooks,
  tagCatalogue,
} from '../library-utils.js'

const FORMATS = ['txt', 'md', 'epub', 'pdf']

function formatDate(value) {
  if (!Number.isFinite(value)) return ''
  try {
    return new Date(value).toLocaleDateString()
  } catch {
    return ''
  }
}

function TagDialog({ t, book, initialTags, allTags, onClose, onSave }) {
  const [draft, setDraft] = React.useState('')
  const [tags, setTags] = React.useState(() => initialTags.slice())
  const [saving, setSaving] = React.useState(false)
  const [error, setError] = React.useState('')
  const inputRef = React.useRef(null)

  React.useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const add = value => {
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
      await onSave(tags)
      onClose()
    } catch (cause) {
      setError(cause.message ?? String(cause))
    } finally {
      setSaving(false)
    }
  }

  return h('div', {
    className: 'dsh-reader-note-overlay',
    onMouseDown: event => {
      if (event.target === event.currentTarget) onClose()
    },
  },
  h('div', {
    className: 'dsh-reader-note-dialog dsh-reader-tag-dialog',
    role: 'dialog',
    'aria-modal': 'true',
    'aria-label': t('editTags'),
  },
  h('h3', null, t('editTags')),
  h('div', { className: 'dsh-reader-tag-book' }, book.title),
  h('div', { className: 'dsh-reader-tag-list' },
    tags.length === 0
      ? h('span', { className: 'dsh-reader-muted' }, t('noTags'))
      : tags.map(tag => h('span', { key: tag, className: 'dsh-reader-tag-chip' },
        tag,
        h('button', {
          type: 'button',
          className: 'dsh-reader-tag-remove',
          'aria-label': `${t('removeTag')} ${tag}`,
          onClick: () => setTags(previous => previous.filter(item => item !== tag)),
        }, '×')))),
  h('div', { className: 'dsh-reader-tag-input-row' },
    h('input', {
      ref: inputRef,
      value: draft,
      placeholder: t('tagPlaceholder'),
      spellCheck: false,
      onChange: event => setDraft(event.target.value),
      onKeyDown: event => {
        if (event.key === 'Enter' && !event.nativeEvent.isComposing) {
          event.preventDefault()
          add(draft)
        }
      },
    }),
    h('button', {
      type: 'button',
      className: 'dsh-reader-secondary',
      disabled: !draft.trim() || tags.length >= 20,
      onClick: () => add(draft),
    }, t('addTag'))),
  allTags.length > 0
    ? h('div', { className: 'dsh-reader-tag-suggestions' },
      allTags
        .filter(tag => !tags.includes(tag))
        .slice(0, 12)
        .map(tag => h('button', {
          key: tag,
          type: 'button',
          className: 'dsh-reader-tag-suggestion',
          onClick: () => add(tag),
        }, `+ ${tag}`)))
    : null,
  error ? h('div', { className: 'dsh-reader-note-dialog-error' }, error) : null,
  h('div', { className: 'dsh-reader-note-dialog-actions' },
    h('button', {
      type: 'button',
      className: 'dsh-reader-secondary',
      disabled: saving,
      onClick: onClose,
    }, t('cancel')),
    h('button', {
      type: 'button',
      className: 'dsh-reader-primary',
      disabled: saving,
      onClick: () => void save(),
    }, saving ? t('loading') : t('save')))))
}

function BookCard({ t, book, tags, onOpen, onEditTags }) {
  return h('div', {
    className: 'dsh-reader-book-card',
    'data-format': book.format,
  },
  h('button', {
    type: 'button',
    className: 'dsh-reader-book-open',
    onClick: () => onOpen(book),
  },
  h('div', { className: 'dsh-reader-book-cover' },
    h('span', { className: 'dsh-reader-book-format' }, book.format.toUpperCase()),
    h('span', { className: 'dsh-reader-book-cover-title' }, book.title)),
  h('div', { className: 'dsh-reader-book-info' },
    h('div', { className: 'dsh-reader-book-title' }, book.title),
    h('div', { className: 'dsh-reader-book-meta' },
      h('span', null, formatSize(book.size)),
      h('span', null, book.progress ? book.progress.chapterTitle || t('reading') : t('unread'))),
    tags.length > 0
      ? h('div', { className: 'dsh-reader-book-tags' },
        tags.slice(0, 3).map(tag => h('span', { key: tag, className: 'dsh-reader-book-tag' }, tag)),
        tags.length > 3 ? h('span', { className: 'dsh-reader-book-tag' }, `+${tags.length - 3}`) : null)
      : null)),
  h('button', {
    type: 'button',
    className: 'dsh-reader-book-tag-edit',
    title: t('editTags'),
    onClick: () => onEditTags(book),
  }, t('tags')))
}

function RecentCard({ t, book, tags, onOpen }) {
  return h('button', {
    type: 'button',
    className: 'dsh-reader-recent-card',
    onClick: () => onOpen(book),
  },
  h('div', { className: 'dsh-reader-recent-cover', 'data-format': book.format },
    h('span', null, book.format.toUpperCase())),
  h('div', { className: 'dsh-reader-recent-info' },
    h('div', { className: 'dsh-reader-recent-title' }, book.title),
    h('div', { className: 'dsh-reader-recent-meta' },
      book.progress?.chapterTitle || t('reading'),
      ' · ',
      formatDate(book.progress?.updatedAt)),
    tags.length > 0
      ? h('div', { className: 'dsh-reader-recent-tags' },
        tags.slice(0, 2).map(tag => h('span', { key: tag }, tag)))
      : null))
}

export function Library({ t, snapshot, busy, onOpen, onRefresh, onSettings, onSetTags }) {
  const books = snapshot.books
  const tags = snapshot.tags ?? {}
  const [category, setCategory] = React.useState('all')
  const [query, setQuery] = React.useState('')
  const [sort, setSort] = React.useState('recent')
  const [tagEditor, setTagEditor] = React.useState(null)
  const counts = React.useMemo(() => categoryCounts(books, tags), [books, tags])
  const tagStats = React.useMemo(() => tagCatalogue(books, tags), [books, tags])
  const recent = React.useMemo(() => recentBooks(books, 10), [books])
  const visible = React.useMemo(
    () => filterBooks(books, tags, { category, query, sort }),
    [books, tags, category, query, sort],
  )
  const showRecent = recent.length > 0 && (category === 'all' || category === 'recent')
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
            : t('inProgress')

  const categoryButton = (key, label, count) => h('button', {
    key,
    type: 'button',
    className: 'dsh-reader-library-category',
    'data-active': category === key ? 'true' : 'false',
    onClick: () => setCategory(key),
  },
  h('span', null, label),
  typeof count === 'number' ? h('span', { className: 'dsh-reader-library-count' }, count) : null)

  return h('div', { className: 'dsh-reader-library' },
    h('aside', { className: 'dsh-reader-library-side' },
      h('div', { className: 'dsh-reader-library-side-title' }, t('categories')),
      categoryButton('all', t('allBooks'), counts.all),
      categoryButton('recent', t('recentReading'), counts.recent),
      categoryButton('reading', t('inProgress'), counts.reading),
      categoryButton('unread', t('unread'), counts.unread),
      h('div', { className: 'dsh-reader-library-side-title' }, t('formats')),
      FORMATS.map(format => categoryButton(`format:${format}`, format.toUpperCase(), counts.formats[format])),
      tagStats.length > 0
        ? h('div', { className: 'dsh-reader-library-side-title' }, t('tags'))
        : null,
      tagStats.map(({ tag, count }) => categoryButton(`tag:${tag}`, `# ${tag}`, count))),
    h('div', { className: 'dsh-reader-library-main' },
      h('div', { className: 'dsh-reader-library-head' },
        h('div', null,
          h('h2', null, `${t('library')} · ${books.length}`),
          h('div', { className: 'dsh-reader-library-subtitle' }, t('librarySubtitle'))),
        h('div', { className: 'dsh-reader-header-actions' },
          h('button', { type: 'button', className: 'dsh-reader-secondary', onClick: onSettings }, t('settings')),
          h('button', { type: 'button', className: 'dsh-reader-secondary', disabled: busy, onClick: onRefresh }, t('rescan')))),
      h('div', { className: 'dsh-reader-library-toolbar' },
        h('input', {
          className: 'dsh-reader-library-search',
          value: query,
          placeholder: t('searchLibrary'),
          spellCheck: false,
          onChange: event => setQuery(event.target.value),
        }),
        h('select', {
          className: 'dsh-reader-palette-select',
          value: sort,
          onChange: event => setSort(event.target.value),
          'aria-label': t('sortBy'),
        },
        h('option', { value: 'recent' }, t('sortRecent')),
        h('option', { value: 'title' }, t('sortTitle')),
        h('option', { value: 'size' }, t('sortSize')),
        h('option', { value: 'added' }, t('sortAdded')))),
      books.length === 0
        ? h('div', { className: 'dsh-reader-empty' },
          h('h2', null, t('empty')),
          h('p', null, t('emptyHint')))
        : h('div', { className: 'dsh-reader-library-scroll' },
          showRecent
            ? h('section', { className: 'dsh-reader-recent-section' },
              h('div', { className: 'dsh-reader-section-head' },
                h('h3', null, t('recentReading')),
                h('span', null, t('recentHint'))),
              h('div', { className: 'dsh-reader-recent-row' },
                recent.map(book => h(RecentCard, {
                  key: book.id,
                  t,
                  book,
                  tags: bookTags(book.id, tags),
                  onOpen,
                }))))
            : null,
          h('section', { className: 'dsh-reader-all-section' },
            h('div', { className: 'dsh-reader-section-head' },
              h('h3', null, categoryTitle),
              h('span', null, `${visible.length}`)),
            visible.length === 0
              ? h('div', { className: 'dsh-reader-library-empty' }, t('noMatches'))
              : h('div', { className: 'dsh-reader-grid' },
                visible.map(book => h(BookCard, {
                  key: book.id,
                  t,
                  book,
                  tags: bookTags(book.id, tags),
                  onOpen,
                  onEditTags: entry => setTagEditor({
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
        onClose: () => setTagEditor(null),
        onSave: async nextTags => {
          await onSetTags(tagEditor.book, nextTags)
          setTagEditor(null)
        },
      })
      : null)
}
