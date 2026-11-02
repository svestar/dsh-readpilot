import {
  CHAT_WIDTH_DEFAULT,
  CHAT_WIDTH_MAX,
  CHAT_WIDTH_MIN,
  READER_PALETTE_IDS,
  READER_PALETTES,
  applyEpubNoteMarks,
  applyPaletteToFrame,
  blockIndexAtOffset,
  clampChatWidth,
  findNoteOccurrence,
  foldTranscript,
  messageOf,
  parseMarkdownBlocks,
  readChatWidth,
  readPaletteId,
  resolveReaderPalette,
  saveChatWidth,
  savePaletteId,
} from './helpers.js'

import { zh, en } from './locale.js'
import { CSS } from './styles.js'
import { React, h, bindRuntime } from './runtime.js'
import { Toc } from './views/toc.js'
import { MarkdownMessage, renderBlocks, selectionAnchor } from './views/markdown.js'
import { Library, PanelIcon, Setup } from './views/panels.js'

export function createPlugin(require) {
    bindRuntime(require)
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
      const [chatOpen, setChatOpen] = React.useState(() => (typeof window !== 'undefined' ? window.innerWidth > 1100 : true))
      const [chatWidth, setChatWidth] = React.useState(readChatWidth)
      const [draft, setDraft] = React.useState('')
      const [sending, setSending] = React.useState(false)
      const [chatError, setChatError] = React.useState('')
      const [entries, setEntries] = React.useState([])
      const [hasMore, setHasMore] = React.useState(false)
      const [loadingEarlier, setLoadingEarlier] = React.useState(false)
      const [chatBinding, setChatBinding] = React.useState(null)
      const [chatTab, setChatTab] = React.useState('chat')
      const [notes, setNotes] = React.useState([])
      const [notesLoading, setNotesLoading] = React.useState(false)
      const [notesError, setNotesError] = React.useState('')
      const [noteDeletingId, setNoteDeletingId] = React.useState(null)
      const [noteEditor, setNoteEditor] = React.useState(null)
      const [noteDraft, setNoteDraft] = React.useState('')
      const [noteSaving, setNoteSaving] = React.useState(false)
      const [noteError, setNoteError] = React.useState('')
      const [searchOpen, setSearchOpen] = React.useState(false)
      const [searchQuery, setSearchQuery] = React.useState('')
      const [searchBusy, setSearchBusy] = React.useState(false)
      const [searchResults, setSearchResults] = React.useState(null)
      const [searchError, setSearchError] = React.useState('')
      const [visual, setVisual] = React.useState(null)
      const [pageView, setPageView] = React.useState(null)
      const [pageInput, setPageInput] = React.useState('1')
      const [visualLoading, setVisualLoading] = React.useState(false)
      const [visualError, setVisualError] = React.useState('')
      const [epubReady, setEpubReady] = React.useState(0)
      const [epubJumpToken, setEpubJumpToken] = React.useState(0)
      const [paletteId, setPaletteId] = React.useState(readPaletteId)
      const palette = resolveReaderPalette(paletteId)
      const chatRef = React.useRef(null)
      const chatBodyRef = React.useRef(null)
      const chatInputRef = React.useRef(null)
      const noteInputRef = React.useRef(null)
      const searchInputRef = React.useRef(null)
      const dragRef = React.useRef(null)
      const chatWidthRef = React.useRef(chatWidth)
      chatWidthRef.current = chatWidth
      const contentRef = React.useRef(null)
      const noteLayerRef = React.useRef(null)
      const epubNoteCleanupRef = React.useRef(null)
      const pendingEpubNoteRef = React.useRef(null)
      const epubFrameRef = React.useRef(null)
      const epubCleanupRef = React.useRef(null)
      const pendingScrollRef = React.useRef(null)
      const notesRequestRef = React.useRef(0)

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
      const activeChapterId = screen.kind === 'book'
        ? (visual?.kind === 'pdf'
          ? screen.detail.toc.find(item => item.page === visual.page)?.id ?? screen.content.chapterId
          : screen.content.chapterId)
        : ''
      const activeSessionId = activeBookId && snapshot
        ? snapshot.sessions?.[activeBookId]?.sessionId ?? null
        : null
      const workspaceId = snapshot?.settings?.workspaceId ?? null

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

      const loadNotes = React.useCallback(async () => {
        const bookId = activeBookId
        if (!bookId) {
          setNotes([])
          return
        }
        const request = notesRequestRef.current + 1
        notesRequestRef.current = request
        setNotesLoading(true)
        setNotesError('')
        try {
          const value = await call('notes', { action: 'list', bookId })
          if (notesRequestRef.current !== request) return
          const list = Array.isArray(value?.notes) ? value.notes.slice() : []
          list.sort((left, right) => timestampOf(right.createdAt) - timestampOf(left.createdAt))
          setNotes(list)
        } catch (cause) {
          if (notesRequestRef.current === request) {
            setNotesError(`${t('notesFailed')}：${messageOf(cause)}`)
          }
        } finally {
          if (notesRequestRef.current === request) setNotesLoading(false)
        }
      }, [activeBookId, t])

      React.useEffect(() => {
        notesRequestRef.current += 1
        setNotes([])
        setNotesLoading(false)
        setNotesError('')
        setNoteDeletingId(null)
        setNoteEditor(null)
        setNoteDraft('')
        setNoteError('')
        setSearchOpen(false)
        setSearchQuery('')
        setSearchBusy(false)
        setSearchResults(null)
        setSearchError('')
      }, [activeBookId])

      React.useEffect(() => {
        if (screen.kind !== 'book') return
        void loadNotes()
      }, [screen.kind, activeBookId, loadNotes])

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

      React.useEffect(() => {
        if (!visual || visual.kind !== 'pdf' || screen.kind !== 'book') {
          setPageView(null)
          return
        }
        let cancelled = false
        setVisualLoading(true)
        setVisualError('')
        call('pageView', {
          bookId: screen.detail.book.id,
          page: visual.page,
          scale: visual.scale,
        }).then(value => {
          if (cancelled) return
          setPageView(value)
          setPageInput(String(visual.page))
        }).catch(cause => {
          if (cancelled) return
          setPageView(null)
          setVisualError(`${t('loadFailed')}：${messageOf(cause)}`)
        }).finally(() => {
          if (!cancelled) setVisualLoading(false)
        })
        return () => { cancelled = true }
      }, [visual, screen, t])

      React.useEffect(() => {
        if (screen.kind !== 'book' || visual?.kind !== 'pdf' || !pageView) return
        if (!activeChapterId || activeChapterId === screen.content.chapterId) return
        void selectChapter(screen.detail.book.id, activeChapterId)
      }, [activeChapterId, pageView, screen, selectChapter])

      React.useEffect(() => () => {
        epubCleanupRef.current?.()
        epubCleanupRef.current = null
      }, [visual?.href])

      const goPdfPage = React.useCallback(next => {
        const pageCount = pageView?.pageCount ?? 1
        const page = Math.min(Math.max(1, next), pageCount)
        setVisual(previous => previous?.kind === 'pdf' ? { ...previous, page } : previous)
      }, [pageView])

      const zoomPdf = React.useCallback(delta => {
        setVisual(previous => previous?.kind === 'pdf'
          ? { ...previous, scale: Math.min(3, Math.max(1, previous.scale + delta)) }
          : previous)
      }, [])

      const onPdfMouseUp = React.useCallback(() => {
        const active = window.getSelection()
        if (!active || active.isCollapsed || active.rangeCount === 0) return
        const range = active.getRangeAt(0)
        const node = range.startContainer.nodeType === 1
          ? range.startContainer
          : range.startContainer.parentElement
        const span = node?.closest?.('[data-offset]')
        if (!span) return
        const text = active.toString().trim()
        if (!text) return
        const base = Number(span.getAttribute('data-offset')) || 0
        const before = range.cloneRange()
        before.selectNodeContents(span)
        before.setEnd(range.startContainer, range.startOffset)
        const rect = range.getBoundingClientRect()
        setSelection({
          text: text.slice(0, 2000),
          blockIndex: 0,
          offset: base + before.toString().length,
          x: Math.min(Math.max(rect.left + rect.width / 2, 120), window.innerWidth - 120),
          y: rect.top,
        })
      }, [])

      const onEpubLoad = React.useCallback(event => {
        const frame = event.currentTarget
        const doc = frame.contentDocument
        epubCleanupRef.current?.()
        epubCleanupRef.current = null
        if (!doc) return
        applyPaletteToFrame(frame, palette)
        setEpubReady(previous => previous + 1)
        const handler = () => {
          const selected = doc.getSelection()
          const text = selected?.toString().trim()
          if (!text || !selected.rangeCount) return
          const range = selected.getRangeAt(0)
          const rect = range.getBoundingClientRect()
          const frameRect = frame.getBoundingClientRect()
          setSelection({
            text: text.slice(0, 2000),
            blockIndex: 0,
            offset: 0,
            x: Math.min(Math.max(frameRect.left + rect.left + rect.width / 2, 120), window.innerWidth - 120),
            y: frameRect.top + rect.top,
          })
        }
        doc.addEventListener('mouseup', handler)
        epubCleanupRef.current = () => doc.removeEventListener('mouseup', handler)
      }, [palette])

      React.useEffect(() => {
        if (visual?.kind === 'epub' && epubFrameRef.current) {
          applyPaletteToFrame(epubFrameRef.current, palette)
        }
      }, [palette, visual?.href])

      const goEpubChapter = React.useCallback(delta => {
        if (screen.kind !== 'book') return
        const index = screen.detail.toc.findIndex(item => item.id === screen.content.chapterId)
        const next = screen.detail.toc[index + delta]
        if (next) void selectChapter(screen.detail.book.id, next.id)
      }, [screen, selectChapter])

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
      }, [screen, searchBusy, searchQuery, t])

      const toggleSearch = React.useCallback(() => {
        setSearchOpen(previous => !previous)
        setSearchError('')
      }, [])

      React.useEffect(() => {
        if (!searchOpen) return
        const frame = requestAnimationFrame(() => searchInputRef.current?.focus())
        return () => cancelAnimationFrame(frame)
      }, [searchOpen])

      const openNote = React.useCallback(note => {
        if (!note || screen.kind !== 'book') return
        setNoteEditor(null)
        if (screen.detail.book.format === 'epub') {
          pendingEpubNoteRef.current = note.id
          setEpubJumpToken(previous => previous + 1)
          if (screen.content.chapterId === note.chapterId) return
        }
        void selectChapter(screen.detail.book.id, note.chapterId, {
          blockIndex: note.blockIndex,
          flash: true,
        })
      }, [screen, selectChapter])

      const deleteNote = React.useCallback(async note => {
        if (!note?.id || noteDeletingId) return
        setNoteDeletingId(note.id)
        setNotesError('')
        try {
          await call('notes', {
            action: 'delete',
            bookId: note.bookId ?? activeBookId,
            noteId: note.id,
          })
        } catch (cause) {
          setNotesError(`${t('noteDeleteFailed')}：${messageOf(cause)}`)
          setNoteDeletingId(null)
          return
        }
        setNoteDeletingId(null)
        await loadNotes()
      }, [activeBookId, loadNotes, noteDeletingId, t])

      const closeNoteEditor = React.useCallback(() => {
        setNoteEditor(null)
        setNoteDraft('')
        setNoteError('')
      }, [])

      const openNoteEditor = React.useCallback(note => {
        if (note) {
          setNoteEditor({
            noteId: note.id,
            chapterId: note.chapterId,
            blockIndex: note.blockIndex,
            offset: note.offset,
            quote: note.quote,
          })
          setNoteDraft(note.note ?? '')
          setNoteError('')
          setSelection(null)
          requestAnimationFrame(() => noteInputRef.current?.focus())
          return
        }
        if (!selection || selection.blockIndex == null || screen.kind !== 'book') return
        setNoteEditor({
          chapterId: activeChapterId,
          blockIndex: selection.blockIndex,
          offset: selection.offset,
          quote: selection.text,
        })
        setNoteDraft('')
        setNoteError('')
        setSelection(null)
        requestAnimationFrame(() => noteInputRef.current?.focus())
      }, [activeChapterId, selection, screen])

      const saveNote = React.useCallback(async () => {
        const editor = noteEditor
        const text = noteDraft.trim()
        if (!editor || !text || noteSaving || screen.kind !== 'book') return
        setNoteSaving(true)
        setNoteError('')
        try {
          if (editor.noteId) {
            await call('notes', {
              action: 'update',
              bookId: screen.detail.book.id,
              noteId: editor.noteId,
              note: text,
            })
          } else {
            await call('notes', {
              action: 'add',
              bookId: screen.detail.book.id,
              chapterId: editor.chapterId,
              blockIndex: editor.blockIndex,
              offset: editor.offset,
              quote: editor.quote,
              note: text,
            })
          }
        } catch (cause) {
          setNoteError(`${t('noteSaveFailed')}：${messageOf(cause)}`)
          setNoteSaving(false)
          return
        }
        setNoteSaving(false)
        setNoteEditor(null)
        setNoteDraft('')
        void loadNotes()
      }, [noteEditor, noteDraft, noteSaving, screen, loadNotes, t])

      React.useEffect(() => {
        const layer = noteLayerRef.current
        if (!layer) return
        const root = visual?.kind === 'pdf'
          ? layer.parentElement
          : contentRef.current?.querySelector('.dsh-reader-reader-inner')
        const currentChapter = activeChapterId
        const relevant = screen.kind === 'book'
          ? notes.filter(note => note.chapterId === currentChapter && typeof note.quote === 'string' && note.quote)
          : []
        layer.textContent = ''
        if (!root || relevant.length === 0) return

        let frame = 0
        const paint = () => {
          frame = 0
          layer.textContent = ''
          if (!root.isConnected) return
          const { text } = collectTextNodes(root)
          const rootRect = root.getBoundingClientRect()
          for (const note of relevant) {
            const match = findNoteOccurrence(text, note.quote, note.offset)
            if (!match) continue
            const range = rangeForNote(root, match.start, match.end)
            if (!range) continue
            for (const rect of range.getClientRects()) {
              if (!rect.width || !rect.height) continue
              const hit = document.createElement('div')
              hit.className = 'dsh-reader-note-hit'
              hit.dataset.noteId = note.id
              hit.style.left = `${rect.left - rootRect.left}px`
              hit.style.top = `${rect.top - rootRect.top}px`
              hit.style.width = `${rect.width}px`
              hit.style.height = `${rect.height}px`
              layer.appendChild(hit)
            }
          }
        }
        const schedule = () => {
          if (!frame) frame = requestAnimationFrame(paint)
        }
        const onClick = event => {
          const hit = event.target.closest?.('.dsh-reader-note-hit')
          if (!hit) return
          const note = notes.find(entry => entry.id === hit.dataset.noteId)
          if (note) openNoteEditor(note)
        }
        layer.addEventListener('click', onClick)
        window.addEventListener('resize', schedule)
        paint()
        return () => {
          if (frame) cancelAnimationFrame(frame)
          layer.removeEventListener('click', onClick)
          window.removeEventListener('resize', schedule)
          layer.textContent = ''
        }
      }, [activeChapterId, screen, notes, visual?.kind, visual?.page, pageView, fontSize, palette, openNoteEditor])

      React.useEffect(() => {
        if (visual?.kind !== 'epub' || screen.kind !== 'book' || !epubFrameRef.current) return
        const result = applyEpubNoteMarks(
          epubFrameRef.current,
          notes,
          screen.content.chapterId,
          palette,
          openNoteEditor,
          pendingEpubNoteRef.current,
        )
        if (result.jumped) pendingEpubNoteRef.current = null
        return result.cleanup
      }, [visual?.kind, visual?.href, notes, palette, epubReady, epubJumpToken, openNoteEditor, screen])

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

      const disposeChat = React.useCallback(() => {
        const current = chatRef.current
        chatRef.current = null
        if (!current) return
        try {
          current.unsubscribe()
        } catch {
          // The event source may already be disposed with its session.
        }
        try {
          current.reference.release()
        } catch {
          // The session may already be gone.
        }
      }, [])

      const releaseChat = React.useCallback(() => {
        disposeChat()
        setChatBinding(null)
        setEntries([])
        setHasMore(false)
      }, [disposeChat])

      const bindSession = React.useCallback(sessionId => {
        if (!sessionId) {
          releaseChat()
          return null
        }
        if (chatRef.current?.sessionId === sessionId) return chatRef.current.reference
        releaseChat()
        setChatError('')
        let reference
        try {
          reference = runtime.sessions.retain(sessionId, { source: 'controllerOperation' })
        } catch (error) {
          setChatError(`${t('loadFailed')}：${messageOf(error)}`)
          return null
        }
        const source = reference.binding.eventSource
        const update = () => {
          const value = source.getSnapshot()
          setEntries(value.entries)
          setHasMore(value.hasMore)
        }
        update()
        const unsubscribe = source.subscribe(update)
        const record = { sessionId, reference, unsubscribe }
        chatRef.current = record
        setChatBinding(record)
        reference.ready.catch(error => {
          if (chatRef.current === record) {
            setChatError(`${t('loadFailed')}：${messageOf(error)}`)
          }
        })
        return reference
      }, [releaseChat, t])

      React.useEffect(() => {
        if (!activeSessionId) {
          releaseChat()
          return
        }
        bindSession(activeSessionId)
      }, [activeSessionId, bindSession, releaseChat])

      React.useEffect(() => () => disposeChat(), [disposeChat])

      const lastEntrySeq = entries.length > 0 ? entries[entries.length - 1]?.event?.seq ?? null : null

      React.useEffect(() => {
        const element = chatBodyRef.current
        if (element) element.scrollTop = element.scrollHeight
      }, [lastEntrySeq, sending, chatBinding, chatOpen, chatTab])

      const sessionSnapshot = React.useSyncExternalStore(
        React.useCallback(callback => {
          const reference = chatBinding?.reference
          return reference ? reference.binding.session.subscribe(callback) : () => {}
        }, [chatBinding]),
        React.useCallback(() => chatBinding?.reference?.binding.session.getSnapshot() ?? null, [chatBinding]),
      )
      const running = Boolean(sessionSnapshot?.running)
      const messages = React.useMemo(() => foldTranscript(entries).slice(-50), [entries])

      const send = React.useCallback(async () => {
        const text = draft.trim()
        if (!text || sending || screen.kind !== 'book') return
        if (!workspaceId) {
          setChatError(t('chatDisabled'))
          return
        }
        const book = screen.detail.book
        setChatError('')
        setSending(true)

        const createSession = async () => {
          let sessionId
          if (typeof runtime.sessions.create === 'function') {
            try {
              sessionId = await runtime.sessions.create({ workspaceId })
            } catch {
              sessionId = undefined
            }
          }
          if (!sessionId) {
            sessionId = await runtime.uiWorkspace.connectWorkspace(workspaceId)
            runtime.layout.selectPanel('dsh-reader')
          }
          await call('session', { bookId: book.id, sessionId })
          rememberSession(book.id, sessionId)
          const reference = bindSession(sessionId)
          if (!reference) throw new Error(t('loadFailed'))
          return reference
        }

        try {
          let reference = chatRef.current?.reference
          if (!reference) reference = await createSession()
          try {
            await reference.ready
          } catch {
            await call('session', { bookId: book.id, sessionId: null }).catch(() => {})
            releaseChat()
            reference = await createSession()
            await reference.ready
          }
          const result = await reference.binding.session.prompt([{ type: 'text', text }], 'queue')
          if (result && result.ok === false) {
            throw new Error(result.error?.message ?? t('sendFailed'))
          }
          setDraft('')
        } catch (error) {
          setChatError(`${t('sendFailed')}：${messageOf(error)}`)
        } finally {
          setSending(false)
        }
      }, [draft, sending, screen, workspaceId, rememberSession, bindSession, releaseChat, t])

      const loadEarlier = React.useCallback(async () => {
        const reference = chatRef.current?.reference
        if (!reference || loadingEarlier) return
        setLoadingEarlier(true)
        setChatError('')
        try {
          await reference.binding.session.loadOlder()
        } catch (error) {
          setChatError(`${t('loadFailed')}：${messageOf(error)}`)
        } finally {
          setLoadingEarlier(false)
        }
      }, [loadingEarlier, t])

      React.useEffect(() => {
        const onResize = () => {
          if (window.innerWidth > 1100) {
            setChatWidth(current => clampChatWidth(current, window.innerWidth))
          }
        }
        window.addEventListener('resize', onResize)
        return () => window.removeEventListener('resize', onResize)
      }, [])

      const startResize = React.useCallback(event => {
        if (event.button !== 0) return
        event.preventDefault()
        try {
          event.currentTarget.setPointerCapture(event.pointerId)
        } catch {
          // Pointer capture is an optimization; dragging still works without it.
        }
        dragRef.current = { startX: event.clientX, startWidth: chatWidth }
      }, [chatWidth])

      const moveResize = React.useCallback(event => {
        const drag = dragRef.current
        if (!drag) return
        const next = clampChatWidth(drag.startWidth - (event.clientX - drag.startX), window.innerWidth)
        setChatWidth(next)
      }, [])

      const endResize = React.useCallback(event => {
        if (!dragRef.current) return
        dragRef.current = null
        try {
          event.currentTarget.releasePointerCapture(event.pointerId)
        } catch {
          // The pointer may already be released.
        }
        saveChatWidth(chatWidthRef.current)
      }, [])

      const resetResize = React.useCallback(() => {
        setChatWidth(CHAT_WIDTH_DEFAULT)
        saveChatWidth(CHAT_WIDTH_DEFAULT)
      }, [])

      const resizeKeyDown = React.useCallback(event => {
        if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return
        event.preventDefault()
        const delta = event.key === 'ArrowLeft' ? 24 : -24
        const next = clampChatWidth(chatWidthRef.current + delta, window.innerWidth)
        setChatWidth(next)
        saveChatWidth(next)
      }, [])

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

      const chatBody = h('div', { className: 'dsh-reader-chat-body', ref: chatBodyRef },
        hasMore
          ? h('button', {
            type: 'button',
            className: 'dsh-reader-chat-more',
            disabled: loadingEarlier,
            onClick: () => void loadEarlier(),
          }, loadingEarlier ? t('loading') : t('loadEarlier'))
          : null,
        messages.length === 0
          ? h('div', { className: 'dsh-reader-chat-empty' },
            workspaceId ? t('chatEmpty') : t('chatDisabled'))
          : messages.map(message => h('div', {
            key: message.key,
            className: 'dsh-reader-msg',
            'data-role': message.role,
          },
          h('div', { className: 'dsh-reader-msg-role' },
            message.role === 'user' ? t('you') : t('assistant')),
          message.role === 'assistant'
            ? h(MarkdownMessage, { text: message.text, prefix: message.key })
            : h('div', { className: 'dsh-reader-msg-text' }, message.text))),
        sending || running
          ? h('div', { className: 'dsh-reader-chat-thinking' },
            sending ? t('sending') : t('thinking'))
          : null)

      const chatCompose = h('div', { className: 'dsh-reader-chat-compose' },
        h('textarea', {
          ref: chatInputRef,
          value: draft,
          rows: 3,
          placeholder: workspaceId ? t('chatPlaceholder') : t('chatDisabled'),
          disabled: !workspaceId,
          onChange: event => setDraft(event.target.value),
          onKeyDown: event => {
            if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
              event.preventDefault()
              void send()
            }
          },
        }),
        h('div', { className: 'dsh-reader-chat-compose-row' },
          h('span', { className: 'dsh-reader-chat-hint' }, workspaceId ? 'Enter / Shift+Enter' : ''),
          h('button', {
            type: 'button',
            className: 'dsh-reader-chat-send',
            disabled: !draft.trim() || sending || !workspaceId,
            onClick: () => void send(),
          }, sending ? t('sending') : t('send'))))

      const notesBody = h('div', { className: 'dsh-reader-notes' },
        notesError ? h('div', { className: 'dsh-reader-chat-error' }, notesError) : null,
        notesLoading && notes.length === 0
          ? h('div', { className: 'dsh-reader-chat-empty' }, t('loading'))
          : notes.length === 0
            ? notesError ? null : h('div', { className: 'dsh-reader-chat-empty' }, t('noteEmpty'))
            : notes.map(note => {
              const chapterTitle = screen.kind === 'book'
                ? screen.detail.toc.find(item => item.id === note.chapterId)?.title
                : ''
              return h('div', { key: note.id, className: 'dsh-reader-note' },
                h('button', {
                  type: 'button',
                  className: 'dsh-reader-note-main',
                  onClick: () => openNote(note),
                },
                h('div', { className: 'dsh-reader-note-chapter' }, chapterTitle || t('reading')),
                note.quote ? h('div', { className: 'dsh-reader-note-quote' }, note.quote) : null,
                h('div', { className: 'dsh-reader-note-body' }, note.note)),
                h('button', {
                  type: 'button',
                  className: 'dsh-reader-note-jump',
                  title: t('jump'),
                  onClick: () => openNote(note),
                }, t('jump')),
                h('button', {
                  type: 'button',
                  className: 'dsh-reader-note-delete',
                  disabled: noteDeletingId === note.id,
                  onClick: () => void deleteNote(note),
                }, noteDeletingId === note.id ? t('loading') : t('delete')))
            }))

      const searchPanel = searchOpen && screen.kind === 'book'
        ? h('div', { className: 'dsh-reader-search' },
          h('div', { className: 'dsh-reader-search-bar' },
            h('input', {
              ref: searchInputRef,
              value: searchQuery,
              placeholder: t('searchPlaceholder'),
              spellCheck: false,
              onChange: event => setSearchQuery(event.target.value),
              onKeyDown: event => {
                if (event.key === 'Enter' && !event.nativeEvent.isComposing) {
                  event.preventDefault()
                  void runSearch()
                }
              },
            }),
            h('button', {
              type: 'button',
              className: 'dsh-reader-primary',
              disabled: searchBusy || !searchQuery.trim(),
              onClick: () => void runSearch(),
            }, searchBusy ? t('searching') : t('search')),
            h('button', {
              type: 'button',
              className: 'dsh-reader-icon-btn',
              title: t('closeSearch'),
              'aria-label': t('closeSearch'),
              onClick: () => setSearchOpen(false),
            }, '×')),
          searchError
            ? h('div', { className: 'dsh-reader-search-hint', 'data-error': 'true' }, searchError)
            : searchBusy
              ? h('div', { className: 'dsh-reader-search-hint' }, t('searching'))
              : searchResults === null
                ? null
                : searchResults.matches.length === 0
                  ? h('div', { className: 'dsh-reader-search-hint' }, t('searchEmpty'))
                  : h('div', { className: 'dsh-reader-search-list' },
                    searchResults.matches.map((match, index) => h('button', {
                      key: `${match.chapterId}:${match.offset}:${index}`,
                      type: 'button',
                      className: 'dsh-reader-search-result',
                      onClick: () => openSearchMatch(match),
                    },
                    h('div', { className: 'dsh-reader-search-chapter' }, match.chapterTitle),
                    h('div', { className: 'dsh-reader-search-snippet' }, match.snippet))),
                    searchResults.truncated
                      ? h('div', { className: 'dsh-reader-search-hint' }, t('searchTruncated'))
                      : null))
        : null

      const chatPanel = chatOpen
        ? h('aside', { className: 'dsh-reader-chat' },
          h('div', {
            key: 'resizer',
            className: 'dsh-reader-chat-resizer',
            role: 'separator',
            'aria-orientation': 'vertical',
            'aria-label': t('resizeChat'),
            'aria-valuemin': CHAT_WIDTH_MIN,
            'aria-valuemax': CHAT_WIDTH_MAX,
            'aria-valuenow': chatWidth,
            tabIndex: 0,
            onPointerDown: startResize,
            onPointerMove: moveResize,
            onPointerUp: endResize,
            onPointerCancel: endResize,
            onDoubleClick: resetResize,
            onKeyDown: resizeKeyDown,
          }),
          h('div', { className: 'dsh-reader-chat-head' },
            h('div', { className: 'dsh-reader-chat-tabs', role: 'tablist' },
              h('button', {
                type: 'button',
                role: 'tab',
                className: 'dsh-reader-chat-tab',
                'data-active': chatTab === 'chat' ? 'true' : 'false',
                'aria-selected': chatTab === 'chat',
                onClick: () => setChatTab('chat'),
              }, t('companion')),
              h('button', {
                type: 'button',
                role: 'tab',
                className: 'dsh-reader-chat-tab',
                'data-active': chatTab === 'notes' ? 'true' : 'false',
                'aria-selected': chatTab === 'notes',
                onClick: () => setChatTab('notes'),
              }, t('notes'))),
            h('button', {
              type: 'button',
              className: 'dsh-reader-chat-close',
              onClick: () => setChatOpen(false),
            }, t('closeChat'))),
          chatTab === 'notes'
            ? notesBody
            : chatBody,
          chatTab === 'chat' && chatError
            ? h('div', { className: 'dsh-reader-chat-error' }, chatError)
            : null,
          chatTab === 'chat' ? chatCompose : null)
        : null

      const pdfPageUrl = visual?.kind === 'pdf' && screen.kind === 'book'
        ? `/api/dsh-reader/pdf-page?bookId=${encodeURIComponent(screen.detail.book.id)}&page=${visual.page}&scale=${visual.scale}`
        : ''
      const epubIndex = screen.kind === 'book'
        ? screen.detail.toc.findIndex(item => item.id === screen.content.chapterId)
        : -1
      const visualReader = visual?.kind === 'pdf'
        ? h('div', { className: 'dsh-reader-visual' },
          h('div', { className: 'dsh-reader-visual-bar' },
            h('button', {
              type: 'button',
              className: 'dsh-reader-secondary',
              disabled: visual.page <= 1,
              onClick: () => goPdfPage(visual.page - 1),
            }, '‹'),
            h('input', {
              className: 'dsh-reader-page-input',
              type: 'number',
              min: 1,
              max: pageView?.pageCount ?? 1,
              value: pageInput,
              onChange: event => setPageInput(event.target.value),
              onKeyDown: event => {
                if (event.key === 'Enter') goPdfPage(Number(pageInput))
              },
            }),
            h('span', { className: 'dsh-reader-page-total' }, `/ ${pageView?.pageCount ?? '?'}`),
            h('button', {
              type: 'button',
              className: 'dsh-reader-secondary',
              disabled: Boolean(pageView && visual.page >= pageView.pageCount),
              onClick: () => goPdfPage(visual.page + 1),
            }, '›'),
            h('button', { type: 'button', className: 'dsh-reader-secondary', onClick: () => zoomPdf(-0.25) }, '−'),
            h('span', { className: 'dsh-reader-page-total' }, `${Math.round(visual.scale * 100)}%`),
            h('button', { type: 'button', className: 'dsh-reader-secondary', onClick: () => zoomPdf(0.25) }, '+')),
          visualLoading
            ? h('div', { className: 'dsh-reader-muted' }, t('loading'))
            : visualError
              ? h('div', { className: 'dsh-reader-visual-error' },
                h('div', null, visualError),
                h('div', { className: 'dsh-reader-reader-inner' },
                  renderBlocks(screen.content.blocks, screen.content.chapterId)))
              : pageView
                ? h('div', {
                  className: 'dsh-reader-pdf-page',
                  style: { width: pageView.width, height: pageView.height },
                },
                h('img', { src: pdfPageUrl, alt: screen.content.title, draggable: false }),
                h('div', { className: 'dsh-reader-pdf-text', onMouseUp: onPdfMouseUp },
                  (pageView.textItems ?? []).map((item, index) => {
                    const offset = (pageView.textItems ?? [])
                      .slice(0, index)
                      .reduce((sum, entry) => sum + entry.text.length, 0)
                    return h('span', {
                      key: `pdf-text-${index}`,
                      className: 'dsh-reader-pdf-text-item',
                      'data-offset': offset,
                      style: {
                        left: item.left,
                        top: item.top,
                        width: item.width,
                        height: item.height,
                        fontSize: item.fontSize,
                      },
                    }, item.text)
                  })),
                h('div', { className: 'dsh-reader-note-layer', ref: noteLayerRef }))
                : null)
        : visual?.kind === 'epub'
          ? h('div', { className: 'dsh-reader-visual' },
            h('div', { className: 'dsh-reader-visual-bar' },
              h('button', {
                type: 'button',
                className: 'dsh-reader-secondary',
                disabled: epubIndex <= 0,
                onClick: () => goEpubChapter(-1),
              }, '‹'),
              h('span', { className: 'dsh-reader-page-total' }, screen.content.title),
              h('button', {
                type: 'button',
                className: 'dsh-reader-secondary',
                disabled: epubIndex < 0 || epubIndex >= screen.detail.toc.length - 1,
                onClick: () => goEpubChapter(1),
              }, '›')),
            h('iframe', {
              ref: epubFrameRef,
              className: 'dsh-reader-epub-frame',
              sandbox: 'allow-same-origin',
              title: screen.content.title,
              src: `/api/dsh-reader/epub-doc?bookId=${encodeURIComponent(screen.detail.book.id)}&href=${encodeURIComponent(visual.href)}`,
              onLoad: onEpubLoad,
            }))
          : null

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
        h('div', { className: 'dsh-reader-header' },
          h('div', { className: 'dsh-reader-header-main' },
            screen.kind !== 'library'
              ? h('button', {
                type: 'button',
                className: 'dsh-reader-icon-btn',
                title: t('back'),
                onClick: backToLibrary,
              }, '←')
              : null,
            h('div', { style: { minWidth: 0 } },
              h('div', { className: 'dsh-reader-title' }, headerTitle),
              headerSubtitle ? h('div', { className: 'dsh-reader-subtitle' }, headerSubtitle) : null)),
          h('div', { className: 'dsh-reader-header-actions' },
            screen.kind === 'book'
              ? h('select', {
                className: 'dsh-reader-palette-select',
                value: paletteId,
                title: t('palette'),
                'aria-label': t('palette'),
                onChange: event => changePalette(event.target.value),
              }, READER_PALETTE_IDS.map(id => h('option', { key: id, value: id },
                t(`palette${id[0].toUpperCase()}${id.slice(1)}`))))
              : null,
            screen.kind === 'book'
              ? h('button', {
                type: 'button',
                className: 'dsh-reader-icon-btn',
                title: t('search'),
                'aria-expanded': searchOpen ? 'true' : 'false',
                onClick: toggleSearch,
              }, t('search'))
              : null,
            screen.kind === 'book'
              ? h('button', {
                type: 'button',
                className: 'dsh-reader-icon-btn',
                title: t('companion'),
                onClick: () => setChatOpen(previous => !previous),
              }, t('companion'))
              : null,
            screen.kind === 'book'
              ? h('button', {
                type: 'button',
                className: 'dsh-reader-icon-btn',
                title: t('toc'),
                onClick: () => setTocOpen(previous => !previous),
              }, '☰')
              : null,
            screen.kind === 'book'
              ? h('button', {
                type: 'button',
                className: 'dsh-reader-icon-btn',
                title: t('fontSize'),
                onClick: () => setFontSize(previous => Math.max(14, previous - 1)),
              }, 'A-')
              : null,
            screen.kind === 'book'
              ? h('button', {
                type: 'button',
                className: 'dsh-reader-icon-btn',
                title: t('fontSize'),
                onClick: () => setFontSize(previous => Math.min(24, previous + 1)),
              }, 'A+')
              : null)),
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
        selection
          ? h('div', {
            className: 'dsh-reader-selection',
            style: { left: selection.x, top: Math.max(8, selection.y - 48) },
            onMouseDown: event => event.preventDefault(),
          },
          h('button', { type: 'button', onClick: () => prefill('explain') }, t('explain')),
          h('button', { type: 'button', onClick: () => prefill('summarize') }, t('summarize')),
          h('button', { type: 'button', onClick: () => prefill('translate') }, t('translate')),
          selection.blockIndex == null
            ? null
            : h('button', { type: 'button', onClick: () => openNoteEditor() }, t('noteAction')))
          : null,
        noteEditor
          ? h('div', {
            className: 'dsh-reader-note-overlay',
            onMouseDown: event => {
              if (event.target === event.currentTarget) closeNoteEditor()
            },
          },
          h('div', {
            className: 'dsh-reader-note-dialog',
            role: 'dialog',
            'aria-modal': 'true',
            'aria-label': noteEditor.noteId ? t('noteEditTitle') : t('noteDialogTitle'),
          },
          h('h3', null, noteEditor.noteId ? t('noteEditTitle') : t('noteDialogTitle')),
          h('div', { className: 'dsh-reader-note-dialog-quote' }, noteEditor.quote),
          h('textarea', {
            ref: noteInputRef,
            value: noteDraft,
            rows: 4,
            placeholder: t('notePlaceholder'),
            disabled: noteSaving,
            onChange: event => setNoteDraft(event.target.value),
          }),
          noteError ? h('div', { className: 'dsh-reader-note-dialog-error' }, noteError) : null,
          h('div', { className: 'dsh-reader-note-dialog-actions' },
            noteEditor.noteId
              ? h('button', {
                type: 'button',
                className: 'dsh-reader-secondary',
                disabled: noteSaving,
                onClick: async () => {
                  await deleteNote({ id: noteEditor.noteId, bookId: activeBookId })
                  closeNoteEditor()
                },
              }, t('delete'))
              : null,
            h('button', {
              type: 'button',
              className: 'dsh-reader-secondary',
              disabled: noteSaving,
              onClick: closeNoteEditor,
            }, t('cancel')),
            h('button', {
              type: 'button',
              className: 'dsh-reader-primary',
              disabled: noteSaving || !noteDraft.trim(),
              onClick: () => void saveNote(),
            }, noteSaving ? t('noteSaving') : t('save')))))
          : null)
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
          }, ReaderPanel)),
          'dsh-reader: main panel',
        )
      },
    }
}
