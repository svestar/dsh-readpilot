import { React } from '../../runtime.ts'
import { readerShortcut } from './shortcuts.ts'
import { hostShortcutActions, setReaderShortcutBridge } from './shortcut-bridge.ts'
import type { ReaderView } from './use-reader-view.ts'
import type { ReaderPreferences } from './use-reader-preferences.ts'
import type { Screen, Selection } from '../../lib/types.ts'
import type { StateSetter } from '../../runtime.ts'

interface ReaderShortcutsOptions {
  screen: Screen
  prefs: ReaderPreferences
  view: ReaderView
  selection: Selection | null
  setSelection: StateSetter<Selection | null>
  searchOpen: boolean
  setSearchOpen: (value: boolean) => void
  toggleSearch: () => void
  addBookmark: () => Promise<void>
}

/** Page shortcuts plus the Host command bridge (search / bookmark). */
export function useReaderShortcuts({
  screen,
  prefs,
  view,
  selection,
  setSelection,
  searchOpen,
  setSearchOpen,
  toggleSearch,
  addBookmark,
}: ReaderShortcutsOptions): void {
  React.useEffect(() => {
    if (screen.kind !== 'book') {
      setReaderShortcutBridge(null)
      return
    }
    setReaderShortcutBridge({
      search: () => toggleSearch(),
      bookmark: () => { void addBookmark() },
    })
    return () => setReaderShortcutBridge(null)
  }, [addBookmark, screen.kind, toggleSearch])

  React.useEffect(() => {
    if (screen.kind !== 'book') return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented) return
      const target = event.target as HTMLElement | null
      const action = readerShortcut({
        key: event.key,
        ctrlKey: event.ctrlKey,
        metaKey: event.metaKey,
        altKey: event.altKey,
        isComposing: event.isComposing,
        targetTag: target?.tagName,
        contentEditable: target?.isContentEditable,
      }, {
        searchOpen,
        hasSelection: Boolean(selection),
        paged: prefs.effectiveMode === 'paged',
      })
      if (!action) return
      if (prefs.scanOnly && (action === 'search' || action === 'bookmark')) return
      if (action === 'bookmark' && hostShortcutActions.has('bookmark')) return
      if (action === 'search' && hostShortcutActions.has('search') && (event.ctrlKey || event.metaKey)) return
      event.preventDefault()
      if (action === 'next' || action === 'prev') {
        const delta = action === 'next' ? 1 : -1
        if (view.visual?.kind === 'pdf') view.stepPdfPage(delta)
        else if (view.visual?.kind === 'epub') view.goEpubPage(delta)
        else view.textPager.goPage(delta)
        return
      }
      if (action === 'search') toggleSearch()
      else if (action === 'close-search') setSearchOpen(false)
      else if (action === 'clear-selection') setSelection(null)
      else if (action === 'bookmark') void addBookmark()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [addBookmark, prefs.effectiveMode, prefs.scanOnly, screen.kind, searchOpen, selection, setSearchOpen, setSelection, toggleSearch, view])
}
