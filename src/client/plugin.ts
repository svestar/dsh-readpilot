import {
  CHAT_WIDTH_MAX,
  CHAT_WIDTH_MIN,
  READER_PALETTE_IDS,
  READER_PALETTES,
  blockIndexAtOffset,
  clampChatWidth,
  diffLines,
  findNoteOccurrence,
  foldTranscript,
  messageOf,
  parseMarkdownBlocks,
  readPageLayout,
  readPaletteId,
  readGlassBlur,
  saveGlassBlur,
  normalizeGlassBlur,
  DEFAULT_GLASS_BLUR,
  readReflowBooks,
  reflowEnabledFor,
  readReadingMode,
  readFontSize,
  normalizeFontSize,
  resolveReaderPalette,
  savePageLayout,
  savePaletteId,
  saveReadingMode,
  saveReflowBooks,
  saveFontSize,
} from './helpers.ts'

import { zh, en } from './locale.ts'
import { CSS } from './styles.ts'
import { React, h, bindRuntime } from './runtime.ts'
import { Toc } from './views/toc.ts'
import { renderBlocks, selectionAnchor } from './views/markdown.ts'
import { PanelIcon, Setup } from './views/panels.ts'
import { Library } from './views/library-view.ts'
import { NotesBody, SearchPanel } from './views/notes-search.ts'
import { LongNotes } from './views/long-notes.ts'
import { DraftNotice } from './views/draft-notice.ts'
import { MemoryPanel } from './views/memory-panel.ts'
import { VisualReader } from './views/visual-reader.ts'
import { ChatPanel } from './views/chat-panel.ts'
import { Header } from './views/header.ts'
import { ReaderSettings } from './reader-settings.ts'
import { SidebarReader } from './views/sidebar-reader.ts'
import { companionSessionTitle, renameCompanionSession, syncCompanionSessionTitles } from './session-title.ts'
import { PROGRESS_SYNC_EVENT, readProgressSync } from './progress-sync.ts'
import { NoteDialog, SelectionToolbar, quoteDraft } from './views/selection-note.ts'
import { PromptPresetManager } from './views/prompt-preset-manager.ts'
import { renderPrompt } from '../prompt-render.ts'
import type { PromptPreset } from '../prompt-presets.ts'
import type { ReaderAction } from '../reader-actions.ts'
import { createReaderErrorBoundary } from './views/error-boundary.ts'
import { ReaderBar } from './views/reader-bar.ts'
import { companionMode, useCompanion } from './hooks/use-companion.ts'
import { ChatBody, ChatCompose } from './views/chat-content.ts'
import { NativeCompanion, createNativeChatBoundary } from './views/native-companion.ts'
import { ReaderBooksToolView, ReaderOpenToolView, ReaderSearchToolView } from './views/reader-tool-view.ts'
import { useSearch } from './hooks/use-search.ts'
import { useChatJump } from './hooks/use-chat-jump.ts'
import { useReaderActions } from './hooks/use-reader-actions.ts'
import { useNotes } from './hooks/use-notes.ts'
import { currentReaderScreen, rememberReaderScreen, visualForChapter, visualForItem } from './reader-screen.ts'
import { READER_SHORTCUT_DEFAULTS, readerShortcut } from './shortcuts.ts'
import { parseNoteResource } from './note-resource.ts'
import { buildReaderResource, parseReaderResource } from './reader-resource.ts'
import { parseReaderJumpUrl } from '../jump-url.ts'
import type { ReaderJumpTarget } from '../jump-url.ts'
import { useLongNotes } from './hooks/use-long-notes.ts'
import { useMemory } from './hooks/use-memory.ts'
import { useTextPager } from './hooks/use-text-pager.ts'
import { usePageWidth } from './hooks/use-page-width.ts'
import { useVisual } from './hooks/use-visual.ts'
import { useSelectionDismiss } from './hooks/use-selection-dismiss.ts'
import { chapterPercent, columnsFor, pageSpanWidth, pdfPagePercent } from './paging.ts'
import type { PageLayout, ReadingAnchor, ReaderMode } from './paging.ts'
import { readerCapabilities } from './paging.ts'
import type {
  ClientBook,
  PendingScroll,
  Screen,
  Selection,
  Snapshot,
  TextFn,
  TocItem,
} from './types.ts'
import type { CallRpc } from '../rpc.ts'

export function createPlugin(require: (name: string) => any) {
    bindRuntime(require)
    const ReaderErrorBoundary = createReaderErrorBoundary()
    const NativeChatBoundary = createNativeChatBoundary()
    const NS = 'dshReader'
    const hostShortcutActions = new Set<'search' | 'bookmark'>()
    let readerShortcutBridge: { search: () => void; bookmark: () => void } | null = null
    let mainReaderNavigation: {
      bookId: string
      jump: (target: { bookId: string; chapterId: string; offset?: number }) => void
    } | null = null


    const style = document.createElement('style')
    style.dataset.plugin = 'dsh-readpilot'
    style.dataset.pluginCss = 'dsh-readpilot/reader.css'
    style.textContent = CSS
    document.head.appendChild(style)

    let runtime: any
    let boundText: TextFn = key => key

    const call = (async (operation: string, payload?: unknown): Promise<any> => {
      const dot = operation.indexOf('.')
      const endpoint = dot >= 0 ? operation.slice(0, dot) : operation
      const body = dot >= 0
        ? { ...(payload as Record<string, unknown> | undefined ?? {}), action: operation.slice(dot + 1) }
        : payload ?? null
      if (!runtime || !runtime.connection) throw new Error('连接服务不可用')
      let response: Response
      try {
        response = await fetch('/api/dsh-readpilot', {
          method: 'POST',
          credentials: 'same-origin',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ endpoint, payload: body }),
        })
      } catch (error) {
        throw new Error(`无法连接阅读器服务：${messageOf(error)}`)
      }
      let result: { ok?: boolean; value?: unknown; error?: { code?: string; message?: string } }
      try {
        result = await response.json()
      } catch {
        throw new Error(`阅读器服务返回了无效响应（HTTP ${response.status}）`)
      }
      if (!result || result.ok !== true) {
        const error = new Error(result?.error?.message ?? `请求失败（HTTP ${response.status}）`) as Error & { code?: string }
        error.code = result?.error?.code
        throw error
      }
      return result.value
    }) as CallRpc



    function ReaderPanel(props: { t?: TextFn; SessionProvider?: any; renderSlot?: any; useResource?: any }) {
      const t: TextFn = props.t ?? boundText
      const [snapshot, setSnapshot] = React.useState<Snapshot | null>(null)
      const [screenState, setScreenState] = React.useState<Screen>(currentReaderScreen)
      const setScreen = React.useCallback((next: Screen | ((previous: Screen) => Screen)) => {
        if (typeof next === 'function') {
          setScreenState(previous => {
            const value = next(previous)
            rememberReaderScreen(value)
            return value
          })
          return
        }
        rememberReaderScreen(next)
        setScreenState(next)
      }, [])
      const screen = screenState
      const titledSessionsRef = React.useRef(new Set<string>())
      const panelWasActiveRef = React.useRef(false)

      React.useEffect(() => {
        if (!snapshot) return
        const bookById = new Map(snapshot.books.map(book => [book.id, book]))
        for (const [bookId, entry] of Object.entries(snapshot.sessions ?? {})) {
          if (!entry?.sessionId) continue
          const book = bookById.get(bookId)
          if (!book) continue
          const title = companionSessionTitle(book.title)
          const key = `${entry.sessionId}\u0000${title}`
          if (titledSessionsRef.current.has(key)) continue
          titledSessionsRef.current.add(key)
          void renameCompanionSession(runtime, entry.sessionId, title).catch(() => {
            titledSessionsRef.current.delete(key)
          })
        }
      }, [snapshot])
      const [readingMode, setReadingMode] = React.useState<ReaderMode>(readReadingMode)
      const [reflowBooks, setReflowBooks] = React.useState<Record<string, boolean>>(readReflowBooks)
      const [pageLayout, setPageLayout] = React.useState<PageLayout>(readPageLayout)
      const [error, setError] = React.useState('')
      const [reflowWarning, setReflowWarning] = React.useState('')
      const [busy, setBusy] = React.useState(false)
      const [tocOpen, setTocOpen] = React.useState(true)
      const [fontSize, setFontSize] = React.useState(readFontSize)
      const [settingsOpen, setSettingsOpen] = React.useState(false)
      const [openingWorkspace, setOpeningWorkspace] = React.useState(false)
      const [readingAnchor, setReadingAnchor] = React.useState<ReadingAnchor | null>(null)
      const anchorTokenRef = React.useRef(0)
      const progressSkipRef = React.useRef(false)
      const scrollAnchorAppliedRef = React.useRef(0)
      const [selection, setSelection] = React.useState<Selection | null>(null)
      const [promptPresets, setPromptPresets] = React.useState<PromptPreset[]>([])
      const [presetManagerOpen, setPresetManagerOpen] = React.useState(false)
      const [presetError, setPresetError] = React.useState('')
      const [paletteId, setPaletteId] = React.useState<string>(readPaletteId)
      const [glassBlur, setGlassBlur] = React.useState<number>(readGlassBlur)
      const palette = resolveReaderPalette(paletteId)

      const refreshPromptPresets = React.useCallback(async () => {
        try {
          const value = await call('prompts', { action: 'list' })
          setPromptPresets(Array.isArray(value.presets) ? value.presets : [])
          setPresetError('')
        } catch (cause) {
          setPresetError(`${t('presetSaveFailed')}：${messageOf(cause)}`)
        }
      }, [call, t])

      React.useEffect(() => {
        void refreshPromptPresets()
      }, [refreshPromptPresets])
      const format = screen.kind === 'book' ? screen.detail.book.format : null
      const bookId = screen.kind === 'book' ? screen.detail.book.id : null
      const reflowMode = bookId && format ? reflowEnabledFor(reflowBooks, bookId, format) : false
      const reflowModeRef = React.useRef(reflowMode)
      reflowModeRef.current = reflowMode
      const capabilities = readerCapabilities(format ?? 'txt', reflowMode)
      const isTextFormat = format === 'txt' || format === 'md'
        || (format === 'pdf' && reflowMode)
        || (format === 'epub' && reflowMode)
      const textLayout: PageLayout = format === 'pdf' && reflowMode ? 'single' : pageLayout
      const effectiveMode: ReaderMode = format === 'pdf' ? 'paged' : readingMode
      const contentRef = React.useRef<HTMLDivElement | null>(null)
      const pendingScrollRef = React.useRef<PendingScroll | null>(null)

      const refresh = React.useCallback(async () => {
        setBusy(true)
        setError('')
        try {
          const value = await call('state')
          setSnapshot(value)
        } catch (cause) {
          setError(`${t('loadFailed')}：${messageOf(cause)}`)
        } finally {
          setBusy(false)
        }
      }, [t])

      React.useEffect(() => {
        saveGlassBlur(glassBlur)
      }, [glassBlur])

      const changePalette = React.useCallback((id: string) => {
        if (!READER_PALETTES[id]) return
        setPaletteId(id)
        savePaletteId(id)
      }, [])

      React.useEffect(() => {
        saveReadingMode(readingMode)
      }, [readingMode])

      React.useEffect(() => {
        saveFontSize(fontSize)
      }, [fontSize])

      const setBookReflow = React.useCallback((enabled: boolean) => {
        if (!bookId) return
        setReflowBooks(previous => {
          const next = { ...previous, [bookId]: enabled }
          saveReflowBooks(next)
          return next
        })
      }, [bookId])

      React.useEffect(() => {
        savePageLayout(pageLayout)
      }, [pageLayout])

      React.useEffect(() => {
        setSettingsOpen(false)
      }, [bookId, screen.kind])

      const setBookTags = React.useCallback(async (book: ClientBook, tags: string[]) => {
        const result = await call('setBookTags', { bookId: book.id, tags })
        setSnapshot(previous => previous
          ? { ...previous, tags: { ...previous.tags, [book.id]: result.tags } }
          : previous)
        return result.tags
      }, [])

      const setBookStatus = React.useCallback(async (book: ClientBook, status: string | null) => {
        const result = await call('setBookStatus', { bookId: book.id, status })
        setSnapshot(previous => {
          if (!previous) return previous
          const statuses = { ...previous.status }
          if (result.status) statuses[book.id] = result.status as any
          else delete statuses[book.id]
          return { ...previous, status: statuses }
        })
        return result.status
      }, [])

      const setBookRating = React.useCallback(async (book: ClientBook, rating: number) => {
        const result = await call('setBookRating', { bookId: book.id, rating: rating > 0 ? rating : null })
        setSnapshot(previous => {
          if (!previous) return previous
          const ratings = { ...previous.rating }
          if (result.rating !== null) ratings[book.id] = result.rating
          else delete ratings[book.id]
          return { ...previous, rating: ratings }
        })
        return result.rating
      }, [])

      React.useEffect(() => {
        void refresh()
      }, [refresh])

      const rememberSession = React.useCallback((bookId: string, sessionId: string) => {
        setSnapshot(previous => previous
          ? {
            ...previous,
            sessions: {
              ...previous.sessions,
              [bookId]: { sessionId, updatedAt: Date.now() },
            },
          }
          : previous)
      }, [])

      const forgetSession = React.useCallback((bookId: string) => {
        setSnapshot(previous => {
          if (!previous?.sessions?.[bookId]) return previous
          const sessions = { ...previous.sessions }
          delete sessions[bookId]
          return { ...previous, sessions }
        })
      }, [])

      const activeBookId = screen.kind === 'book' ? screen.detail.book.id : null
      const activeSessionId = activeBookId && snapshot
        ? snapshot.sessions?.[activeBookId]?.sessionId ?? null
        : null
      const workspaceId = snapshot?.settings?.workspaceId ?? null

      const [nativeFailed, setNativeFailed] = React.useState(false)
      const nativeMode = companionMode(Boolean(props.SessionProvider), Boolean(props.renderSlot), nativeFailed) === 'native'
      const {
        chatOpen,
        setChatOpen,
        chatWidth,
        draft,
        setDraft,
        sending,
        chatError,
        setChatError,
        chatTab,
        setChatTab,
        chatBodyRef,
        chatInputRef,
        running,
        messages,
        eventSeq,
        send,
        loadEarlier,
        startResize,
        moveResize,
        endResize,
        resetResize,
        resizeKeyDown,
        hasMore,
        loadingEarlier,
        chatBinding,
        ensureSession,
      } = useCompanion({ runtime, call, t, screen, workspaceId, activeSessionId, nativeMode, rememberSession, forgetSession })

      const nativeInputRef = React.useRef<any>(null)
      const handleNativeReady = React.useCallback((value: any) => {
        nativeInputRef.current = value
      }, [])
      const handleNativeFallback = React.useCallback(() => setNativeFailed(true), [])


      const lastMessage = messages[messages.length - 1]
      const chatVersion = nativeMode
        ? `native:${eventSeq}`
        : `${messages.length}:${lastMessage?.key ?? ''}:${lastMessage?.text.length ?? 0}`
      const longNotes = useLongNotes({ call, t, activeBookId, notesTabActive: chatTab === 'long', draftWatch: chatOpen, chatVersion })
      const memory = useMemory({ call, t, activeBookId, notesTabActive: chatTab === 'memory' })

      const [noteContextBusy, setNoteContextBusy] = React.useState(false)
      const [noteContextCharacters, setNoteContextCharacters] = React.useState(0)
      const noteContextEnabled = Boolean(activeBookId && snapshot?.companion?.notes?.[activeBookId])
      const toggleNoteContext = React.useCallback(async () => {
        if (!activeBookId) return
        const bookId = activeBookId
        setNoteContextBusy(true)
        setError('')
        try {
          const result = await call('setNoteContext', { bookId, enabled: !noteContextEnabled })
          setSnapshot(previous => {
            if (!previous) return previous
            const notes = { ...(previous.companion?.notes ?? {}) }
            if (result.enabled) notes[bookId] = true
            else delete notes[bookId]
            const companion = previous.companion ?? {
              notes: {},
              memory: { mode: 'off' as const, books: {} },
              autoApplyNotes: false,
            }
            return { ...previous, companion: { ...companion, notes } }
          })
          setNoteContextCharacters(result.characters)
        } catch (cause) {
          setError(`${t('noteContextFailed')}：${messageOf(cause)}`)
        } finally {
          setNoteContextBusy(false)
        }
      }, [activeBookId, call, noteContextEnabled, t])

      React.useEffect(() => {
        setNoteContextCharacters(0)
      }, [activeBookId])

      const noteContext = {
        enabled: noteContextEnabled,
        busy: noteContextBusy,
        characters: noteContextCharacters,
        toggle: toggleNoteContext,
      }

      const autoApplyNotes = Boolean(snapshot?.companion?.autoApplyNotes)
      const [autoApplyBusy, setAutoApplyBusy] = React.useState(false)
      const toggleAutoApply = React.useCallback(async () => {
        setAutoApplyBusy(true)
        setError('')
        try {
          const result = await call('setAutoApplyNotes', { enabled: !autoApplyNotes })
          setSnapshot(previous => previous
            ? {
              ...previous,
              companion: { ...previous.companion, autoApplyNotes: result.enabled },
            }
            : previous)
        } catch (cause) {
          setError(`${t('autoApplyNotesFailed')}：${messageOf(cause)}`)
        } finally {
          setAutoApplyBusy(false)
        }
      }, [autoApplyNotes, call, t])
      const autoApply = {
        enabled: autoApplyNotes,
        busy: autoApplyBusy,
        toggle: toggleAutoApply,
      }

      const openBook = React.useCallback(async (book: ClientBook) => {
        setBusy(true)
        setError('')
        pendingScrollRef.current = null
        try {
          const detail = await call('open', { bookId: book.id })
          if (!detail.supported) {
            setScreen({ kind: 'unsupported', book: detail.book })
            return
          }
          const target = detail.toc.find((item: TocItem) => item.id === detail.progress?.chapterId) ?? detail.toc[0]
          if (!target) {
            setScreen({ kind: 'unsupported', book: detail.book })
            return
          }
          const content = await call('chapter', { bookId: book.id, chapterId: target.id })
          const savedFraction = detail.progress?.chapterFraction
          progressSkipRef.current = true
          setReadingAnchor(typeof savedFraction === 'number' && Number.isFinite(savedFraction)
            ? {
              chapterId: target.id,
              fraction: Math.max(0, Math.min(1, savedFraction)),
              token: ++anchorTokenRef.current,
            }
            : null)
          setVisual(visualForItem(detail, target, reflowEnabledFor(reflowBooks, book.id, detail.book.format)))
          setScreen({ kind: 'book', detail, content })
        } catch (cause) {
          setError(`${t('loadFailed')}：${messageOf(cause)}`)
        } finally {
          setBusy(false)
        }
      }, [reflowBooks, t])

      const selectChapter = React.useCallback(async (bookId: string, chapterId: string, target?: { blockIndex?: number; offset?: number; flash?: boolean }) => {
        setSelection(null)
        setBusy(true)
        pendingScrollRef.current = null
        try {
          const content = await call('chapter', { bookId, chapterId })
          pendingScrollRef.current = target
            ? {
              chapterId: content.chapterId,
              blockIndex: Number.isInteger(target.blockIndex)
                ? target.blockIndex!
                : blockIndexAtOffset(content.blocks, target.offset ?? 0),
              flash: Boolean(target.flash),
            }
            : null
          setScreen(previous => previous.kind === 'book'
            ? { ...previous, detail: { ...previous.detail, progress: { chapterId, chapterTitle: content.title } }, content }
            : previous)
          if (screen.kind === 'book') {
            setVisual(visualForChapter(screen.detail, chapterId, reflowModeRef.current))
          }
        } catch (cause) {
          setError(`${t('loadFailed')}：${messageOf(cause)}`)
        } finally {
          setBusy(false)
        }
      }, [screen, t, reflowMode])

      React.useEffect(() => {
        if (screen.kind !== 'book') {
          mainReaderNavigation = null
          return
        }
        const bookId = screen.detail.book.id
        mainReaderNavigation = {
          bookId,
          jump: target => {
            void selectChapter(bookId, target.chapterId, { offset: target.offset, flash: true })
          },
        }
        return () => {
          if (mainReaderNavigation?.bookId === bookId) mainReaderNavigation = null
        }
      }, [screen, selectChapter])

      const applyRemoteProgress = React.useCallback(async (detail: { bookId: string; chapterId: string; chapterFraction: number }) => {
        if (screen.kind !== 'book' || screen.detail.book.id !== detail.bookId) return
        setReadingAnchor({
          chapterId: detail.chapterId,
          fraction: Math.max(0, Math.min(1, detail.chapterFraction)),
          token: ++anchorTokenRef.current,
        })
        if (detail.chapterId !== screen.content.chapterId) {
          progressSkipRef.current = true
          await selectChapter(detail.bookId, detail.chapterId)
        }
      }, [screen, selectChapter])

      React.useEffect(() => {
        const handler = (event: Event) => {
          const detail = readProgressSync(event)
          if (!detail || detail.origin !== 'sidebar') return
          void applyRemoteProgress(detail)
        }
        window.addEventListener(PROGRESS_SYNC_EVENT, handler)
        return () => window.removeEventListener(PROGRESS_SYNC_EVENT, handler)
      }, [applyRemoteProgress])

      const refreshFromHost = React.useCallback(async () => {
        if (screen.kind !== 'book') return
        try {
          const latest = await call('open', { bookId: screen.detail.book.id })
          const saved = latest.progress
          if (!saved?.chapterId) return
          const fraction = typeof saved.chapterFraction === 'number' && Number.isFinite(saved.chapterFraction)
            ? Math.max(0, Math.min(1, saved.chapterFraction))
            : 0
          setReadingAnchor({ chapterId: saved.chapterId, fraction, token: ++anchorTokenRef.current })
          if (saved.chapterId !== screen.content.chapterId) {
            progressSkipRef.current = true
            await selectChapter(screen.detail.book.id, saved.chapterId)
          }
        } catch {
          // The current page remains usable if the Host cannot refresh progress.
        }
      }, [call, screen, selectChapter])

      const panelInfo = runtime.layout?.panelInfo
      const panelSubscribe = React.useCallback((callback: () => void) =>
        panelInfo?.subscribe ? panelInfo.subscribe(callback) : () => {}, [panelInfo])
      const panelSnapshot = React.useCallback(() =>
        panelInfo?.getSnapshot?.().activePanelId ?? null, [panelInfo])
      const activePanelId = React.useSyncExternalStore(panelSubscribe, panelSnapshot)

      React.useEffect(() => {
        const active = activePanelId === 'dsh-readpilot'
        if (active && !panelWasActiveRef.current && screen.kind === 'book') void refreshFromHost()
        panelWasActiveRef.current = active
      }, [activePanelId, refreshFromHost, screen.kind])

      const jumpToPage = React.useCallback((page: number) => {
        if (screen.kind !== 'book' || screen.detail.book.format !== 'pdf') return
        const items = screen.detail.toc.filter(item => typeof item.page === 'number' && item.page! > 0)
        if (items.length === 0) return
        const target = items
          .filter(item => item.page! <= page)
          .sort((left, right) => right.page! - left.page!)[0] ?? items[0]
        void selectChapter(screen.detail.book.id, target.id, { flash: true })
        if (typeof window !== 'undefined' && window.innerWidth <= 1100) setChatOpen(false)
      }, [screen, selectChapter, setChatOpen])

      const openOtherBook = React.useCallback((target: ReaderJumpTarget) => {
        const sidebar = runtime.sidebarRight
        if (!sidebar || typeof sidebar.openResource !== 'function') {
          setChatError(t('chatJumpOtherBook'))
          return
        }
        try {
          const address = buildReaderResource(target.bookId, target.chapterId, target.offset)
          sidebar.openResource(address, { params: { address } })
        } catch {
          setChatError(t('chatJumpOtherBook'))
        }
      }, [runtime, setChatError, t])

      useChatJump({
        call,
        screen,
        t,
        selectChapter,
        setChatError,
        setChatOpen,
        openOtherBook,
      })

      const {
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
      } = useSearch({ call, screen, t, selectChapter })

      React.useEffect(() => {
        resetSearch()
      }, [activeBookId, resetSearch])

      const {
        visual,
        setVisual,
        pageView,
        setPageView,
        pageViews,
        loadedView,
        pdfPageCount,
        pageInput,
        setPageInput,
        visualLoading,
        visualError,
        setVisualError,
        epubReady,
        epubFrameRef,
        epubPage,
        epubPageCount,
        visual: visualState,
        goPdfPage,
        stepPdfPage,
        zoomPdf,
        onPdfMouseUp,
        onEpubLoad,
        goEpubChapter,
        goEpubPage,
      } = useVisual({
        call,
        t,
        screen,
        palette,
        setSelection,
        selectChapter,
        readingMode: effectiveMode,
        layout: pageLayout,
        anchor: readingAnchor,
      })

      // The panel remounts when switching DSH pages; restored screens must rebuild
      // the visual state or a PDF reader falls back to the text pager.
      React.useEffect(() => {
        if (screen.kind !== 'book' || visual) return
        setVisual(visualForChapter(screen.detail, screen.content.chapterId, reflowMode))
      }, [screen, setVisual, visual, reflowMode])

      const textPageWidth = usePageWidth({
        enabled: isTextFormat,
        containerRef: contentRef,
      })

      const textPager = useTextPager({
        enabled: isTextFormat && effectiveMode === 'paged',
        layout: textLayout,
        screen,
        fontSize,
        pageWidth: textPageWidth,
        anchor: readingAnchor,
        selectChapter,
      })

      const activeChapterId = screen.kind === 'book'
        ? (visual?.kind === 'pdf'
          ? screen.detail.toc.find(item => item.page === visual.page)?.id ?? screen.content.chapterId
          : screen.content.chapterId)
        : ''

      const toc = screen.kind === 'book' ? screen.detail.toc : []
      const chapterIndex = screen.kind === 'book' ? toc.findIndex(item => item.id === screen.content.chapterId) : -1
      const chapterTotal = toc.length
      const activeChapterIndex = toc.findIndex(item => item.id === activeChapterId)
      const pdfVisualPage = visual?.kind === 'pdf' ? visual.page : 1
      const chapterFraction = screen.kind !== 'book'
        ? 0
        : screen.detail.book.format === 'pdf' && !reflowMode
          ? 0
          : screen.detail.book.format === 'epub' && !reflowMode
            ? epubPage / Math.max(1, epubPageCount)
            : textPager.page / Math.max(1, textPager.pageCount)

      const readingPercent = screen.kind !== 'book'
        ? 0
        : screen.detail.book.format === 'pdf' && !reflowMode
          ? pdfPagePercent(pdfVisualPage, pdfPageCount || toc.length || 1)
          : screen.detail.book.format === 'epub' && !reflowMode
            ? chapterPercent(toc, chapterIndex, epubPage, epubPageCount)
            : chapterPercent(toc, activeChapterIndex >= 0 ? activeChapterIndex : chapterIndex, textPager.page, textPager.pageCount)

      const readingView = React.useMemo(() => {
        if (screen.kind !== 'book') return null
        const view: Record<string, unknown> = {
          mode: effectiveMode,
          chapterIndex: activeChapterIndex >= 0 ? activeChapterIndex : chapterIndex,
          chapterTotal,
        }
        const pdfPage = visual?.kind === 'pdf' ? pdfVisualPage : null
        if (effectiveMode === 'paged') {
          if (format === 'pdf' && !reflowMode && pdfPage !== null) {
            view.pageStart = pdfPage
            view.pageEnd = pdfPage
            if (pdfPageCount > 0) view.pageTotal = pdfPageCount
          } else if (format === 'epub' && !reflowMode) {
            view.pageStart = epubPage + 1
            view.pageEnd = epubPage + 1
            if (epubPageCount > 0) view.pageTotal = epubPageCount
          } else {
            view.pageStart = textPager.pageStart
            view.pageEnd = textPager.pageEnd
            view.pageTotal = textPager.pageTotal
          }
        }
        if (selection?.text) {
          view.selection = selection.text.slice(0, 4000)
          if (Number.isInteger(selection.blockIndex)) view.selectionBlockIndex = selection.blockIndex
          if (Number.isInteger(selection.offset)) view.selectionOffset = selection.offset
        }
        return view
      }, [
        activeChapterIndex,
        chapterIndex,
        chapterTotal,
        effectiveMode,
        epubPage,
        epubPageCount,
        format,
        pdfPageCount,
        reflowMode,
        selection?.blockIndex,
        selection?.offset,
        selection?.text,
        textPager.pageEnd,
        textPager.pageStart,
        textPager.pageTotal,
        visual?.kind,
        pdfVisualPage,
      ])
      const readingViewKey = JSON.stringify(readingView)

      React.useEffect(() => {
        if (screen.kind !== 'book' || !activeSessionId || !readingView) return
        void call('companionContext', {
          sessionId: activeSessionId,
          bookId: screen.detail.book.id,
          title: screen.detail.book.title,
          chapter: screen.content.title,
          view: readingView,
        }).catch(() => {})
      }, [activeSessionId, readingViewKey, screen, call])

      const makeReadingAnchor = React.useCallback((chapterId?: string, fraction?: number) => {
        let value = fraction
        if (value === undefined) {
          const scroller = readingMode === 'scroll' ? contentRef.current : null
          if (scroller) value = scroller.scrollTop / Math.max(1, scroller.scrollHeight - scroller.clientHeight)
          else if (isTextFormat && textPager.pageCount > 0) value = textPager.page / Math.max(1, textPager.pageCount)
          else if (visual?.kind === 'epub' && epubPageCount > 0) value = epubPage / Math.max(1, epubPageCount)
          else value = 0
        }
        return {
          chapterId: chapterId ?? (screen.kind === 'book' ? screen.content.chapterId : ''),
          fraction: Math.max(0, Math.min(1, value)),
          token: ++anchorTokenRef.current,
        }
      }, [epubPage, epubPageCount, isTextFormat, readingMode, screen, textPager.page, textPager.pageCount, visual?.kind])

      const changeFlow = React.useCallback((mode: ReaderMode) => {
        if (mode === readingMode) return
        setReadingAnchor(makeReadingAnchor())
        setReadingMode(mode)
      }, [makeReadingAnchor, readingMode])

      const changeSpread = React.useCallback((layout: PageLayout) => {
        if (layout === pageLayout) return
        setReadingAnchor(makeReadingAnchor())
        setPageLayout(layout)
      }, [makeReadingAnchor, pageLayout])

      const changeFontSize = React.useCallback((value: number) => {
        setReadingAnchor(makeReadingAnchor())
        setFontSize(normalizeFontSize(value))
      }, [makeReadingAnchor])

      const openReaderSidebar = React.useCallback((sessionId: string) => {
        const sidebar = runtime.sidebarRight
        if (!sessionId || !sidebar || typeof sidebar.openTab !== 'function' || typeof window === 'undefined') return
        let attempts = 0
        const schedule = () => {
          if (attempts++ >= 20) return
          window.setTimeout(attempt, 80)
        }
        const attempt = () => {
          const mounted = sidebar.mounted?.getSnapshot?.()
          if (typeof mounted === 'string' && mounted !== sessionId) {
            schedule()
            return
          }
          try {
            sidebar.openTab('dsh-readpilot')
          } catch {
            schedule()
          }
        }
        window.setTimeout(attempt, 0)
      }, [])

      const openWorkspace = React.useCallback(async () => {
        if (screen.kind !== 'book' || openingWorkspace) return
        setOpeningWorkspace(true)
        setError('')
        try {
          const sessionId = await ensureSession()
          runtime.uiWorkspace.openSession(sessionId)
          openReaderSidebar(sessionId)
        } catch (cause) {
          setError(`${t('openWorkspaceFailed')}：${messageOf(cause)}`)
        } finally {
          setOpeningWorkspace(false)
        }
      }, [ensureSession, openReaderSidebar, openingWorkspace, screen, t])

      React.useEffect(() => {
        if (readingMode !== 'scroll' || screen.kind !== 'book' || !readingAnchor) return
        if (readingAnchor.chapterId !== screen.content.chapterId) return
        const scroller = contentRef.current
        if (!scroller || scrollAnchorAppliedRef.current === readingAnchor.token) return
        scrollAnchorAppliedRef.current = readingAnchor.token
        const timer = window.setTimeout(() => {
          scroller.scrollTop = readingAnchor.fraction * Math.max(0, scroller.scrollHeight - scroller.clientHeight)
        }, 50)
        return () => window.clearTimeout(timer)
      }, [readingMode, readingAnchor, screen])

      React.useEffect(() => {
        if (screen.kind !== 'book' || !activeChapterId) return
        if (progressSkipRef.current) {
          progressSkipRef.current = false
          return
        }
        const chapterTitle = toc.find(item => item.id === activeChapterId)?.title ?? screen.content.title
        const timer = window.setTimeout(() => {
          void call('progress', {
            bookId: screen.detail.book.id,
            chapterId: activeChapterId,
            chapterTitle,
            chapterFraction: Math.round(chapterFraction * 1000) / 1000,
            percent: Math.round(readingPercent * 10) / 10,
          }).catch(() => {})
        }, 350)
        return () => window.clearTimeout(timer)
      }, [activeChapterId, chapterFraction, readingPercent, screen, toc, call])


      const goChapter = React.useCallback((delta: number) => {
        if (screen.kind !== 'book') return
        const item = screen.detail.toc[chapterIndex + delta]
        if (item) void selectChapter(screen.detail.book.id, item.id)
      }, [chapterIndex, screen, selectChapter])

      const applySource = React.useCallback((next: boolean) => {
        if (screen.kind !== 'book') return
        const format = screen.detail.book.format
        if (format !== 'epub' && format !== 'pdf') return
        reflowModeRef.current = next
        setBookReflow(next)
        const page = visualState?.kind === 'pdf' ? visualState.page : null
        setVisual(visualForChapter(screen.detail, screen.content.chapterId, next))
        if (format === 'pdf') {
          if (next && page) {
            const target = screen.detail.toc
              .filter(item => typeof item.page === 'number' && item.page! <= page)
              .sort((left, right) => right.page! - left.page!)[0] ?? screen.detail.toc[0]
            setReadingAnchor(makeReadingAnchor(target.id, 0))
            if (target) void selectChapter(screen.detail.book.id, target.id)
          } else {
            setReadingAnchor(makeReadingAnchor())
            if (!next && page) setVisual({ kind: 'pdf', page, scale: 1.5 })
          }
        } else {
          setReadingAnchor(makeReadingAnchor())
        }
      }, [makeReadingAnchor, screen, selectChapter, setBookReflow, setVisual, visualState])

      React.useEffect(() => {
        if (screen.kind !== 'book' || screen.detail.book.format !== 'pdf' || !reflowMode) {
          setReflowWarning('')
          return
        }
        const confidence = screen.detail.reflowConfidence
        if (typeof confidence === 'number' && confidence < 0.6) {
          const detail = screen.detail.reflowNotes?.slice(0, 2).join('；')
          setReflowWarning(`${t('reflowLowConfidence')}（${Math.round(confidence * 100)}%）${detail ? `：${detail}` : ''}`)
        } else {
          setReflowWarning('')
        }
      }, [screen, reflowMode, t])


      const scrollToBlock = React.useCallback((pending: PendingScroll) => {
        const container = contentRef.current
        if (!container || !Number.isInteger(pending.blockIndex)) return
        const target = container.querySelector(`[data-block-index="${pending.blockIndex}"]`)
        if (!target) return
        target.scrollIntoView({ block: 'center', behavior: 'smooth' })
        if (pending.flash) {
          target.classList.add('dsh-readpilot-flash')
          window.setTimeout(() => target.classList.remove('dsh-readpilot-flash'), 1500)
        }
      }, [])

      React.useEffect(() => {
        const pending = pendingScrollRef.current
        if (!pending || screen.kind !== 'book') return
        if (screen.content.chapterId !== pending.chapterId) return
        pendingScrollRef.current = null
        const frame = requestAnimationFrame(() => scrollToBlock(pending))
        return () => cancelAnimationFrame(frame)
      }, [screen, scrollToBlock])




      const {
        annotations,
        bookmarks,
        notesLoading,
        notesError,
        noteDeletingId,
        noteEditor,
        noteDraft,
        setNoteDraft,
        noteColor,
        setNoteColor,
        noteSaving,
        noteError,
        noteInputRef,
        noteLayerRef,
        noteLayersRef,
        openNote,
        deleteNote,
        closeNoteEditor,
        openNoteEditor,
        addHighlight,
        addBookmark,
        saveNote,
        loadNotes,
      } = useNotes({
        call,
        t,
        screen,
        activeBookId,
        activeChapterId,
        visual,
        pageView,
        pageViews,
        palette,
        fontSize,
        paged: effectiveMode === 'paged',
        layout: pageLayout,
        contentRef,
        epubFrameRef,
        epubReady,
        selection,
        setSelection,
        selectChapter,
      })

      const onReaderAction = React.useCallback(async (action: ReaderAction) => {
        if (action.type === 'libraryRefresh') {
          await refresh()
          return
        }
        if (action.type === 'notesRefresh') {
          if (action.bookId === activeBookId) await loadNotes()
          return
        }
        if (!action.bookId || !action.chapterId) return
        if (action.bookId === activeBookId) {
          await selectChapter(action.bookId, action.chapterId, {
            ...(typeof action.offset === 'number' ? { offset: action.offset } : {}),
            flash: true,
          })
        } else {
          openOtherBook({ bookId: action.bookId, chapterId: action.chapterId, offset: action.offset })
        }
      }, [activeBookId, loadNotes, openOtherBook, refresh, selectChapter])

      useReaderActions({ call, bookId: activeBookId, onAction: onReaderAction })

      React.useEffect(() => {
        if (screen.kind !== 'book') {
          readerShortcutBridge = null
          return
        }
        readerShortcutBridge = {
          search: () => toggleSearch(),
          bookmark: () => { void addBookmark() },
        }
        return () => {
          readerShortcutBridge = null
        }
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
            paged: effectiveMode === 'paged',
          })
          if (!action) return
          if (action === 'bookmark' && hostShortcutActions.has('bookmark')) return
          if (action === 'search' && hostShortcutActions.has('search') && (event.ctrlKey || event.metaKey)) return
          event.preventDefault()
          if (action === 'next' || action === 'prev') {
            const delta = action === 'next' ? 1 : -1
            if (visual?.kind === 'pdf') stepPdfPage(delta)
            else if (visual?.kind === 'epub') goEpubPage(delta)
            else textPager.goPage(delta)
            return
          }
          if (action === 'search') toggleSearch()
          else if (action === 'close-search') setSearchOpen(false)
          else if (action === 'clear-selection') setSelection(null)
          else if (action === 'bookmark') void addBookmark()
        }
        window.addEventListener('keydown', onKeyDown)
        return () => window.removeEventListener('keydown', onKeyDown)
      }, [addBookmark, effectiveMode, goEpubPage, screen, searchOpen, selection, setSearchOpen, setSelection, stepPdfPage, textPager, toggleSearch, visual])

      useSelectionDismiss(selection, setSelection, epubFrameRef)


      const backToLibrary = React.useCallback(() => {
        setScreen({ kind: 'library' })
        setSelection(null)
        setVisual(null)
        setPageView(null)
        setVisualError('')
        pendingScrollRef.current = null
        void refresh()
      }, [refresh])

      const configure = React.useCallback(async (path: string) => {
        setBusy(true)
        setError('')
        try {
          const value = await call('configure', { path })
          setSnapshot(value)
          setScreen({ kind: 'library' })
        } catch (cause) {
          setError(`${t('configureFailed')}：${messageOf(cause)}`)
        } finally {
          setBusy(false)
        }
      }, [t])

      const pickDirectory = React.useCallback(async (setPath: (value: string) => void) => {
        try {
          const directory = await runtime.uiWorkspace.pickDirectory()
          if (directory) setPath(directory)
        } catch (cause) {
          setError(messageOf(cause))
        }
      }, [])

      const prefillComposer = React.useCallback((text: string) => {
        const nativeInput = nativeInputRef.current?.inputActions
        let prefilledNative = false
        if (nativeInput && typeof nativeInput.setDraft === 'function') {
          try {
            nativeInput.setDraft(text)
            if (typeof nativeInput.focus === 'function') nativeInput.focus()
            prefilledNative = true
          } catch {
            prefilledNative = false
          }
        }
        if (!prefilledNative) setDraft(text)
        setSelection(null)
        setChatOpen(true)
        setChatTab('chat')
        setChatError('')
        requestAnimationFrame(() => chatInputRef.current?.focus())
      }, [setChatError, setChatOpen, setDraft, setSelection])

      const askCompanion = React.useCallback(() => {
        if (!selection || screen.kind !== 'book') return
        window.getSelection()?.removeAllRanges()
        epubFrameRef.current?.contentWindow?.getSelection()?.removeAllRanges()
        prefillComposer(quoteDraft(selection.text))
      }, [epubFrameRef, prefillComposer, screen.kind, selection])

      const savePromptPreset = React.useCallback(async (input: { id?: string; title: string; template: string }) => {
        try {
          const value = await call('prompts', { action: 'save', ...input })
          setPromptPresets(Array.isArray(value.presets) ? value.presets : [])
          setPresetError('')
        } catch (cause) {
          setPresetError(`${t('presetSaveFailed')}：${messageOf(cause)}`)
          throw cause
        }
      }, [call, t])

      const deletePromptPreset = React.useCallback(async (id: string) => {
        try {
          const value = await call('prompts', { action: 'delete', id })
          setPromptPresets(Array.isArray(value.presets) ? value.presets : [])
          setPresetError('')
        } catch (cause) {
          setPresetError(`${t('presetSaveFailed')}：${messageOf(cause)}`)
          throw cause
        }
      }, [call, t])

      const resetPromptPresets = React.useCallback(async () => {
        try {
          const value = await call('prompts', { action: 'reset' })
          setPromptPresets(Array.isArray(value.presets) ? value.presets : [])
          setPresetError('')
        } catch (cause) {
          setPresetError(`${t('presetSaveFailed')}：${messageOf(cause)}`)
          throw cause
        }
      }, [call, t])

      const applyPromptPreset = React.useCallback((preset: PromptPreset) => {
        if (!selection || screen.kind !== 'book') return
        const notesText = annotations.slice(0, 8).map(note => {
          const quote = note.quote.trim()
          const body = (note.note || note.annotation || '').trim()
          return quote && body ? `- ${quote}：${body}` : quote ? `- ${quote}` : body ? `- ${body}` : ''
        }).filter(Boolean).join('\n') || t('presetNoNotes')
        const prompt = renderPrompt(preset.template, {
          selection: selection.text,
          book: screen.detail.book.title,
          chapter: screen.content.title,
          notes: notesText,
        })
        window.getSelection()?.removeAllRanges()
        epubFrameRef.current?.contentWindow?.getSelection()?.removeAllRanges()
        prefillComposer(prompt)
      }, [annotations, epubFrameRef, prefillComposer, screen, selection, t])

      const onContentMouseUp = React.useCallback(() => {
        const active = window.getSelection()
        const container = contentRef.current
        if (!active || active.isCollapsed || active.rangeCount === 0 || !container) {
          setSelection(null)
          return
        }
        const range = active.getRangeAt(0)
        if (!container.contains(range.commonAncestorContainer)) {
          setSelection(null)
          return
        }
        const text = active.toString().trim()
        if (!text) {
          setSelection(null)
          return
        }
        const rect = range.getBoundingClientRect()
        const anchor = selectionAnchor(range, container)
        setSelection({
          text: text.slice(0, 2000),
          x: Math.min(Math.max(rect.left + rect.width / 2, 120), window.innerWidth - 120),
          y: rect.top,
          blockIndex: anchor ? anchor.blockIndex : null,
          offset: anchor ? anchor.offset : 0,
        })
      }, [])

      const openSetup = React.useCallback(() => setScreen({ kind: 'setup' }), [])

      const headerTitle = screen.kind === 'book'
        ? screen.detail.book.title
        : screen.kind === 'unsupported'
          ? screen.book.title
          : screen.kind === 'setup'
            ? t('setupTitle')
            : snapshot?.settings.libraryDir ? t('library') : t('setupTitle')
      const headerSubtitle = screen.kind === 'book'
        ? screen.content.title
        : snapshot?.settings.libraryDir ?? ''

      const chatBody = h(ChatBody, {
        t,
        workspaceId,
        hasMore,
        loadingEarlier,
        loadEarlier,
        messages,
        sending,
        running,
        chatBodyRef,
      })

      const chatCompose = h(ChatCompose, {
        t,
        workspaceId,
        draft,
        setDraft,
        sending,
        send,
        chatInputRef,
      })

      const fallbackChat = h('div', { className: 'dsh-readpilot-chat-fallback' },
        chatBody,
        chatError ? h('div', { className: 'dsh-readpilot-chat-error' }, chatError) : null,
        chatCompose)

      const companionReference = chatBinding?.reference
      const nativeChat = companionReference && props.SessionProvider && props.renderSlot
        ? h(NativeChatBoundary, { fallback: fallbackChat, onError: handleNativeFallback },
          h(props.SessionProvider, { session: companionReference },
            props.renderSlot('dsh-readpilot.companion', {
              onReady: handleNativeReady,
              onFallback: handleNativeFallback,
              fallback: fallbackChat,
            })))
        : null

      const notesBody = h(NotesBody, {
        t,
        notesError,
        notesLoading,
        annotations,
        bookmarks,
        screen,
        openNote,
        noteDeletingId,
        deleteNote,
      })

      const longNotesBody = h(LongNotes, { t, state: longNotes, noteContext, autoApply, useResource: props.useResource })
      const memoryBody = h(MemoryPanel, {
        t,
        status: memory.status,
        loading: memory.loading,
        error: memory.error,
        busy: memory.busy,
        onRefresh: memory.refresh,
        onMode: memory.setMode,
        onBookState: memory.setBookState,
        onSave: memory.saveCard,
        onUndo: memory.undo,
        onClear: memory.clear,
      })

      const searchPanel = h(SearchPanel, {
        t,
        open: searchOpen,
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
      })

      const chatPanel = h(ChatPanel, {
        t,
        chatOpen,
        chatTab,
        setChatTab,
        setChatOpen,
        notesBody,
        longNotesBody,
        memoryBody,
        chatBody,
        nativeChat,
        onPageJump: format === 'pdf' ? jumpToPage : null,
        chatError,
        chatCompose,
        chatWidth,
        minWidth: CHAT_WIDTH_MIN,
        maxWidth: CHAT_WIDTH_MAX,
        startResize,
        moveResize,
        endResize,
        resetResize,
        resizeKeyDown,
      })


      const pdfVisual = visual?.kind === 'pdf' ? visual : null
      const pdfPage = pdfVisual?.page ?? 1

      const readerBarProps = format === 'pdf'
        ? {
          pageStart: pdfPage,
          pageEnd: Math.min(pdfPage + columnsFor(pageLayout) - 1, pdfPageCount || pdfPage),
          pageTotal: pdfPageCount || 1,
          percent: readingPercent,
          reflow: false,
          canPrev: pdfPage > 1,
          canNext: pdfPage < pdfPageCount,
          onPrev: () => stepPdfPage(-1),
          onNext: () => stepPdfPage(1),
          pageInput,
          setPageInput,
          onPageCommit: goPdfPage,
          zoom: pdfVisual?.scale ?? 1,
          onZoom: zoomPdf,
        }
        : format === 'epub'
          ? effectiveMode === 'paged'
            ? {
              pageStart: epubPage + 1,
              pageEnd: epubPage + 1,
              pageTotal: epubPageCount,
              percent: readingPercent,
              canPrev: epubPage > 0 || chapterIndex > 0,
              canNext: epubPage < epubPageCount - 1 || chapterIndex < chapterTotal - 1,
              onPrev: () => goEpubPage(-1),
              onNext: () => goEpubPage(1),
            }
            : {
              pageStart: 1,
              pageEnd: 1,
              pageTotal: 1,
              percent: readingPercent,
              canPrev: chapterIndex > 0,
              canNext: chapterIndex >= 0 && chapterIndex < chapterTotal - 1,
              onPrev: () => goEpubChapter(-1),
              onNext: () => goEpubChapter(1),
            }
          : effectiveMode === 'paged'
            ? {
              pageStart: textPager.pageStart,
              pageEnd: textPager.pageEnd,
              pageTotal: textPager.pageTotal,
              percent: readingPercent,
              reflow: reflowMode,
              canPrev: textPager.canPrev,
              canNext: textPager.canNext,
              onPrev: () => textPager.goPage(-1),
              onNext: () => textPager.goPage(1),
            }
            : {
              pageStart: 1,
              pageEnd: 1,
              pageTotal: 1,
              percent: readingPercent,
              canPrev: chapterIndex > 0,
              canNext: chapterIndex >= 0 && chapterIndex < chapterTotal - 1,
              onPrev: () => goChapter(-1),
              onNext: () => goChapter(1),
            }

      const readerBar = screen.kind === 'book'
        ? h(ReaderBar, {
          t,
          format: screen.detail.book.format,
          mode: effectiveMode,
          layout: textLayout,
          chapterTitle: screen.content.title,
          chapterIndex,
          chapterTotal,
          ...readerBarProps,
          reflow: reflowMode,
        })
        : null

      const visualReader = visual ? h(VisualReader, {
        t,
        visual,
        screen,
        pageViews,
        loadedView,
        layout: pageLayout,
        readingMode: effectiveMode,
        stepPdfPage,
        visualLoading,
        visualError,
        onPdfMouseUp,
        noteLayerRef,
        noteLayersRef,
        onEpubLoad,
        epubFrameRef,
      }) : null

      const pageSpan = pageSpanWidth(textPageWidth, textLayout)
      const pageFrameStyle = pageSpan > 0
        ? { width: `${pageSpan}px`, maxWidth: '100%', margin: '0 auto' }
        : undefined
      const textColumnStyle = textPageWidth > 0
        ? { width: `${textPageWidth}px`, maxWidth: '100%', margin: '0 auto' }
        : undefined

      const textReader = screen.kind === 'book'
        ? effectiveMode === 'paged'
          ? h('div', {
            className: 'dsh-readpilot-reader',
            'data-paged': 'true',
            ref: contentRef,
            style: { fontSize },
            onMouseUp: onContentMouseUp,
          },
          h('div', { className: 'dsh-readpilot-page-frame', ref: textPager.frameRef, style: pageFrameStyle },
            h('div', {
              className: 'dsh-readpilot-reader-inner dsh-readpilot-paged-inner',
              ref: textPager.innerRef,
              style: textPager.innerStyle,
            },
            h('h1', { className: 'dsh-readpilot-chapter-title' }, screen.content.title),
            renderBlocks(screen.content.blocks, screen.content.chapterId),
            h('div', { className: 'dsh-readpilot-note-layer', ref: noteLayerRef }))))
          : h('div', {
            className: 'dsh-readpilot-reader',
            'data-paged': 'false',
            ref: contentRef,
            style: { fontSize },
            onMouseUp: onContentMouseUp,
          },
          h('div', { className: 'dsh-readpilot-reader-inner', style: textColumnStyle },
            h('h1', { className: 'dsh-readpilot-chapter-title' }, screen.content.title),
            renderBlocks(screen.content.blocks, screen.content.chapterId),
            h('div', { className: 'dsh-readpilot-note-layer', ref: noteLayerRef })))
        : null

      const bookView = screen.kind === 'book'
        ? h('div', {
          className: 'dsh-readpilot-book',
          'data-toc': tocOpen ? 'true' : 'false',
          'data-chat': chatOpen ? 'true' : 'false',
          style: { '--dsh-readpilot-chat-width': `${chatWidth}px` },
        },
        tocOpen ? h(Toc, {
          t,
          detail: screen.detail,
          activeChapter: screen.content.chapterId,
          onSelect: (chapterId: string) => void selectChapter(screen.detail.book.id, chapterId),
        }) : null,
        h('div', { className: 'dsh-readpilot-main' },
          readerBar,
          visualReader ?? textReader),
        chatOpen
          ? h('button', {
            type: 'button',
            className: 'dsh-readpilot-chat-backdrop',
            'aria-label': t('closeChat'),
            onClick: () => setChatOpen(false),
          })
          : null,
        chatPanel)
        : null

      return h('div', {
        className: 'dsh-readpilot-panel',
        'data-palette': palette.id,
        style: {
          '--reader-bg': palette.bg,
          '--reader-fg': palette.fg,
          '--reader-muted': palette.muted,
          '--reader-border': palette.border,
          '--reader-selection': palette.selection,
          '--reader-highlight': palette.highlight,
          '--reader-glass-blur': `${glassBlur}px`,
        },
      },
        h(Header, {
          t,
          screen,
          title: headerTitle,
          subtitle: headerSubtitle,
          onBack: backToLibrary,
          searchOpen,
          settingsOpen,
          onToggleSettings: () => setSettingsOpen(previous => !previous),
          openingWorkspace,
          onOpenWorkspace: openWorkspace,
          onToggleSearch: toggleSearch,
          onToggleChat: () => setChatOpen(previous => !previous),
          onToggleToc: () => setTocOpen(previous => !previous),
          onBookmark: addBookmark,
        }),
        settingsOpen && screen.kind === 'book'
          ? h(ReaderSettings, {
            t,
            format: screen.detail.book.format,
            source: reflowMode,
            flow: effectiveMode,
            spread: format === 'pdf' && reflowMode ? 'single' : pageLayout,
            fontSize,
            paletteId,
            glassBlur,
            capabilities,
            onSource: applySource,
            onFlow: changeFlow,
            onSpread: changeSpread,
            onFontSize: changeFontSize,
            onPalette: changePalette,
            onGlassBlur: setGlassBlur,
            onClose: () => setSettingsOpen(false),
          })
          : null,
        reflowWarning
          ? h('div', { className: 'dsh-readpilot-reflow-warning' },
            h('span', null, reflowWarning),
            h('button', {
              type: 'button',
              className: 'dsh-readpilot-reflow-warning-close',
              title: t('close'),
              'aria-label': t('close'),
              onClick: () => setReflowWarning(''),
            }, '×'))
          : null,
        error ? h('div', { className: 'dsh-readpilot-error' }, error) : null,
        searchPanel,
        !snapshot
          ? h('div', { className: 'dsh-readpilot-muted' }, busy ? t('loading') : t('loadFailed'))
          : screen.kind === 'setup' || !snapshot.settings.libraryDir
            ? h(Setup, {
              t,
              initialPath: snapshot.settings.libraryDir ?? '',
              busy,
              onConfigure: configure,
              onPick: pickDirectory,
              onCancel: snapshot.settings.libraryDir
                ? () => setScreen({ kind: 'library' })
                : null,
            })
            : screen.kind === 'library'
              ? h(Library, {
                t,
                snapshot,
                busy,
                onOpen: openBook,
                onRefresh: refresh,
                onSettings: openSetup,
                onSetTags: setBookTags,
                onSetStatus: setBookStatus,
                onSetRating: setBookRating,
              })
              : screen.kind === 'unsupported'
                ? h('div', { className: 'dsh-readpilot-empty' },
                  h('h2', null, screen.book.title),
                  h('p', null, t('unsupportedHint')),
                  h('button', {
                    type: 'button',
                    className: 'dsh-readpilot-secondary',
                    onClick: backToLibrary,
                  }, t('back')))
                : bookView,
        h(SelectionToolbar, {
          t,
          selection,
          onAsk: askCompanion,
          onNote: () => openNoteEditor(),
          onHighlight: (color: string) => void addHighlight(color),
          presets: promptPresets,
          onPreset: applyPromptPreset,
          onManagePresets: () => setPresetManagerOpen(true),
        }),
        h(NoteDialog, {
          t,
          noteEditor,
          noteDraft,
          setNoteDraft,
          noteColor,
          setNoteColor,
          noteSaving,
          noteError,
          noteInputRef,
          activeBookId,
          deleteNote,
          closeNoteEditor,
          saveNote,
        }),
        presetManagerOpen
          ? h(PromptPresetManager, {
            t,
            presets: promptPresets,
            error: presetError,
            onSave: savePromptPreset,
            onDelete: deletePromptPreset,
            onReset: resetPromptPresets,
            onClose: () => setPresetManagerOpen(false),
          })
          : null,
        h(DraftNotice, { t, state: longNotes }))
    }

    function ReaderPanelWithBoundary(props: any) {
      return h(ReaderErrorBoundary, null, h(ReaderPanel, props))
    }

    return {
      name: 'dsh-readpilot-client',
      inject: ['slots', 'layout', 'locale', 'connection', 'sessions', 'uiWorkspace', 'sidebarRightTabs', 'sidebarRight'],
      foldTranscript,
      clampChatWidth,
      parseMarkdownBlocks,
      diffLines,
      NativeCompanion,
      READER_PALETTE_IDS,
      READER_PALETTES,
      resolveReaderPalette,
      normalizeGlassBlur,
      DEFAULT_GLASS_BLUR,
      findNoteOccurrence,
      apply(ctx: any) {
        runtime = ctx
        boundText = ctx.locale.bind(NS)
        void (async () => {
          try {
            const value = await call('state')
            await syncCompanionSessionTitles(runtime, value.books ?? [], value.sessions ?? {})
          } catch {
            // Session titles are best effort; reader open retries.
          }
        })()
        ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'dsh-readpilot: dictionaries')
        const shortcuts = typeof ctx.get === 'function' ? ctx.get('shortcuts') : undefined
        if (shortcuts && typeof shortcuts.register === 'function') {
          for (const item of [
            { action: 'search' as const, id: 'dsh-readpilot.search', labelKey: 'search' as const },
            { action: 'bookmark' as const, id: 'dsh-readpilot.bookmark', labelKey: 'bookmark' as const },
          ]) {
            const command = {
              id: item.id,
              label: () => boundText(item.labelKey),
              aliases: [item.action],
              defaults: READER_SHORTCUT_DEFAULTS[item.action],
              regions: ['page'],
              modals: [],
              resolve: () => readerShortcutBridge
                ? { status: 'handled' as const, run: readerShortcutBridge[item.action] }
                : { status: 'pass' as const },
            }
            ctx.effect(() => {
              try {
                const dispose = shortcuts.register(command)
                hostShortcutActions.add(item.action)
                return () => {
                  hostShortcutActions.delete(item.action)
                  dispose()
                }
              } catch (error) {
                console.warn(`dsh-readpilot: shortcut ${item.id} was not registered`, error)
                return () => {}
              }
            }, `dsh-readpilot: shortcut ${item.id}`)
          }
        }
        const resources = typeof ctx.get === 'function' ? ctx.get('resources') : undefined
        if (resources && typeof resources.register === 'function') {
          ctx.effect(() => resources.register({
            protocol: 'dsh-readpilot-note',
            async *open(address: string, options: any) {
              const target = parseNoteResource(address)
              if (!target) return
              const signal = options?.signal
              let lastHash = ''
              while (!signal?.aborted) {
                try {
                  const value = await call('noteFiles.read', { bookId: target.bookId, id: target.noteId })
                  if (value.hash !== lastHash) {
                    lastHash = value.hash
                    yield { ok: true, value }
                  }
                } catch (error) {
                  yield { ok: false, error: { code: 'note-resource', message: messageOf(error) } }
                  return
                }
                await new Promise<void>(resolve => {
                  const timer = window.setTimeout(resolve, 2000)
                  signal?.addEventListener('abort', () => {
                    window.clearTimeout(timer)
                    resolve()
                  }, { once: true })
                })
              }
            },
          }), 'dsh-readpilot: note resource')
        }
        const openReaderResource = typeof ctx.sidebarRight?.openResource === 'function'
          ? (address: string) => {
            try {
              ctx.sidebarRight.openResource(address, { params: { address } })
            } catch (error) {
              console.warn('dsh-readpilot: could not open reader resource', error)
            }
          }
          : undefined
        const openReaderTarget = (target: { bookId: string; chapterId: string; offset?: number }) => {
          if (mainReaderNavigation?.bookId === target.bookId) {
            mainReaderNavigation.jump(target)
            return
          }
          openReaderResource?.(buildReaderResource(target.bookId, target.chapterId, target.offset))
        }
        const openReaderTargetFromAddress = (address: string) => {
          const target = parseReaderResource(address)
          if (!target) return
          if (target.chapterId) openReaderTarget({ bookId: target.bookId, chapterId: target.chapterId, offset: target.offset })
          else openReaderResource?.(address)
        }
        if (typeof document !== 'undefined' && openReaderResource) {
          const onJumpClick = (event: MouseEvent) => {
            const anchor = (event.target as Element | null)?.closest?.('a[href*="dsh-readpilot.invalid/jump"]') as HTMLAnchorElement | null
            if (!anchor) return
            if (document.querySelector('.dsh-readpilot-reader, .dsh-readpilot-sidebar-reader-root')) return
            const target = parseReaderJumpUrl(anchor.href)
            if (!target) return
            event.preventDefault()
            event.stopImmediatePropagation()
            if (target.offset === undefined && target.q) {
              const query = target.q
              void (async () => {
                try {
                  const result = await call('search', { bookId: target.bookId, query, limit: 20 })
                  const match = result.matches.find((item: any) => item.chapterId === target.chapterId)
                  openReaderTarget(match
                    ? { bookId: target.bookId, chapterId: match.chapterId, offset: match.offset }
                    : { bookId: target.bookId, chapterId: target.chapterId })
                } catch (error) {
                  console.warn('dsh-readpilot: jump search failed', error)
                }
              })()
              return
            }
            openReaderTarget({ bookId: target.bookId, chapterId: target.chapterId, offset: target.offset })
          }
          document.addEventListener('click', onJumpClick, true)
          ctx.effect(() => () => document.removeEventListener('click', onJumpClick, true), 'dsh-readpilot: global jump links')
        }
        if (ctx.sidebarRightTabs) {
          ctx.effect(
            () => ctx.sidebarRightTabs.register({
              id: 'dsh-readpilot.sidebar',
              kind: 'dsh-readpilot',
              patterns: ['dsh-resource://dsh-readpilot/**'],
              title: () => boundText('sidebarReaderTitle'),
              guide: [{
                id: 'reader',
                title: () => boundText('sidebarReaderTitle'),
                description: () => boundText('sidebarReaderHint'),
              }],
              keepMounted: true,
            }),
            'dsh-readpilot: sidebar tab type',
          )
          ctx.effect(
            () => ctx.slots.inject('sidebar.right.pane.tab', () => ctx.slots.register({
              name: 'sidebar.right.pane.tab',
              key: 'dsh-readpilot.sidebar',
              locale: NS,
            }, (props: any) => h(SidebarReader, { ...props, call, t: props.t ?? boundText, openResource: openReaderResource }))),
            'dsh-readpilot: sidebar tab body',
          )
        }
        ctx.effect(
          () => ctx.slots.inject('tool.call.toolview', () => ctx.slots.register({
            name: 'tool.call.toolview',
            key: 'reader_books',
            locale: NS,
          }, (props: any) => h(ReaderBooksToolView, { ...props, t: props.t ?? boundText }))),
          'dsh-readpilot: reader_books tool view',
        )
        ctx.effect(
          () => ctx.slots.inject('tool.call.toolview', () => ctx.slots.register({
            name: 'tool.call.toolview',
            key: 'reader_search',
            locale: NS,
          }, (props: any) => h(ReaderSearchToolView, {
            ...props,
            t: props.t ?? boundText,
            onOpen: openReaderTargetFromAddress,
          }))),
          'dsh-readpilot: reader_search tool view',
        )
        ctx.effect(
          () => ctx.slots.inject('tool.call.toolview', () => ctx.slots.register({
            name: 'tool.call.toolview',
            key: 'reader_open',
            locale: NS,
          }, (props: any) => h(ReaderOpenToolView, {
            ...props,
            t: props.t ?? boundText,
            onOpen: openReaderTargetFromAddress,
          }))),
          'dsh-readpilot: reader_open tool view',
        )
        ctx.effect(
          () => ctx.slots.inject('sidebar.panellist', () => ctx.slots.register({
            name: 'sidebar.panellist',
            id: 'dsh-readpilot',
            order: 20,
            label: () => boundText('panel'),
            locale: NS,
          }, PanelIcon)),
          'dsh-readpilot: sidebar entry',
        )
        ctx.effect(
          () => ctx.slots.inject('main', () => ctx.slots.register({
            name: 'main',
            key: 'dsh-readpilot',
            locale: NS,
            children: {
              'dsh-readpilot.companion': { kind: 'single', scope: 'session' },
            },
          }, ReaderPanelWithBoundary)),
          'dsh-readpilot: main panel',
        )
        ctx.effect(
          () => ctx.slots.inject('dsh-readpilot.companion', () => ctx.slots.register({
            name: 'dsh-readpilot.companion',
            locale: NS,
          }, NativeCompanion)),
          'dsh-readpilot: native companion',
        )
      },
    }
}

