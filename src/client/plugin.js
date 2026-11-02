import {
  CHAT_WIDTH_MAX,
  CHAT_WIDTH_MIN,
  READER_PALETTE_IDS,
  READER_PALETTES,
  blockIndexAtOffset,
  clampChatWidth,
  findNoteOccurrence,
  foldTranscript,
  messageOf,
  parseMarkdownBlocks,
  readPaletteId,
  resolveReaderPalette,
  savePaletteId,
} from './helpers.js'

import { zh, en } from './locale.js'
import { CSS } from './styles.js'
import { React, h, bindRuntime } from './runtime.js'
import { Toc } from './views/toc.js'
import { renderBlocks, selectionAnchor } from './views/markdown.js'
import { PanelIcon, Setup } from './views/panels.js'
import { Library } from './views/library-view.js'
import { NotesBody, SearchPanel } from './views/notes-search.js'
import { VisualReader } from './views/visual-reader.js'
import { ChatPanel } from './views/chat-panel.js'
import { Header } from './views/header.js'
import { NoteDialog, SelectionToolbar } from './views/selection-note.js'
import { createReaderErrorBoundary } from './views/error-boundary.js'
import { useCompanion } from './hooks/use-companion.js'
import { ChatBody, ChatCompose } from './views/chat-content.js'
import { useSearch } from './hooks/use-search.js'
import { useNotes } from './hooks/use-notes.js'
import { useVisual } from './hooks/use-visual.js'

export function createPlugin(require) {
    bindRuntime(require)
    const ReaderErrorBoundary = createReaderErrorBoundary()
    const NS = 'dshReader'


    const style = document.createElement('style')
    style.dataset.plugin = 'dsh-reader'
    style.dataset.pluginCss = 'dsh-reader/reader.css'
    style.textContent = CSS
    document.head.appendChild(style)

    let runtime
    let boundText = key => key

    async function call(endpoint, payload) {
      if (!runtime || !runtime.connection) throw new Error('连接服务不可用')
      let response
      try {
        response = await fetch('/api/dsh-reader', {
          method: 'POST',
          credentials: 'same-origin',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ endpoint, payload: payload ?? null }),
        })
      } catch (error) {
        throw new Error(`无法连接阅读器服务：${messageOf(error)}`)
      }
      let result
      try {
        result = await response.json()
      } catch {
        throw new Error(`阅读器服务返回了无效响应（HTTP ${response.status}）`)
      }
      if (!result || result.ok !== true) {
        throw new Error(result?.error?.message ?? `请求失败（HTTP ${response.status}）`)
      }
      return result.value
    }



    function ReaderPanel(props) {
      const t = props.t ?? boundText
      const [snapshot, setSnapshot] = React.useState(null)
      const [screen, setScreen] = React.useState({ kind: 'library' })
      const [error, setError] = React.useState('')
      const [busy, setBusy] = React.useState(false)
      const [tocOpen, setTocOpen] = React.useState(true)
      const [fontSize, setFontSize] = React.useState(17)
      const [selection, setSelection] = React.useState(null)
      const [paletteId, setPaletteId] = React.useState(readPaletteId)
      const palette = resolveReaderPalette(paletteId)
      const contentRef = React.useRef(null)
      const pendingScrollRef = React.useRef(null)

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

      const changePalette = React.useCallback(id => {
        if (!READER_PALETTES[id]) return
        setPaletteId(id)
        savePaletteId(id)
      }, [])

      const setBookTags = React.useCallback(async (book, tags) => {
        const result = await call('setBookTags', { bookId: book.id, tags })
        setSnapshot(previous => previous
          ? { ...previous, tags: { ...previous.tags, [book.id]: result.tags } }
          : previous)
        return result.tags
      }, [])

      React.useEffect(() => {
        void refresh()
      }, [refresh])

      const rememberSession = React.useCallback((bookId, sessionId) => {
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
      } = useCompanion({ runtime, call, t, screen, workspaceId, activeSessionId, rememberSession })

      const visualFor = React.useCallback((detail, item) => {
        if (!detail || !item) return null
        if (detail.book.format === 'pdf') {
          return { kind: 'pdf', page: Number.isInteger(item.page) ? item.page : 1, scale: 1.5 }
        }
        if (detail.book.format === 'epub' && typeof item.href === 'string' && item.href) {
          return { kind: 'epub', href: item.href }
        }
        return null
      }, [])

      const openBook = React.useCallback(async book => {
        setBusy(true)
        setError('')
        pendingScrollRef.current = null
        try {
          const detail = await call('open', { bookId: book.id })
          if (!detail.supported) {
            setScreen({ kind: 'unsupported', book: detail.book })
            return
          }
          const target = detail.toc.find(item => item.id === detail.progress?.chapterId) ?? detail.toc[0]
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

      const selectChapter = React.useCallback(async (bookId, chapterId, target) => {
        setSelection(null)
        setBusy(true)
        pendingScrollRef.current = null
        try {
          const content = await call('chapter', { bookId, chapterId })
          pendingScrollRef.current = target
            ? {
              chapterId: content.chapterId,
              blockIndex: Number.isInteger(target.blockIndex)
                ? target.blockIndex
                : blockIndexAtOffset(content.blocks, target.offset),
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
          void call('progress', { bookId, chapterId, chapterTitle: content.title }).catch(() => {})
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
        pageInput,
        setPageInput,
        visualLoading,
        visualError,
        epubReady,
        epubFrameRef,
        goPdfPage,
        zoomPdf,
        onPdfMouseUp,
        onEpubLoad,
        goEpubChapter,
      } = useVisual({ call, t, screen, palette, setSelection, selectChapter })

      const activeChapterId = screen.kind === 'book'
        ? (visual?.kind === 'pdf'
          ? screen.detail.toc.find(item => item.page === visual.page)?.id ?? screen.content.chapterId
          : screen.content.chapterId)
        : ''


      const scrollToBlock = React.useCallback(pending => {
        const container = contentRef.current
        if (!container || !Number.isInteger(pending.blockIndex)) return
        const target = container.querySelector(`[data-block-index="${pending.blockIndex}"]`)
        if (!target) return
        target.scrollIntoView({ block: 'center', behavior: 'smooth' })
        if (pending.flash) {
          target.classList.add('dsh-reader-flash')
          window.setTimeout(() => target.classList.remove('dsh-reader-flash'), 1500)
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
        notesLoading,
        notesError,
        noteDeletingId,
        noteEditor,
        noteDraft,
        setNoteDraft,
        noteSaving,
        noteError,
        noteInputRef,
        noteLayerRef,
        openNote,
        deleteNote,
        closeNoteEditor,
        openNoteEditor,
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
        contentRef,
        epubFrameRef,
        epubReady,
        selection,
        setSelection,
        selectChapter,
      })


      const backToLibrary = React.useCallback(() => {
        setScreen({ kind: 'library' })
        setSelection(null)
        setVisual(null)
        setPageView(null)
        setVisualError('')
        pendingScrollRef.current = null
        void refresh()
      }, [refresh])

      const configure = React.useCallback(async path => {
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

      const pickDirectory = React.useCallback(async setPath => {
        try {
          const directory = await runtime.uiWorkspace.pickDirectory()
          if (directory) setPath(directory)
        } catch (cause) {
          setError(messageOf(cause))
        }
      }, [])

      const prefill = React.useCallback(kind => {
        if (!selection || screen.kind !== 'book') return
        const question = {
          explain: t('explainPrompt'),
          summarize: t('summarizePrompt'),
          translate: t('translatePrompt'),
        }[kind]
        const quote = selection.text.split('\n').map(line => `> ${line}`).join('\n')
        setDraft(`我在读《${screen.detail.book.title}》的《${screen.content.title}》。\n\n${quote}\n\n${question}`)
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

      const notesBody = h(NotesBody, {
        t,
        notesError,
        notesLoading,
        notes,
        screen,
        openNote,
        noteDeletingId,
        deleteNote,
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
        chatBody,
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


      const visualReader = visual ? h(VisualReader, {
        t,
        visual,
        screen,
        pageView,
        pageInput,
        setPageInput,
        goPdfPage,
        zoomPdf,
        visualLoading,
        visualError,
        onPdfMouseUp,
        noteLayerRef,
        goEpubChapter,
        onEpubLoad,
        epubFrameRef,
      }) : null


      const bookView = screen.kind === 'book'
        ? h('div', {
          className: 'dsh-reader-book',
          'data-toc': tocOpen ? 'true' : 'false',
          'data-chat': chatOpen ? 'true' : 'false',
          style: { '--dsh-reader-chat-width': `${chatWidth}px` },
        },
        tocOpen ? h(Toc, {
          t,
          detail: screen.detail,
          activeChapter: screen.content.chapterId,
          onSelect: chapterId => void selectChapter(screen.detail.book.id, chapterId),
        }) : null,
        visualReader ?? h('div', {
          className: 'dsh-reader-reader',
          ref: contentRef,
          style: { fontSize },
          onMouseUp: onContentMouseUp,
        },
        h('div', { className: 'dsh-reader-reader-inner' },
          h('h1', { className: 'dsh-reader-chapter-title' }, screen.content.title),
          renderBlocks(screen.content.blocks, screen.content.chapterId),
          h('div', { className: 'dsh-reader-note-layer', ref: noteLayerRef }))),
        chatOpen
          ? h('button', {
            type: 'button',
            className: 'dsh-reader-chat-backdrop',
            'aria-label': t('closeChat'),
            onClick: () => setChatOpen(false),
          })
          : null,
        chatPanel)
        : null

      return h('div', {
        className: 'dsh-reader-panel',
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
          onFontDecrease: () => setFontSize(previous => Math.max(14, previous - 1)),
          onFontIncrease: () => setFontSize(previous => Math.min(24, previous + 1)),
        }),
        error ? h('div', { className: 'dsh-reader-error' }, error) : null,
        searchPanel,
        !snapshot
          ? h('div', { className: 'dsh-reader-muted' }, busy ? t('loading') : t('loadFailed'))
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
                ? h('div', { className: 'dsh-reader-empty' },
                  h('h2', null, screen.book.title),
                  h('p', null, t('unsupportedHint')),
                  h('button', {
                    type: 'button',
                    className: 'dsh-reader-secondary',
                    onClick: backToLibrary,
                  }, t('back')))
                : bookView,
        h(SelectionToolbar, {
          t,
          selection,
          prefill,
          onNote: () => openNoteEditor(),
        }),
        h(NoteDialog, {
          t,
          noteEditor,
          noteDraft,
          setNoteDraft,
          noteSaving,
          noteError,
          noteInputRef,
          activeBookId,
          deleteNote,
          closeNoteEditor,
          saveNote,
        }))
    }

    function ReaderPanelWithBoundary(props) {
      return h(ReaderErrorBoundary, null, h(ReaderPanel, props))
    }

    return {
      name: 'dsh-reader-client',
      inject: ['slots', 'layout', 'locale', 'connection', 'sessions', 'uiWorkspace'],
      foldTranscript,
      clampChatWidth,
      parseMarkdownBlocks,
      READER_PALETTE_IDS,
      READER_PALETTES,
      resolveReaderPalette,
      findNoteOccurrence,
      apply(ctx) {
        runtime = ctx
        boundText = ctx.locale.bind(NS)
        ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'dsh-reader: dictionaries')
        ctx.effect(
          () => ctx.slots.inject('sidebar.panellist', () => ctx.slots.register({
            name: 'sidebar.panellist',
            id: 'dsh-reader',
            order: 20,
            label: () => boundText('panel'),
            locale: NS,
          }, PanelIcon)),
          'dsh-reader: sidebar entry',
        )
        ctx.effect(
          () => ctx.slots.inject('main', () => ctx.slots.register({
            name: 'main',
            key: 'dsh-reader',
            locale: NS,
          }, ReaderPanelWithBoundary)),
          'dsh-reader: main panel',
        )
      },
    }
}
