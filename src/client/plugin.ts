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
  readPaletteId,
  resolveReaderPalette,
  savePaletteId,
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
import { MemoryPanel } from './views/memory-panel.ts'
import { VisualReader } from './views/visual-reader.ts'
import { ChatPanel } from './views/chat-panel.ts'
import { Header } from './views/header.ts'
import { NoteDialog, SelectionToolbar } from './views/selection-note.ts'
import { createReaderErrorBoundary } from './views/error-boundary.ts'
import { ReaderBar } from './views/reader-bar.ts'
import { useCompanion } from './hooks/use-companion.ts'
import { ChatBody, ChatCompose } from './views/chat-content.ts'
import { NativeCompanion, createNativeChatBoundary } from './views/native-companion.ts'
import { useSearch } from './hooks/use-search.ts'
import { useNotes } from './hooks/use-notes.ts'
import { useLongNotes } from './hooks/use-long-notes.ts'
import { useMemory } from './hooks/use-memory.ts'
import { useTextPager } from './hooks/use-text-pager.ts'
import { usePageWidth } from './hooks/use-page-width.ts'
import { useVisual } from './hooks/use-visual.ts'
import { columnsFor, pageSpanWidth } from './paging.ts'
import type { PageLayout, ReaderMode } from './paging.ts'
import type {
  BookDetail,
  ClientBook,
  PendingScroll,
  Screen,
  Selection,
  Snapshot,
  TextFn,
  TocItem,
  Visual,
} from './types.ts'
import type { CallRpc } from '../rpc.ts'

export function createPlugin(require: (name: string) => any) {
    bindRuntime(require)
    const ReaderErrorBoundary = createReaderErrorBoundary()
    const NativeChatBoundary = createNativeChatBoundary()
    const NS = 'dshReader'


    const style = document.createElement('style')
    style.dataset.plugin = 'dsh-readpilot'
    style.dataset.pluginCss = 'dsh-readpilot/reader.css'
    style.textContent = CSS
    document.head.appendChild(style)

    let runtime: any
    let boundText: TextFn = key => key

    const call = (async (endpoint: string, payload?: unknown): Promise<any> => {
      if (!runtime || !runtime.connection) throw new Error('连接服务不可用')
      let response: Response
      try {
        response = await fetch('/api/dsh-readpilot', {
          method: 'POST',
          credentials: 'same-origin',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ endpoint, payload: payload ?? null }),
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



    function ReaderPanel(props: { t?: TextFn; SessionProvider?: any; renderSlot?: any }) {
      const t: TextFn = props.t ?? boundText
      const [snapshot, setSnapshot] = React.useState<Snapshot | null>(null)
      const [screen, setScreen] = React.useState<Screen>({ kind: 'library' })
      const [readingMode, setReadingMode] = React.useState<ReaderMode>('scroll')
      const [pageLayout, setPageLayout] = React.useState<PageLayout>('single')
      const [error, setError] = React.useState('')
      const [busy, setBusy] = React.useState(false)
      const [tocOpen, setTocOpen] = React.useState(true)
      const [fontSize, setFontSize] = React.useState(17)
      const [selection, setSelection] = React.useState<Selection | null>(null)
      const [paletteId, setPaletteId] = React.useState<string>(readPaletteId)
      const palette = resolveReaderPalette(paletteId)
      const format = screen.kind === 'book' ? screen.detail.book.format : null
      const isTextFormat = format === 'txt' || format === 'md'
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

      const changePalette = React.useCallback((id: string) => {
        if (!READER_PALETTES[id]) return
        setPaletteId(id)
        savePaletteId(id)
      }, [])

      const setBookTags = React.useCallback(async (book: ClientBook, tags: string[]) => {
        const result = await call('setBookTags', { bookId: book.id, tags })
        setSnapshot(previous => previous
          ? { ...previous, tags: { ...previous.tags, [book.id]: result.tags } }
          : previous)
        return result.tags
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

      const activeBookId = screen.kind === 'book' ? screen.detail.book.id : null
      const activeSessionId = activeBookId && snapshot
        ? snapshot.sessions?.[activeBookId]?.sessionId ?? null
        : null
      const workspaceId = snapshot?.settings?.workspaceId ?? null

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
      } = useCompanion({ runtime, call, t, screen, workspaceId, activeSessionId, rememberSession })

      const nativeInputRef = React.useRef<any>(null)
      const handleNativeReady = React.useCallback((value: any) => {
        nativeInputRef.current = value
        if (!value || !chatBinding?.sessionId) return
        void call('companionPolicy', { sessionId: chatBinding.sessionId }).catch(() => {})
      }, [chatBinding, call])

      React.useEffect(() => {
        if (screen.kind !== 'book' || !activeSessionId) return
        void call('companionContext', {
          sessionId: activeSessionId,
          bookId: screen.detail.book.id,
          title: screen.detail.book.title,
          chapter: screen.content.title,
        }).catch(() => {})
      }, [activeSessionId, screen, call])

      const longNotes = useLongNotes({ call, t, activeBookId, notesTabActive: chatTab === 'long' })
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
            const companion = previous.companion ?? { notes: {}, memory: { mode: 'ask' as const, books: {} } }
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

      const visualFor = React.useCallback((detail: BookDetail, item: TocItem | undefined): Visual | null => {
        if (!detail || !item) return null
        if (detail.book.format === 'pdf') {
          return { kind: 'pdf', page: Number.isInteger(item.page) ? item.page! : 1, scale: 1.5 }
        }
        if (detail.book.format === 'epub' && typeof item.href === 'string' && item.href) {
          return { kind: 'epub', href: item.href }
        }
        return null
      }, [])

      const openBook = React.useCallback(async (book: ClientBook) => {
        setBusy(true)
        setError('')
        pendingScrollRef.current = null
        try {
          const detail = await call('open', { bookId: book.id })
          setReadingMode(detail.book.format === 'pdf' ? 'paged' : 'scroll')
          setPageLayout('single')
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
          setVisual(visualFor(detail, target))
          setScreen({ kind: 'book', detail, content })
        } catch (cause) {
          setError(`${t('loadFailed')}：${messageOf(cause)}`)
        } finally {
          setBusy(false)
        }
      }, [t, visualFor])

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
            const item = screen.detail.toc.find(entry => entry.id === chapterId)
            setVisual(visualFor(screen.detail, item))
          }
          const toc = screen.kind === 'book' ? screen.detail.toc : []
          const index = toc.findIndex(item => item.id === chapterId)
          const percent = index >= 0 && toc.length > 0 ? (index / toc.length) * 100 : undefined
          void call('progress', { bookId, chapterId, chapterTitle: content.title, percent }).catch(() => {})
        } catch (cause) {
          setError(`${t('loadFailed')}：${messageOf(cause)}`)
        } finally {
          setBusy(false)
        }
      }, [screen, t, visualFor])

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
        epubPageStart,
        epubPageEnd,
        epubPageTotal,
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
      })

      const textPageWidth = usePageWidth({
        enabled: isTextFormat,
        containerRef: contentRef,
      })

      const textPager = useTextPager({
        enabled: isTextFormat && effectiveMode === 'paged',
        layout: pageLayout,
        screen,
        fontSize,
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

      const goChapter = React.useCallback((delta: number) => {
        if (screen.kind !== 'book') return
        const item = screen.detail.toc[chapterIndex + delta]
        if (item) void selectChapter(screen.detail.book.id, item.id)
      }, [chapterIndex, screen, selectChapter])

      const toggleReadingMode = React.useCallback(() => {
        setReadingMode(previous => previous === 'paged' ? 'scroll' : 'paged')
      }, [])


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
        notes,
        highlights,
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
        openNote,
        deleteNote,
        closeNoteEditor,
        openNoteEditor,
        addHighlight,
        addBookmark,
        saveNote,
      } = useNotes({
        call,
        t,
        screen,
        activeBookId,
        activeChapterId,
        visual,
        pageView,
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

      React.useEffect(() => {
        if (!selection) return
        const dismiss = (event: Event) => {
          const target = event.target as Element | null
          if (target && typeof target.closest === 'function' && target.closest('.dsh-readpilot-selection')) return
          setSelection(null)
        }
        const frameDoc = epubFrameRef.current?.contentDocument ?? null
        document.addEventListener('pointerdown', dismiss, true)
        frameDoc?.addEventListener('pointerdown', dismiss, true)
        return () => {
          document.removeEventListener('pointerdown', dismiss, true)
          frameDoc?.removeEventListener('pointerdown', dismiss, true)
        }
      }, [epubFrameRef, selection, setSelection])


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

      const prefill = React.useCallback((kind: 'explain' | 'summarize' | 'translate') => {
        if (!selection || screen.kind !== 'book') return
        window.getSelection()?.removeAllRanges()
        epubFrameRef.current?.contentWindow?.getSelection()?.removeAllRanges()
        const question = {
          explain: t('explainPrompt'),
          summarize: t('summarizePrompt'),
          translate: t('translatePrompt'),
        }[kind]
        const quote = selection.text.split('\n').map(line => `> ${line}`).join('\n')
        const text = `我在读《${screen.detail.book.title}》的《${screen.content.title}》。\n\n${quote}\n\n${question}`
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
      }, [selection, screen, t])

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
        ? h(NativeChatBoundary, { fallback: fallbackChat },
          h(props.SessionProvider, { session: companionReference },
            props.renderSlot('dsh-readpilot.companion', { onReady: handleNativeReady, fallback: fallbackChat })))
        : null

      const notesBody = h(NotesBody, {
        t,
        notesError,
        notesLoading,
        notes,
        highlights,
        bookmarks,
        screen,
        openNote,
        noteDeletingId,
        deleteNote,
      })

      const longNotesBody = h(LongNotes, { t, state: longNotes, noteContext })
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
        onApprove: memory.approve,
        onReject: memory.reject,
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
          canPrev: pdfPage > 1,
          canNext: pdfPage < pdfPageCount,
          onPrev: () => stepPdfPage(-1),
          onNext: () => stepPdfPage(1),
          pageInput,
          setPageInput,
          onPageCommit: goPdfPage,
          zoom: pdfVisual?.scale ?? 1,
          onZoom: zoomPdf,
          onLayoutChange: setPageLayout,
        }
        : format === 'epub'
          ? effectiveMode === 'paged'
            ? {
              pageStart: epubPageStart,
              pageEnd: epubPageEnd,
              pageTotal: epubPageTotal,
              canPrev: epubPage > 0 || chapterIndex > 0,
              canNext: epubPage < epubPageCount - 1 || chapterIndex < chapterTotal - 1,
              onPrev: () => goEpubPage(-1),
              onNext: () => goEpubPage(1),
              onToggleMode: toggleReadingMode,
              onLayoutChange: setPageLayout,
            }
            : {
              pageStart: 1,
              pageEnd: 1,
              pageTotal: 1,
              canPrev: chapterIndex > 0,
              canNext: chapterIndex >= 0 && chapterIndex < chapterTotal - 1,
              onPrev: () => goEpubChapter(-1),
              onNext: () => goEpubChapter(1),
              onToggleMode: toggleReadingMode,
            }
          : effectiveMode === 'paged'
            ? {
              pageStart: textPager.pageStart,
              pageEnd: textPager.pageEnd,
              pageTotal: textPager.pageTotal,
              canPrev: textPager.canPrev,
              canNext: textPager.canNext,
              onPrev: () => textPager.goPage(-1),
              onNext: () => textPager.goPage(1),
              onToggleMode: toggleReadingMode,
              onLayoutChange: setPageLayout,
            }
            : {
              pageStart: 1,
              pageEnd: 1,
              pageTotal: 1,
              canPrev: chapterIndex > 0,
              canNext: chapterIndex >= 0 && chapterIndex < chapterTotal - 1,
              onPrev: () => goChapter(-1),
              onNext: () => goChapter(1),
              onToggleMode: toggleReadingMode,
            }

      const readerBar = screen.kind === 'book'
        ? h(ReaderBar, {
          t,
          format: screen.detail.book.format,
          mode: effectiveMode,
          layout: pageLayout,
          chapterTitle: screen.content.title,
          chapterIndex,
          chapterTotal,
          ...readerBarProps,
        })
        : null

      const visualReader = visual ? h(VisualReader, {
        t,
        visual,
        screen,
        pageViews,
        layout: pageLayout,
        readingMode: effectiveMode,
        stepPdfPage,
        visualLoading,
        visualError,
        onPdfMouseUp,
        noteLayerRef,
        onEpubLoad,
        epubFrameRef,
      }) : null

      const pageSpan = pageSpanWidth(textPageWidth, pageLayout)
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
        style: {
          '--reader-bg': palette.bg,
          '--reader-fg': palette.fg,
          '--reader-muted': palette.muted,
          '--reader-border': palette.border,
          '--reader-selection': palette.selection,
          '--reader-highlight': palette.highlight,
        },
      },
        h(Header, {
          t,
          screen,
          title: headerTitle,
          subtitle: headerSubtitle,
          onBack: backToLibrary,
          paletteId,
          onChangePalette: changePalette,
          searchOpen,
          onToggleSearch: toggleSearch,
          onToggleChat: () => setChatOpen(previous => !previous),
          onToggleToc: () => setTocOpen(previous => !previous),
          onBookmark: addBookmark,
          onFontDecrease: () => setFontSize(previous => Math.max(14, previous - 1)),
          onFontIncrease: () => setFontSize(previous => Math.min(24, previous + 1)),
        }),
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
          prefill,
          onNote: () => openNoteEditor(),
          onHighlight: (color: string) => void addHighlight(color),
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
        }))
    }

    function ReaderPanelWithBoundary(props: any) {
      return h(ReaderErrorBoundary, null, h(ReaderPanel, props))
    }

    return {
      name: 'dsh-readpilot-client',
      inject: ['slots', 'layout', 'locale', 'connection', 'sessions', 'uiWorkspace'],
      foldTranscript,
      clampChatWidth,
      parseMarkdownBlocks,
      diffLines,
      NativeCompanion,
      READER_PALETTE_IDS,
      READER_PALETTES,
      resolveReaderPalette,
      findNoteOccurrence,
      apply(ctx: any) {
        runtime = ctx
        boundText = ctx.locale.bind(NS)
        ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'dsh-readpilot: dictionaries')
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
