import { React } from '../../runtime.ts'
import { buildReaderResource } from '../reader/resource.ts'
import { usePageWidth } from '../reader/use-page-width.ts'
import { useNotes } from '../notes/use-notes.ts'
import { useTextPager } from '../reader/use-text-pager.ts'
import { useVisual } from '../reader/use-visual.ts'
import { useSelectionDismiss } from '../reader/use-selection-dismiss.ts'
import { useChatJump } from '../reader/use-chat-jump.ts'
import { useReaderActions } from '../reader/use-reader-actions.ts'
import { useActionReceipts } from '../reader/use-action-receipts.ts'
import { useSidebarProgress } from './use-sidebar-progress.ts'
import { useSidebarResource } from './use-sidebar-resource.ts'
import { visualForChapter } from '../reader/screen.ts'
import { prefillCompanionQuote, preserveSidebarVisual } from './navigation.ts'
import { pageSpanWidth } from '../reader/paging.ts'
import type { ReaderAction, ReaderActionType } from '../../../shared/contracts/actions.ts'
import type { CallRpc, ComposerInputActions, TextFn } from '../../lib/types.ts'
import type { PageLayout } from '../reader/paging.ts'
import type { SidebarMode } from './navigation.ts'

const SIDEBAR_ACTION_TYPES: ReaderActionType[] = ['goto', 'open_panel', 'notesRefresh']
const SIDEBAR_FONT_SIZE = 15

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

export function useSidebarReader({ call, t, sessionId, inputActions, useTabInfo, openResource }: SidebarReaderProps) {
  const resource = useSidebarResource({ call, t, sessionId, useTabInfo })
  const {
    book,
    screen,
    mode,
    setMode,
    loading,
    error,
    setError,
    anchor,
    setAnchor,
    selection,
    setSelection,
    anchorTokenRef,
    progressSkipRef,
    palette,
    contentRef,
    rootRef,
    visualBookRef,
    selectChapter,
  } = resource

  const noopSetChatOpen = React.useCallback(() => {}, [])

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


  const activeChapterId = screen.kind === 'book'
    ? (visual?.kind === 'pdf'
      ? screen.detail.toc.find((item: any) => item.page === visual.page)?.id ?? screen.content.chapterId
      : screen.content.chapterId)
    : null
  const activeBookId = screen.kind === 'book' ? screen.detail.book.id : null

  const progress = useSidebarProgress({
    call,
    screen,
    mode,
    textPager,
    visual,
    pdfPageCount,
    epubPage,
    epubPageCount,
    sessionId,
    activeChapterId,
    progressSkipRef,
  })
  const { chapterIndex, chapterTotal, readingPercent } = progress

  const [historyOpen, setHistoryOpen] = React.useState(false)
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

  const {
    receipts: actionReceipts,
    busyId: undoBusyId,
    undo: undoAgentAction,
    refresh: refreshActionReceipts,
  } = useActionReceipts({
    call,
    bookId: activeBookId,
    onUndone: async () => {
      await loadNotes()
    },
  })

  const canAskCompanion = typeof inputActions?.insertQuote === 'function' || typeof inputActions?.setDraft === 'function'
  const askCompanion = React.useCallback(() => {
    if (!selection || screen.kind !== 'book') return
    window.getSelection()?.removeAllRanges()
    epubFrameRef.current?.contentWindow?.getSelection()?.removeAllRanges()
    prefillCompanionQuote(inputActions, selection.text)
    setSelection(null)
  }, [epubFrameRef, inputActions, screen.kind, selection, setSelection])

  const canOriginal = screen.kind === 'book' && (screen.detail.book.format === 'epub' || screen.detail.book.format === 'pdf')
  const switchMode = (next: SidebarMode) => {
    if (next === mode || (next === 'original' && !canOriginal)) return
    if (screen.kind === 'book' && screen.detail.scanOnly && next === 'text') return
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

  return {
    t,
    book,
    screen,
    mode,
    loading,
    error,
    contentRef,
    rootRef,
    textPager,
    pageSpan,
    pageFrameStyle,
    visual,
    pageViews,
    loadedView,
    pdfPageCount,
    visualLoading,
    visualError,
    stepPdfPage,
    onPdfMouseUp,
    onEpubLoad,
    epubFrameRef,
    selection,
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
    activeBookId,
    deleteNote,
    closeNoteEditor,
    saveNote,
    openNoteEditor,
    addHighlight,
    canAskCompanion,
    askCompanion,
    chapterIndex: progress.chapterIndex,
    chapterTotal: progress.chapterTotal,
    canOriginal,
    switchMode,
    barProps,
    historyOpen,
    setHistoryOpen,
    actionReceipts,
    undoBusyId,
    undoAgentAction,
    refreshActionReceipts,
  }
}
