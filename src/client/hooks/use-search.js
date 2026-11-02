import { React } from '../runtime.js'
import { messageOf } from '../helpers.js'

export function useSearch({ call, screen, t, selectChapter }) {
  const [searchOpen, setSearchOpen] = React.useState(false)
  const [searchQuery, setSearchQuery] = React.useState('')
  const [searchBusy, setSearchBusy] = React.useState(false)
  const [searchResults, setSearchResults] = React.useState(null)
  const [searchError, setSearchError] = React.useState('')
  const searchInputRef = React.useRef(null)

  const openSearchMatch = React.useCallback(match => {
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
        matches: Array.isArray(value?.matches) ? value.matches : [],
        truncated: Boolean(value?.truncated),
      })
    } catch (cause) {
      setSearchResults({ matches: [], truncated: false })
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
