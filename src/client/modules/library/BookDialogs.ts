import { Modal, React, h } from '../../runtime.ts'
import type { ClientBook, TextFn } from '../../lib/types.ts'
import { statusLabel } from './BookCard.ts'

const STATUSES = ['want', 'reading', 'done'] as const
const RATINGS = [1, 2, 3, 4, 5]

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

  return h(Modal, {
    open: true,
    onClose,
    closeLabel: t('close'),
    title: t('editBook'),
    headless: true,
    className: 'dsh-readpilot-book-dialog',
  },
  h('header', { className: 'dsh-readpilot-book-dialog-head' },
    h('div', { className: 'dsh-readpilot-book-dialog-heading' },
      h('h3', null, t('editBook')),
      h('div', { className: 'dsh-readpilot-book-dialog-title', title: book.title }, book.title)),
    h('button', {
      type: 'button',
      className: 'dsh-readpilot-book-dialog-close',
      'aria-label': t('close'),
      onClick: onClose,
    }, '×')),
  h('div', { className: 'dsh-readpilot-book-dialog-body' },
    h('section', { className: 'dsh-readpilot-book-field' },
      h('div', { className: 'dsh-readpilot-book-field-label' }, t('tags')),
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
        : null),
    h('section', { className: 'dsh-readpilot-book-field' },
      h('div', { className: 'dsh-readpilot-book-field-label' }, t('readStatus')),
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
    h('section', { className: 'dsh-readpilot-book-field' },
      h('div', { className: 'dsh-readpilot-book-field-label' }, t('rating')),
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
    error ? h('div', { className: 'dsh-readpilot-note-dialog-error' }, error) : null),
  h('footer', { className: 'dsh-readpilot-book-dialog-actions' },
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
    }, saving ? t('loading') : t('save'))))
}

interface DuplicateDialogProps {
  t: TextFn
  books: ClientBook[]
  onDelete: (book: ClientBook) => Promise<void> | void
  onClose: () => void
}

function DuplicateDialog({ t, books, onDelete, onClose }: DuplicateDialogProps) {
  const [busy, setBusy] = React.useState<string | null>(null)
  const [confirmId, setConfirmId] = React.useState<string | null>(null)
  const [error, setError] = React.useState('')
  const groups = new Map<string, ClientBook[]>()
  for (const book of books) {
    if (!book.duplicateOf) continue
    const group = books.filter(candidate => candidate.contentKey === book.contentKey)
    if (group.length > 1) groups.set(book.contentKey, group)
  }

  const remove = async (book: ClientBook) => {
    if (busy) return
    if (confirmId !== book.id) {
      setConfirmId(book.id)
      setError('')
      return
    }
    setBusy(book.id)
    setError('')
    try {
      await onDelete(book)
      onClose()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause))
    } finally {
      setBusy(null)
    }
  }

  return h(Modal, {
    open: true,
    onClose,
    closeLabel: t('close'),
    title: t('duplicateTitle'),
    headless: true,
    className: 'dsh-readpilot-duplicate-dialog',
  },
  h('header', { className: 'dsh-readpilot-duplicate-dialog-head' },
    h('h3', null, t('duplicateTitle')),
    h('p', null, t('duplicateHint'))),
  h('div', { className: 'dsh-readpilot-duplicate-list' },
    [...groups.entries()].map(([contentKey, group]) => h('section', { key: contentKey, className: 'dsh-readpilot-duplicate-group' },
      h('div', { className: 'dsh-readpilot-duplicate-group-head' }, `${group.length} ${t('duplicateFiles')}`),
      group.map(book => h('div', { key: book.id, className: 'dsh-readpilot-duplicate-row' },
        h('div', { className: 'dsh-readpilot-duplicate-main' },
          h('div', { className: 'dsh-readpilot-duplicate-name' },
            h('span', null, book.title),
            h('span', { className: 'dsh-readpilot-duplicate-role' },
              book.duplicateOf ? t('duplicateBadge') : t('duplicatePrimary'))),
          h('div', { className: 'dsh-readpilot-duplicate-path' }, book.path)),
        h('button', {
          type: 'button',
          className: confirmId === book.id ? 'dsh-readpilot-primary' : 'dsh-readpilot-secondary',
          disabled: busy === book.id,
          title: t('duplicateDeleteHint'),
          onClick: () => void remove(book),
        }, confirmId === book.id ? t('duplicateConfirmDelete') : t('duplicateDelete'))))))),
  error ? h('div', { className: 'dsh-readpilot-chat-error' }, error) : null,
  h('footer', { className: 'dsh-readpilot-duplicate-footer' },
    h('button', { type: 'button', className: 'dsh-readpilot-secondary', onClick: onClose }, t('close'))))
}

export { TagDialog, DuplicateDialog }
