import { React, h } from '../runtime.ts'
import type { CallRpc, ComposerInputActions, Screen, SelectTarget, TextFn, Visual } from '../types.ts'
import type { PageLayout, ReadingAnchor } from '../paging.ts'
import { chapterPercent, pageSpanWidth, pdfPagePercent } from '../paging.ts'
import { readPaletteId, resolveReaderPalette } from '../helpers.ts'
import { buildReaderResource, parseReaderResource } from '../reader-resource.ts'
import { publishProgressSync } from '../progress-sync.ts'
import { usePageWidth } from '../hooks/use-page-width.ts'
import { useNotes } from '../hooks/use-notes.ts'
import { useTextPager } from '../hooks/use-text-pager.ts'
import { useVisual } from '../hooks/use-visual.ts'
import { useSelectionDismiss } from '../hooks/use-selection-dismiss.ts'
import { useChatJump } from '../hooks/use-chat-jump.ts'
import { useReaderActions } from '../hooks/use-reader-actions.ts'
import type { ReaderAction, ReaderActionType } from '../../reader-actions.ts'

const SIDEBAR_ACTION_TYPES: ReaderActionType[] = ['goto', 'open_panel', 'notesRefresh']
import { visualForChapter } from '../reader-screen.ts'
import { renderBlocks, selectionAnchor } from './markdown.ts'
import { ReaderBar } from './reader-bar.ts'
import { NoteDialog, SelectionToolbar, quoteDraft } from './selection-note.ts'
import { VisualReader } from './visual-reader.ts'

const SIDEBAR_FONT_SIZE = 15
const SIDEBAR_PROGRESS_DEBOUNCE = 400

export function preserveSidebarVisual(previous: Visual | null, next: Visual | null, bookChanged: boolean): Visual | null {
  if (bookChanged || previous === null) return next
  if (previous.kind === 'pdf') return previous
  if (previous.kind === 'epub' && next?.kind === 'epub' && next.href === previous.href) return previous
  return next
}

export function chapterFractionForOffset(
  blocks: ReadonlyArray<{ text: string }> | null | undefined,
  offset: number | null,
): number | null {
  if (offset === null || !Number.isFinite(offset)) return null
  const chars = (blocks ?? []).reduce((sum, block) => sum + (block.text?.length ?? 0), 0)
  if (chars <= 0) return null
  return Math.max(0, Math.min(1, offset / chars))
}

export interface SidebarReaderProps {
  call: CallRpc
  t: TextFn
  sessionId?: string
  inputActions?: ComposerInputActions | null
  useTabInfo?: () => {
    tab?: {
      contentId?: string
      navigation?: { revision?: number; params?: { address?: string } }
    }
  } | null
  openResource?: (address: string) => void
}

/**
 * Put a selected passage into the session composer.
 * @param actions - the session's composer actions, when the host provides them.
 * @param text - selected reader text.
 * @returns whether the quote reached the composer.
 */
export function prefillCompanionQuote(actions: ComposerInputActions | null | undefined, text: string): boolean {
  const quote = text.trim()
  if (!quote) return false
  try {
    if (actions?.insertQuote?.(quote)) return true
  } catch {
    // Older or busy composers fall through to the plain draft write.
  }
  try {
    actions?.setDraft?.(quoteDraft(quote))
  } catch {
    return false
  }
  return typeof actions?.setDraft === 'function'
}

interface SidebarBook {
  bookId: string
  title: string
  format: 'txt' | 'md' | 'epub' | 'pdf'
}

type SidebarMode = 'text' | 'original'

export function SidebarReader({ call, t, sessionId, inputActions, useTabInfo, openResource }: SidebarReaderProps) {
  const tab = useTabInfo ? useTabInfo() : null
  const revision = tab?.tab?.navigation?.revision ?? 0
  const resourceAddress = tab?.tab?.contentId
    || tab?.tab?.navigation?.params?.address
    || ''
  const [book, setBook] = React.useState<SidebarBook | null>(null)
  const [screen, setScreen] = React.useState<Screen>({ kind: 'library' })
  const [mode, setMode] = React.useState<SidebarMode>('text')
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState('')
  const [anchor, setAnchor] = React.useState<ReadingAnchor | null>(null)
  const [selection, setSelection] = React.useState<any>(null)
  const anchorTokenRef = React.useRef(0)
  const progressSkipRef = React.useRef(true)
  const noopSetChatOpen = React.useCallback(() => {}, [])
  const palette = resolveReaderPalette(readPaletteId())
  const contentRef = React.useRef<HTMLDivElement | null>(null)
  const rootRef = React.useRef<HTMLDivElement | null>(null)
  const visualBookRef = React.useRef('')

  const selectChapter = React.useCallback(async (bookId: string, chapterId: string, target?: SelectTarget) => {
    try {
      const content = await call('chapter', { bookId, chapterId })
      const offset = typeof target?.offset === 'number' ? target.offset : null
      const fraction = chapterFractionForOffset(content.blocks, offset)
      setAnchor(fraction !== null
        ? { chapterId, fraction, token: ++anchorTokenRef.current }
        : null)
      setScreen(previous => previous.kind === 'book' ? { ...previous, content } : previous)
    } catch (cause) {
      setError(`${t('loadFailed')}：${cause instanceof Error ? cause.message : String(cause)}`)
    }
  }, [call, t])

  const openOtherBook = React.useCallback((target: any) => {
    const address = buildReaderResource(target.bookId, target.chapterId, target.offset)
    if (openResource) openResource(address)
    else setError(t('chatJumpOtherBook'))
  }, [openResource, t])

  useChatJump({
    call,
    screen,
    t,
    selectChapter,
    setChatError: setError,
    setChatOpen: noopSetChatOpen,
    openOtherBook,
  })

  React.useEffect(() => {
    const resource = parseReaderResource(resourceAddress)
    if (!sessionId && !resource) {
      setBook(null)
      setScreen({ kind: 'library' })
      setLoading(false)
      setError('')
      return
    }
    let cancelled = false
    setLoading(true)
    setError('')
    void (async () => {
      if (resource) {
        const detail = await call('open', { bookId: resource.bookId })
        if (cancelled) return
        if (!detail.supported) throw new Error(t('unsupported'))
        const target = detail.toc.find((item: any) => item.id === resource.chapterId)
          ?? detail.toc.find((item: any) => item.id === detail.progress?.chapterId)
          ?? detail.toc[0]
        if (!target) throw new Error(t('unsupported'))
        const content = await call('chapter', { bookId: resource.bookId, chapterId: target.id })
        if (cancelled) return
        setBook({ bookId: resource.bookId, title: detail.book.title, format: detail.book.format })
        if (detail.book.format === 'txt' || detail.book.format === 'md') setMode('text')
        const offset = typeof resource.offset === 'number' ? resource.offset : null
        const fraction = chapterFractionForOffset(content.blocks, offset)
        setAnchor(fraction !== null
          ? { chapterId: target.id, fraction, token: ++anchorTokenRef.current }
          : null)
        progressSkipRef.current = true
        setScreen({ kind: 'book', detail, content })
        return
      }
      if (!sessionId) return
      const found = await call('sessionBook', { sessionId }) as SidebarBook | null
      if (cancelled) return
      if (!found) {
        setBook(null)
        setScreen({ kind: 'library' })
        return
      }
      setBook(found)
      if (found.format === 'txt' || found.format === 'md') setMode('text')
      const detail = await call('open', { bookId: found.bookId })
      if (cancelled) return
      if (!detail.supported) throw new Error(t('unsupported'))
      const target = detail.toc.find((item: any) => item.id === detail.progress?.chapterId) ?? detail.toc[0]
      if (!target) throw new Error(t('unsupported'))
      const content = await call('chapter', { bookId: found.bookId, chapterId: target.id })
      if (cancelled) return
      const fraction = detail.progress?.chapterFraction
      setAnchor(typeof fraction === 'number' && Number.isFinite(fraction)
        ? { chapterId: target.id, fraction: Math.max(0, Math.min(1, fraction)), token: ++anchorTokenRef.current }
        : null)
      progressSkipRef.current = true
      setScreen({ kind: 'book', detail, content })
    })().catch((cause: unknown) => {
      if (!cancelled) setError(`${t('loadFailed')}：${cause instanceof Error ? cause.message : String(cause)}`)
    }).finally(() => {
      if (!cancelled) setLoading(false)
    })
    return () => { cancelled = true }
  }, [call, resourceAddress, revision, sessionId, t])

  const captureSelection = React.useCallback((target: EventTarget | null) => {
    const targetElement = target instanceof Element ? target : null
    if (targetElement?.closest('.dsh-readpilot-selection, [role="dialog"]')) return
    const root = rootRef.current
    const active = window.getSelection()
    if (!root || !active || active.isCollapsed || active.rangeCount === 0) return
    const range = active.getRangeAt(0)
    if (!root.contains(range.commonAncestorContainer)) return
    const text = active.toString().trim()
    if (!text) return
    const rect = range.getBoundingClientRect()
    const node = range.startContainer.nodeType === 1
      ? range.startContainer as Element
      : range.startContainer.parentElement
    let blockIndex: number | null = null
    let offset = 0
    const container = contentRef.current
    if (container?.contains(range.commonAncestorContainer)) {
      const anchor = selectionAnchor(range, container)
      if (anchor) {
        blockIndex = anchor.blockIndex
        offset = anchor.offset
      }
    } else if (node?.closest?.('.dsh-readpilot-pdf-text')) {
      const span = node?.closest?.('[data-offset]') as HTMLElement | null
      if (span) {
        const raw = active.toString()
        const leading = raw.length - raw.trimStart().length
        const before = range.cloneRange()
        before.selectNodeContents(span)
        before.setEnd(range.startContainer, range.startOffset)
        blockIndex = 0
        offset = (Number(span.getAttribute('data-offset')) || 0) + before.toString().length + leading
      }
    }
    if (blockIndex === null) return
    setSelection({
      text: text.slice(0, 2000),
      x: Math.min(Math.max(rect.left + rect.width / 2, 120), window.innerWidth - 120),
      y: rect.top,
      blockIndex,
      offset,
    })
  }, [])

  React.useEffect(() => {
    const onUp = (event: MouseEvent) => {
      window.setTimeout(() => captureSelection(event.target), 10)
    }
    document.addEventListener('mouseup', onUp)
    return () => document.removeEventListener('mouseup', onUp)
  }, [captureSelection])
  const textPageWidth = usePageWidth({
    enabled: mode === 'text' && screen.kind === 'book',
    containerRef: contentRef,
  })
  const textPager = useTextPager({
    enabled: mode === 'text' && screen.kind === 'book',
    layout: 'single',
    screen,
    fontSize: SIDEBAR_FONT_SIZE,
    pageWidth: textPageWidth,
    anchor,
    selectChapter,
  })

  const {
    visual,
    setVisual,
    pageViews,
    pageView,
    loadedView,
    pdfPageCount,
    visualLoading,
    visualError,
    epubPage,
    epubPageCount,
    epubFrameRef,
    epubReady,
    onPdfMouseUp,
    stepPdfPage,
    goEpubPage,
    onEpubLoad,
  } = useVisual({
    call,
    t,
    screen,
    palette,
    setSelection,
    selectChapter,
    readingMode: 'paged',
    layout: 'single',
    anchor,
  })

  React.useEffect(() => {
    if (screen.kind !== 'book' || mode !== 'original') {
      visualBookRef.current = ''
      setVisual(null)
      return
    }
    const bookId = screen.detail.book.id
    const bookChanged = visualBookRef.current !== bookId
    visualBookRef.current = bookId
    setVisual(previous => preserveSidebarVisual(previous, visualForChapter(screen.detail, screen.content.chapterId, false), bookChanged))
  }, [mode, screen, setVisual])

  const chapterIndex = screen.kind === 'book'
    ? screen.detail.toc.findIndex((item: any) => item.id === screen.content.chapterId)
    : -1
  const chapterTotal = screen.kind === 'book' ? screen.detail.toc.length : 0
  const activeChapterId = screen.kind === 'book'
    ? (visual?.kind === 'pdf'
      ? screen.detail.toc.find((item: any) => item.page === visual.page)?.id ?? screen.content.chapterId
      : screen.content.chapterId)
    : null
  const activeBookId = screen.kind === 'book' ? screen.detail.book.id : null
  const {
    noteLayerRef,
    noteLayersRef,
    noteEditor,
    noteDraft,
    setNoteDraft,
    noteColor,
    setNoteColor,
    noteSaving,
    noteError,
    noteInputRef,
    closeNoteEditor,
    openNoteEditor,
    addHighlight,
    deleteNote,
    saveNote,
    loadNotes,
  } = useNotes({
    call,
    t,
    screen,
    activeBookId,
    activeChapterId: activeChapterId ?? '',
    visual,
    pageView,
    pageViews,
    palette,
    fontSize: SIDEBAR_FONT_SIZE,
    paged: true,
    layout: 'single',
    contentRef,
    epubFrameRef,
    epubReady,
    selection,
    setSelection,
    selectChapter,
  })
  useSelectionDismiss(selection, setSelection, epubFrameRef)

  const onReaderAction = React.useCallback(async (action: ReaderAction) => {
    if (action.type === 'notesRefresh') {
      if (action.bookId === activeBookId) await loadNotes()
      return
    }
    if (action.type === 'libraryRefresh') return
    if (!action.bookId || !action.chapterId) return
    if (action.bookId === activeBookId) {
      await selectChapter(action.bookId, action.chapterId, {
        ...(typeof action.offset === 'number' ? { offset: action.offset } : {}),
        flash: true,
      })
    } else if (openResource) {
      openResource(buildReaderResource(action.bookId, action.chapterId, action.offset))
    }
  }, [activeBookId, loadNotes, openResource, selectChapter])

  useReaderActions({
    call,
    bookId: activeBookId,
    types: SIDEBAR_ACTION_TYPES,
    onAction: onReaderAction,
  })

  const canAskCompanion = typeof inputActions?.insertQuote === 'function' || typeof inputActions?.setDraft === 'function'
  const askCompanion = React.useCallback(() => {
    if (!selection || screen.kind !== 'book') return
    window.getSelection()?.removeAllRanges()
    epubFrameRef.current?.contentWindow?.getSelection()?.removeAllRanges()
    prefillCompanionQuote(inputActions, selection.text)
    setSelection(null)
  }, [epubFrameRef, inputActions, screen.kind, selection, setSelection])
  const activeChapterIndex = screen.kind === 'book'
    ? screen.detail.toc.findIndex((item: any) => item.id === activeChapterId)
    : -1
  const chapterFraction = screen.kind !== 'book'
    ? 0
    : mode === 'text'
      ? textPager.page / Math.max(1, textPager.pageCount)
      : visual?.kind === 'epub'
        ? epubPage / Math.max(1, epubPageCount)
        : 0
  const chapterPage = mode === 'text' ? textPager.page : visual?.kind === 'epub' ? epubPage : 0
  const chapterPages = mode === 'text' ? textPager.pageCount : visual?.kind === 'epub' ? epubPageCount : 1
  const readingPercent = screen.kind !== 'book'
    ? 0
    : screen.detail.book.format === 'pdf' && mode === 'original' && visual?.kind === 'pdf'
      ? pdfPagePercent(visual.page, pdfPageCount || screen.detail.toc.length || 1)
      : chapterPercent(screen.detail.toc, activeChapterIndex >= 0 ? activeChapterIndex : chapterIndex, chapterPage, chapterPages)

  const readingView = React.useMemo(() => {
    if (screen.kind !== 'book') return null
    const view: Record<string, unknown> = { mode: 'paged', chapterIndex, chapterTotal }
    if (mode === 'text') {
      view.pageStart = textPager.pageStart
      view.pageEnd = textPager.pageEnd
      view.pageTotal = textPager.pageTotal
    } else if (visual?.kind === 'pdf') {
      view.pageStart = visual.page
      view.pageEnd = visual.page
      if (pdfPageCount > 0) view.pageTotal = pdfPageCount
    } else {
      view.pageStart = epubPage + 1
      view.pageEnd = epubPage + 1
      if (epubPageCount > 0) view.pageTotal = epubPageCount
    }
    return view
  }, [chapterIndex, chapterTotal, epubPage, epubPageCount, mode, pdfPageCount, screen, textPager.pageEnd, textPager.pageStart, textPager.pageTotal, visual])
  const readingViewKey = JSON.stringify(readingView)

  React.useEffect(() => {
    if (screen.kind !== 'book' || !activeChapterId || !sessionId || !readingView) return
    const chapterTitle = screen.detail.toc.find((item: any) => item.id === activeChapterId)?.title ?? screen.content.title
    void call('companionContext', {
      sessionId,
      bookId: screen.detail.book.id,
      title: screen.detail.book.title,
      chapter: chapterTitle,
      view: readingView,
    }).catch(() => {})
  }, [activeChapterId, call, readingViewKey, screen, sessionId])

  React.useEffect(() => {
    if (screen.kind !== 'book' || !activeChapterId) return
    if (progressSkipRef.current) {
      progressSkipRef.current = false
      return
    }
    const chapterTitle = screen.detail.toc.find((item: any) => item.id === activeChapterId)?.title ?? screen.content.title
    const timer = window.setTimeout(() => {
      const fraction = Math.round(chapterFraction * 1000) / 1000
      void call('progress', {
        bookId: screen.detail.book.id,
        chapterId: activeChapterId,
        chapterTitle,
        chapterFraction: fraction,
        percent: Math.round(readingPercent * 10) / 10,
      }).then(() => publishProgressSync({
        bookId: screen.detail.book.id,
        chapterId: activeChapterId,
        chapterFraction: fraction,
        origin: 'sidebar',
      })).catch(() => {})
    }, SIDEBAR_PROGRESS_DEBOUNCE)
    return () => window.clearTimeout(timer)
  }, [activeChapterId, chapterFraction, readingPercent, screen, call])

  const canOriginal = screen.kind === 'book' && (screen.detail.book.format === 'epub' || screen.detail.book.format === 'pdf')
  const switchMode = (next: SidebarMode) => {
    if (next === mode || (next === 'original' && !canOriginal)) return
    const fraction = screen.kind === 'book'
      ? mode === 'text'
        ? textPager.page / Math.max(1, textPager.pageCount)
        : visual?.kind === 'epub'
          ? epubPage / Math.max(1, epubPageCount)
          : 0
      : 0
    if (screen.kind === 'book') {
      setAnchor({ chapterId: screen.content.chapterId, fraction, token: ++anchorTokenRef.current })
    }
    setMode(next)
  }

  const pageSpan = pageSpanWidth(textPageWidth, 'single' as PageLayout)
  const pageFrameStyle = pageSpan > 0 ? { width: `${pageSpan}px`, maxWidth: '100%', margin: '0 auto' } : undefined

  const barProps = screen.kind === 'book'
    ? mode === 'text'
      ? {
        pageStart: textPager.pageStart,
        pageEnd: textPager.pageEnd,
        pageTotal: textPager.pageTotal,
        percent: readingPercent,
        chapterIndex,
        chapterTotal,
        canPrev: textPager.canPrev,
        canNext: textPager.canNext,
        onPrev: () => textPager.goPage(-1),
        onNext: () => textPager.goPage(1),
      }
      : visual?.kind === 'pdf'
        ? {
          pageStart: visual.page,
          pageEnd: visual.page,
          pageTotal: pdfPageCount,
          percent: readingPercent,
          chapterIndex,
          chapterTotal,
          canPrev: visual.page > 1,
          canNext: visual.page < (pdfPageCount || visual.page),
          onPrev: () => stepPdfPage(-1),
          onNext: () => stepPdfPage(1),
        }
        : {
          pageStart: epubPage + 1,
          pageEnd: epubPage + 1,
          pageTotal: epubPageCount,
          percent: readingPercent,
          chapterIndex,
          chapterTotal,
          canPrev: epubPage > 0 || chapterIndex > 0,
          canNext: epubPage + 1 < epubPageCount || chapterIndex < chapterTotal - 1,
          onPrev: () => goEpubPage(-1),
          onNext: () => goEpubPage(1),
        }
    : null

  if (loading) {
    return h('div', { className: 'dsh-readpilot-sidebar-state' }, t('loading'))
  }
  if (error) {
    return h('div', { className: 'dsh-readpilot-sidebar-state' }, error)
  }
  if (!book || screen.kind !== 'book' || !barProps) {
    return h('div', { className: 'dsh-readpilot-sidebar-state' },
      h('div', { className: 'dsh-readpilot-sidebar-empty-title' }, t('sidebarReaderEmpty')),
      h('div', { className: 'dsh-readpilot-sidebar-empty-hint' }, t('sidebarReaderEmptyHint')))
  }

  const body = mode === 'text'
    ? h('div', {
      className: 'dsh-readpilot-reader dsh-readpilot-sidebar-reader',
      'data-paged': 'true',
      ref: contentRef,
      style: { fontSize: `${SIDEBAR_FONT_SIZE}px` },
    },
    h('div', { className: 'dsh-readpilot-page-frame', ref: textPager.frameRef, style: pageFrameStyle },
      h('div', {
        className: 'dsh-readpilot-reader-inner dsh-readpilot-paged-inner',
        ref: textPager.innerRef,
        style: textPager.innerStyle,
      },
      h('h1', { className: 'dsh-readpilot-chapter-title' }, screen.content.title),
      renderBlocks(screen.content.blocks, `sidebar-${screen.content.chapterId}`),
      h('div', { className: 'dsh-readpilot-note-layer', ref: noteLayerRef }))))
    : h(VisualReader, {
      t,
      visual: visual as Visual | null,
      screen,
      pageViews,
      loadedView,
      layout: 'single' as PageLayout,
      readingMode: 'paged',
      stepPdfPage,
      visualLoading,
      visualError,
      onPdfMouseUp,
      noteLayerRef,
      noteLayersRef,
      onEpubLoad,
      epubFrameRef,
    })

  return h('div', { className: 'dsh-readpilot-sidebar-reader-root', ref: rootRef },
    h('div', { className: 'dsh-readpilot-sidebar-reader-head' },
      h('div', { className: 'dsh-readpilot-sidebar-reader-title', title: book.title }, book.title),
      h('div', { className: 'dsh-readpilot-segmented' },
        h('button', {
          type: 'button',
          className: 'dsh-readpilot-segment',
          'data-active': mode === 'text' ? 'true' : 'false',
          onClick: () => switchMode('text'),
        }, t('sidebarTextMode')),
        h('button', {
          type: 'button',
          className: 'dsh-readpilot-segment',
          'data-active': mode === 'original' ? 'true' : 'false',
          disabled: !canOriginal,
          title: canOriginal ? t('sidebarOriginalMode') : t('sidebarOriginalUnavailable'),
          onClick: () => switchMode('original'),
        }, t('sidebarOriginalMode')))),
    selection && !noteEditor
      ? h(SelectionToolbar, {
        t,
        selection,
        onAsk: canAskCompanion ? askCompanion : undefined,
        onNote: () => openNoteEditor(),
        onHighlight: (color: string) => { void addHighlight(color) },
      })
      : null,
    h('div', { className: 'dsh-readpilot-sidebar-reader-body' }, body),
    h(ReaderBar, {
      t,
      format: screen.detail.book.format,
      mode: 'paged',
      layout: 'single',
      chapterTitle: screen.content.title,
      chapterIndex,
      chapterTotal,
      pageStart: barProps.pageStart,
      pageEnd: barProps.pageEnd,
      pageTotal: barProps.pageTotal,
      percent: barProps.percent,
      reflow: mode === 'text',
      canPrev: barProps.canPrev,
      canNext: barProps.canNext,
      onPrev: barProps.onPrev,
      onNext: barProps.onNext,
    }),
    noteEditor
      ? h(NoteDialog, {
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
      })
      : null)
}
