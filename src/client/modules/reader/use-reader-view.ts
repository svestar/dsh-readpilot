import { React } from '../../runtime.ts'
import { blockIndexAtOffset, messageOf, normalizeFontSize, reflowEnabledFor } from '../../lib/helpers.ts'
import { usePageWidth } from './use-page-width.ts'
import { useTextPager } from './use-text-pager.ts'
import { useVisual } from './use-visual.ts'
import { useReadingProgress } from './use-reading-progress.ts'
import { visualForChapter, visualForItem } from './screen.ts'
import { buildReaderResource } from './resource.ts'
import type { ReaderPreferences } from './use-reader-preferences.ts'
import type { ReadingAnchor } from './paging.ts'
import type { CallRpc, ClientBook, PendingScroll, Screen, Selection, SelectChapter, TextFn, TocItem } from '../../lib/types.ts'
import type { ReaderJumpTarget } from '../../../shared/jump-url.ts'
import type { StateSetter } from '../../runtime.ts'

interface ReaderViewOptions {
  call: CallRpc
  t: TextFn
  runtime: any
  screen: Screen
  setScreen: (next: Screen | ((previous: Screen) => Screen)) => void
  setBusy: (value: boolean) => void
  setError: (value: string) => void
  refresh: () => Promise<void>
  prefs: ReaderPreferences
  selection: Selection | null
  setSelection: StateSetter<Selection | null>
  setChatOpen: (value: boolean) => void
  setChatError: (value: string) => void
  activeSessionId: string | null
}

/** Screen navigation, visual/text pagers and the reading position for the panel. */
export function useReaderView({
  call,
  t,
  runtime,
  screen,
  setScreen,
  setBusy,
  setError,
  refresh,
  prefs,
  selection,
  setSelection,
  setChatOpen,
  setChatError,
  activeSessionId,
}: ReaderViewOptions) {
  const {
    readingMode,
    reflowBooks,
    setReadingMode,
    reflowMode,
    reflowModeRef,
    setBookReflow,
    pageLayout,
    setPageLayout,
    fontSize,
    setFontSize,
    palette,
    isTextFormat,
    textLayout,
    effectiveMode,
    format,
    supportedFormat,
  } = prefs
  const [readingAnchor, setReadingAnchor] = React.useState<ReadingAnchor | null>(null)
  const anchorTokenRef = React.useRef(0)
  const progressSkipRef = React.useRef(false)
  const scrollAnchorAppliedRef = React.useRef(0)
  const pendingScrollRef = React.useRef<PendingScroll | null>(null)
  const contentRef = React.useRef<HTMLDivElement | null>(null)
  const selectChapterRef = React.useRef<SelectChapter>(async () => {})
  const selectChapterBridge = React.useCallback<SelectChapter>((...args) => selectChapterRef.current(...args), [])

  const visualApi = useVisual({
    call,
    t,
    screen,
    palette,
    setSelection,
    selectChapter: selectChapterBridge,
    readingMode: effectiveMode,
    layout: pageLayout,
    anchor: readingAnchor,
  })
  const visual = visualApi.visual
  const setVisual = visualApi.setVisual

  const textPageWidth = usePageWidth({ enabled: isTextFormat, containerRef: contentRef })
  const textPager = useTextPager({
    enabled: isTextFormat && effectiveMode === 'paged',
    layout: textLayout,
    screen,
    fontSize,
    pageWidth: textPageWidth,
    anchor: readingAnchor,
    selectChapter: selectChapterBridge,
  })

  const activeChapterId = screen.kind === 'book'
    ? (visual?.kind === 'pdf'
      ? screen.detail.toc.find(item => item.page === visual.page)?.id ?? screen.content.chapterId
      : screen.content.chapterId)
    : ''
  const toc = screen.kind === 'book' ? screen.detail.toc : []
  const chapterIndex = screen.kind === 'book' ? toc.findIndex(item => item.id === screen.content.chapterId) : -1
  const chapterTotal = toc.length

  const progress = useReadingProgress({
    call,
    screen,
    activeChapterId,
    chapterIndex,
    chapterTotal,
    effectiveMode,
    format,
    reflowMode,
    textPager,
    visual,
    pdfPageCount: visualApi.pdfPageCount,
    epubPage: visualApi.epubPage,
    epubPageCount: visualApi.epubPageCount,
    selection,
    activeSessionId,
    progressSkipRef,
  })

  const selectChapter = React.useCallback<SelectChapter>(async (bookId, chapterId, target) => {
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
  }, [call, reflowModeRef, screen, setBusy, setError, setScreen, setSelection, setVisual, t])
  selectChapterRef.current = selectChapter

  React.useEffect(() => {
    if (screen.kind !== 'book' || visual) return
    setVisual(visualForChapter(screen.detail, screen.content.chapterId, reflowMode))
  }, [screen, setVisual, visual, reflowMode])

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
      if (detail.scanOnly) {
        const pageCount = Math.max(1, detail.pageCount ?? 1)
        const percent = Number(detail.progress?.percent ?? 0)
        const page = Math.max(1, Math.min(pageCount, Math.round((percent / 100) * (pageCount - 1)) + 1))
        setReadingAnchor(null)
        setVisual({ kind: 'pdf', page, scale: 1.5 })
        setScreen({
          kind: 'book',
          detail,
          content: {
            chapterId: target.id,
            title: target.title,
            blocks: [],
            locator: `${book.id}:${target.id}:0`,
          },
        })
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
      setVisual(visualForItem(detail, target, reflowEnabledFor(
        reflowBooks,
        book.id,
        detail.book.format === 'txt' || detail.book.format === 'md'
          || detail.book.format === 'epub' || detail.book.format === 'pdf'
          ? detail.book.format
          : 'txt',
      )))
      setScreen({ kind: 'book', detail, content })
    } catch (cause) {
      setError(`${t('loadFailed')}：${messageOf(cause)}`)
    } finally {
      setBusy(false)
    }
  }, [call, reflowBooks, setBusy, setError, setScreen, setVisual, t])

  const makeReadingAnchor = React.useCallback((chapterId?: string, fraction?: number) => {
    let value = fraction
    if (value === undefined) {
      const scroller = readingMode === 'scroll' ? contentRef.current : null
      if (scroller) value = scroller.scrollTop / Math.max(1, scroller.scrollHeight - scroller.clientHeight)
      else if (isTextFormat && textPager.pageCount > 0) value = textPager.page / Math.max(1, textPager.pageCount)
      else if (visual?.kind === 'epub' && visualApi.epubPageCount > 0) value = visualApi.epubPage / Math.max(1, visualApi.epubPageCount)
      else value = 0
    }
    return {
      chapterId: chapterId ?? (screen.kind === 'book' ? screen.content.chapterId : ''),
      fraction: Math.max(0, Math.min(1, value)),
      token: ++anchorTokenRef.current,
    }
  }, [isTextFormat, readingMode, screen, textPager.page, textPager.pageCount, visual?.kind, visualApi.epubPage, visualApi.epubPageCount])

  const changeFlow = React.useCallback((mode: typeof readingMode) => {
    if (mode === readingMode) return
    setReadingAnchor(makeReadingAnchor())
    setReadingMode(mode)
  }, [makeReadingAnchor, readingMode, setReadingMode])

  const changeSpread = React.useCallback((layout: typeof pageLayout) => {
    if (layout === pageLayout) return
    setReadingAnchor(makeReadingAnchor())
    setPageLayout(layout)
  }, [makeReadingAnchor, pageLayout, setPageLayout])

  const changeFontSize = React.useCallback((value: number) => {
    setReadingAnchor(makeReadingAnchor())
    setFontSize(normalizeFontSize(value))
  }, [makeReadingAnchor, setFontSize])

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

  const goChapter = React.useCallback((delta: number) => {
    if (screen.kind !== 'book') return
    const item = screen.detail.toc[chapterIndex + delta]
    if (item) void selectChapter(screen.detail.book.id, item.id)
  }, [chapterIndex, screen, selectChapter])

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

  const applySource = React.useCallback((next: boolean) => {
    if (screen.kind !== 'book') return
    const screenFormat = screen.detail.book.format
    if (screenFormat !== 'epub' && screenFormat !== 'pdf') return
    reflowModeRef.current = next
    setBookReflow(next)
    const page = visual?.kind === 'pdf' ? visual.page : null
    setVisual(visualForChapter(screen.detail, screen.content.chapterId, next))
    if (screenFormat === 'pdf') {
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
  }, [makeReadingAnchor, reflowModeRef, screen, selectChapter, setBookReflow, setVisual, visual])

  const backToLibrary = React.useCallback(() => {
    setScreen({ kind: 'library' })
    setSelection(null)
    setVisual(null)
    visualApi.setPageView(null)
    visualApi.setVisualError('')
    pendingScrollRef.current = null
    void refresh()
  }, [refresh, setScreen, setSelection, setVisual, visualApi])

  return {
    readingAnchor,
    setReadingAnchor,
    anchorTokenRef,
    progressSkipRef,
    contentRef,
    selectChapter,
    openBook,
    openOtherBook,
    backToLibrary,
    goChapter,
    jumpToPage,
    applySource,
    makeReadingAnchor,
    changeFlow,
    changeSpread,
    changeFontSize,
    activeChapterId,
    chapterIndex,
    chapterTotal,
    toc,
    textPageWidth,
    textPager,
    ...visualApi,
    ...progress,
    format,
    supportedFormat,
  }
}

export type ReaderView = ReturnType<typeof useReaderView>
