import { React } from '../../runtime.ts'
import { messageOf, noteLayoutKey } from '../../lib/helpers.ts'
import { workspaceLanguageFromRuntime } from '../../lib/workspace-language.ts'
import { useReaderState } from './use-reader-state.ts'
import { useReaderPreferences } from './use-reader-preferences.ts'
import { useReaderCompanion } from './use-reader-companion.ts'
import { useReaderTranslation } from '../translation/use-reader-translation.ts'
import { useReaderView } from './use-reader-view.ts'
import { useReaderSync } from './use-reader-sync.ts'
import { useReaderNotes } from './use-reader-notes.ts'
import { useReaderAgent } from './use-reader-agent.ts'
import { useReaderFind } from './use-reader-find.ts'
import { useReaderComposer } from './use-reader-composer.ts'
import { useReaderShortcuts } from './use-reader-shortcuts.ts'
import { setMainReaderNavigation } from './navigation-bridge.ts'
import type { CallRpc, Selection, TextFn } from '../../lib/types.ts'

interface ReaderPanelOptions {
  call: CallRpc
  t: TextFn
  runtime: any
  SessionProvider?: any
  renderSlot?: any
  useResource?: any
}

/** Everything the reader panel view renders, wired once per mount. */
export function useReaderPanel({ call, t, runtime, SessionProvider, renderSlot, useResource }: ReaderPanelOptions) {
  const state = useReaderState({ call, t })
  const { setBusy, setError, setSnapshot, setScreen } = state
  const prefs = useReaderPreferences({ screen: state.screen, t })
  const [selection, setSelection] = React.useState<Selection | null>(null)
  const [helpOpen, setHelpOpen] = React.useState(false)
  const [historyOpen, setHistoryOpen] = React.useState(false)

  const companion = useReaderCompanion({
    runtime,
    call,
    t,
    screen: state.screen,
    snapshot: state.snapshot,
    hasProvider: Boolean(SessionProvider),
    hasRenderSlot: Boolean(renderSlot),
    setError: state.setError,
    rememberSession: state.rememberSession,
    forgetSession: state.forgetSession,
  })

  const translation = useReaderTranslation({
    call,
    t,
    screen: state.screen,
    selection,
    activeSessionId: companion.activeSessionId,
  })

  const view = useReaderView({    call,
    t,
    runtime,
    screen: state.screen,
    setScreen: state.setScreen,
    setBusy: state.setBusy,
    setError: state.setError,
    refresh: state.refresh,
    prefs,
    selection,
    setSelection,
    setChatOpen: companion.setChatOpen,
    setChatError: companion.setChatError,
    activeSessionId: companion.activeSessionId,
    progressPaused: translation.pending,
  })

  useReaderSync({
    runtime,
    call,
    screen: state.screen,
    selectChapter: view.selectChapter,
    setReadingAnchor: view.setReadingAnchor,
    anchorTokenRef: view.anchorTokenRef,
    progressSkipRef: view.progressSkipRef,
  })

  const translationRevision = React.useMemo(
    () => Object.values(translation.blocks)
      .map(block => `${block.text.length}:${block.loading ? 1 : 0}`)
      .join('|'),
    [translation.blocks],
  )
  const notesLayoutKey = noteLayoutKey(
    view.textPager.page,
    view.textPager.layoutReady,
    `${translation.enabled ? 1 : 0}:${translationRevision}`,
  )
  const notes = useReaderNotes({
    call,
    t,
    screen: state.screen,
    prefs,
    view,
    selection,
    setSelection,
    chatOpen: companion.chatOpen,
    chatTab: companion.chatTab,
    messages: companion.messages,
    nativeMode: companion.nativeMode,
    eventSeq: companion.eventSeq,
    noteLayoutKey: notesLayoutKey,
  })

  const receipts = useReaderAgent({
    call,
    screen: state.screen,
    view,
    loadNotes: notes.notes.loadNotes,
    refresh: state.refresh,
    openOtherBook: view.openOtherBook,
  })

  const find = useReaderFind({
    call,
    t,
    screen: state.screen,
    view,
    selection,
    setSelection,
    setChatError: companion.setChatError,
    setChatOpen: companion.setChatOpen,
    openOtherBook: view.openOtherBook,
  })

  const composer = useReaderComposer({
    call,
    t,
    screen: state.screen,
    activeBookId: companion.activeBookId,
    snapshot: state.snapshot,
    setSnapshot: state.setSnapshot,
    setError: state.setError,
    selection,
    setSelection,
    annotations: notes.notes.annotations,
    chat: {
      setDraft: companion.setDraft,
      setChatOpen: companion.setChatOpen,
      setChatTab: companion.setChatTab,
      setChatError: companion.setChatError,
      chatInputRef: companion.chatInputRef,
    },
    nativeInputRef: companion.nativeInputRef,
    epubFrameRef: view.epubFrameRef,
  })

  useReaderShortcuts({
    screen: state.screen,
    prefs,
    view,
    selection,
    setSelection,
    searchOpen: find.searchOpen,
    setSearchOpen: find.setSearchOpen,
    toggleSearch: find.toggleSearch,
    addBookmark: notes.notes.addBookmark,
  })

  React.useEffect(() => {
    if (state.screen.kind !== 'book') {
      setMainReaderNavigation(null)
      return
    }
    const bookId = state.screen.detail.book.id
    setMainReaderNavigation({
      bookId,
      jump: target => {
        void view.selectChapter(bookId, target.chapterId, { offset: target.offset, flash: true })
      },
    })
    return () => {
      setMainReaderNavigation(null)
    }
  }, [state.screen, view.selectChapter])

  const configure = React.useCallback(async (path: string) => {
    setBusy(true)
    setError('')
    try {
      const value = await call('configure', { path, locale: workspaceLanguageFromRuntime(runtime) })
      setSnapshot(value)
      setScreen({ kind: 'library' })
    } catch (cause) {
      setError(`${t('configureFailed')}${t('errorSeparator')}${messageOf(cause, t)}`)
    } finally {
      setBusy(false)
    }
  }, [call, runtime, setBusy, setError, setScreen, setSnapshot, t])

  const pickDirectory = React.useCallback(async (setPath: (value: string) => void) => {
    try {
      const directory = await runtime.uiWorkspace.pickDirectory()
      if (directory) setPath(directory)
    } catch (cause) {
      setError(messageOf(cause, t))
    }
  }, [runtime, setError])

  const openSetup = React.useCallback(() => setScreen({ kind: 'setup' }), [setScreen])

  const headerTitle = state.screen.kind === 'book'
    ? state.screen.detail.book.title
    : state.screen.kind === 'unsupported'
      ? state.screen.book.title
      : state.screen.kind === 'setup'
        ? t('setupTitle')
        : state.snapshot?.settings.libraryDir ? t('library') : t('setupTitle')
  const headerSubtitle = state.screen.kind === 'book'
    ? state.screen.content.title
    : state.snapshot?.settings.libraryDir ?? ''

  return {
    ...state,
    prefs,
    selection,
    setSelection,
    companion,
    translation,
    view,
    notes: notes.notes,
    longNotes: notes.longNotes,
    memory: notes.memory,
    role: notes.role,
    receipts,
    find,
    composer,
    helpOpen,
    setHelpOpen,
    historyOpen,
    setHistoryOpen,
    configure,
    pickDirectory,
    openSetup,
    headerTitle,
    headerSubtitle,
    SessionProvider,
    renderSlot,
    useResource,
  }
}

export type ReaderPanelModel = ReturnType<typeof useReaderPanel>
