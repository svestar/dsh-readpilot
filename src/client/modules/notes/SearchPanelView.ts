import { Modal, React, h } from '../../runtime.ts'
import type { StateSetter } from '../../runtime.ts'
import type {
  CallRpc,
  MutableRef,
  Screen,
  SearchMatch,
  SearchResults,
  TextFn,
} from '../../lib/types.ts'

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
