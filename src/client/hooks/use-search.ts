import { React } from '../runtime.ts'
import { messageOf } from '../helpers.ts'
import type { CallRpc, Screen, SearchMatch, SearchResults, SelectChapter, TextFn } from '../types.ts'

interface SearchOptions {
  call: CallRpc
  screen: Screen
  t: TextFn
  selectChapter: SelectChapter
}

export function useSearch({ call, screen, t, selectChapter }: SearchOptions) {
  const [searchOpen, setSearchOpen] = React.useState(false)
  const [searchQuery, setSearchQuery] = React.useState('')
  const [searchBusy, setSearchBusy] = React.useState(false)
  const [searchResults, setSearchResults] = React.useState<SearchResults | null>(null)
  const [searchError, setSearchError] = React.useState('')
  const searchInputRef = React.useRef<HTMLInputElement | null>(null)

  const openSearchMatch = React.useCallback((match: SearchMatch) => {
    if (!match || screen.kind !== 'book') return
    setSearchOpen(false)
    void selectChapter(screen.detail.book.id, match.chapterId, { offset: match.offset })
  }, [screen, selectChapter])

  const runSearch = React.useCallback(async () => {
    if (screen.kind !== 'book' || searchBusy) return
    const query = searchQuery.trim()
    if (!query) return
    setSearchBusy(true)
    setSearchError('')
    setSearchResults(null)
    try {
      const value = await call('search', {
        bookId: screen.detail.book.id,
        query,
        limit: 30,
      })
      setSearchResults({
        matches: value.matches,
        truncated: value.truncated,
        booksScanned: value.booksScanned,
        booksTotal: value.booksTotal,
        unreadable: value.unreadable,
      })
    } catch (cause) {
      setSearchResults({ matches: [], truncated: false, booksScanned: 0, booksTotal: 0, unreadable: false })
      setSearchError(`${t('searchFailed')}：${messageOf(cause)}`)
    } finally {
      setSearchBusy(false)
    }
  }, [call, screen, searchBusy, searchQuery, t])

  const toggleSearch = React.useCallback(() => {
    setSearchOpen(previous => !previous)
    setSearchError('')
  }, [])

  const resetSearch = React.useCallback(() => {
    setSearchOpen(false)
    setSearchQuery('')
    setSearchBusy(false)
    setSearchResults(null)
    setSearchError('')
  }, [])

  React.useEffect(() => {
    if (!searchOpen) return
    const frame = requestAnimationFrame(() => searchInputRef.current?.focus())
    return () => cancelAnimationFrame(frame)
  }, [searchOpen])

  return {
    searchOpen,
    setSearchOpen,
    searchQuery,
    setSearchQuery,
    searchBusy,
    searchResults,
    searchError,
    searchInputRef,
    openSearchMatch,
    runSearch,
    toggleSearch,
    resetSearch,
  }
}
