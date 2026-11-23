import { React, h } from '../../runtime.ts'
import { renderBlocks, renderBlocksWithTranslations } from '../markdown/render.ts'
import { ReaderBar } from '../reader/ReaderBar.ts'
import { Toc } from '../reader/Toc.ts'
import { SelectionToolbar } from '../reader/SelectionNote.ts'
import { NoteDialog } from '../reader/SelectionNote.ts'
import { ActionHistory } from '../reader/ActionHistory.ts'
import { VisualReader } from '../reader/VisualReader.ts'
import { useReaderTranslation } from '../translation/use-reader-translation.ts'
import { tailTranslationBlocksOf, translationBlocksOf } from '../translation/blocks.ts'
import { TranslationControl } from '../translation/TranslationControl.ts'
import { TranslationCard } from '../translation/TranslationCard.ts'
import { visibleBlockIndices } from '../reader/block-visibility.ts'
import { useSidebarReader } from './use-sidebar-reader.ts'
import { tocUsesPages } from './navigation.ts'
import type { SidebarReaderProps } from './use-sidebar-reader.ts'
import type { PageLayout } from '../reader/paging.ts'

export function SidebarReader(props: SidebarReaderProps) {
  const state = useSidebarReader(props)
  const translation = useReaderTranslation({
    call: props.call,
    t: props.t,
    screen: state.screen,
    selection: state.selection,
    activeSessionId: props.sessionId ?? null,
  })
  const [tocOpen, setTocOpen] = React.useState(false)
  const bookScreen = state.screen.kind === 'book' ? state.screen : null
  const inlineAvailable = bookScreen !== null
    && state.mode === 'text'
    && !bookScreen.detail.scanOnly
  const chapterContent = bookScreen?.content ?? null
  const translationBlocks = React.useMemo(
    () => inlineAvailable && chapterContent && translation.enabled ? translationBlocksOf(chapterContent) : [],
    [chapterContent, inlineAvailable, translation.enabled],
  )
  const tailBlocks = React.useMemo(
    () => inlineAvailable && translation.enabled && chapterContent && state.textPager.boundary === 'end'
      ? tailTranslationBlocksOf(chapterContent)
      : [],
    [chapterContent, inlineAvailable, state.textPager.boundary, translation.enabled],
  )
  const viewKey = inlineAvailable && bookScreen && translation.enabled
    ? `${bookScreen.detail.book.id}\u0000${bookScreen.content.chapterId}`
    : ''
  translation.setViewKey(viewKey)

  React.useEffect(() => {
    state.textPager.notifyLayout()
  }, [state.textPager.notifyLayout, translation.blocks, translation.enabled, viewKey])

  React.useEffect(() => {
    if (!inlineAvailable || !translation.enabled || !state.textPager.layoutReady) return
    const run = () => {
      const container = state.contentRef.current
      const visible = visibleBlockIndices(container)
      const candidates = translationBlocks.filter(block => visible.has(block.index))
      const missing = candidates.filter(block => !translation.blocks[block.index])
      const tail = tailBlocks.filter(block => !translation.blocks[block.index])
      const batch = [...tail]
      for (const block of missing) {
        if (!batch.some(item => item.index === block.index)) batch.push(block)
      }
      if (batch.length === 0) return
      void translation.translateAll(batch, viewKey)
    }
    let first = 0
    let second = 0
    if (typeof requestAnimationFrame === 'function') {
      first = requestAnimationFrame(() => {
        second = requestAnimationFrame(run)
      })
    } else {
      run()
    }
    return () => {
      if (typeof cancelAnimationFrame === 'function') {
        if (first) cancelAnimationFrame(first)
        if (second) cancelAnimationFrame(second)
      }
    }
  }, [
    inlineAvailable,
    state.contentRef,
    state.textPager.boundary,
    state.textPager.layoutReady,
    state.textPager.page,
    tailBlocks,
    translation.blocks,
    translation.enabled,
    translation.provider,
    translation.targetLanguage,
    translation.translateAll,
    translationBlocks,
    viewKey,
  ])

  const {
    t,
    book,
    screen,
    mode,
    loading,
    error,
    contentRef,
    rootRef,
    textPager,
    visual,
    pageViews,
    loadedView,
    visualLoading,
    visualError,
    stepPdfPage,
    goPdfPage,
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
    activeChapterId,
    selectChapter,
    deleteNote,
    closeNoteEditor,
    saveNote,
    openNoteEditor,
    addHighlight,
    canAskCompanion,
    askCompanion,
    chapterIndex,
    chapterTotal,
    canOriginal,
    switchMode,
    barProps,
    historyOpen,
    setHistoryOpen,
    actionReceipts,
    undoBusyId,
    undoAgentAction,
    refreshActionReceipts,
  } = state

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

  const textBlocks = inlineAvailable && translation.enabled
    ? renderBlocksWithTranslations(
      screen.content.blocks,
      `sidebar-${screen.content.chapterId}`,
      translation.blocks,
      t('translating'),
      false,
    )
    : renderBlocks(screen.content.blocks, `sidebar-${screen.content.chapterId}`)

  const body = mode === 'text'
    ? h('div', {
      className: 'dsh-readpilot-reader dsh-readpilot-sidebar-reader',
      'data-paged': 'true',
      ref: contentRef,
      style: { fontSize: '15px' },
    },
    h('div', { className: 'dsh-readpilot-page-frame', ref: textPager.frameRef },
      h('div', {
        className: 'dsh-readpilot-reader-inner dsh-readpilot-paged-inner',
        ref: textPager.innerRef,
        style: textPager.innerStyle,
      },
      h('h1', { className: 'dsh-readpilot-chapter-title' }, screen.content.title),
      textBlocks,
      h('div', { className: 'dsh-readpilot-note-layer', ref: noteLayerRef }))))
    : h(VisualReader, {
      t,
      visual,
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

  const tocPages = tocUsesPages(screen.detail.book.format, mode, Boolean(screen.detail.scanOnly))
  const jumpFromToc = (chapterId: string) => {
    setTocOpen(false)
    const target = screen.detail.toc.find(item => item.id === chapterId)
    if (tocPages && typeof target?.page === 'number') {
      goPdfPage(target.page)
      return
    }
    void selectChapter(screen.detail.book.id, chapterId)
  }
  const jumpToTocPage = (page: number) => {
    setTocOpen(false)
    goPdfPage(page)
  }

  return h('div', { className: 'dsh-readpilot-sidebar-reader-root', ref: rootRef },
    h('div', { className: 'dsh-readpilot-sidebar-reader-head' },
      h('div', { className: 'dsh-readpilot-sidebar-reader-title', title: book.title }, book.title),
      h('div', { className: 'dsh-readpilot-sidebar-reader-actions' },
        h('button', {
          type: 'button',
          className: 'dsh-readpilot-sidebar-toc-toggle',
          'aria-expanded': tocOpen ? 'true' : 'false',
          'aria-controls': 'dsh-readpilot-sidebar-toc',
          onClick: () => setTocOpen(open => !open),
        }, t('toc')),
        screen.detail.scanOnly ? null : h('div', { className: 'dsh-readpilot-segmented' },
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
          }, t('sidebarOriginalMode'))))),
    selection && !noteEditor
      ? h(SelectionToolbar, {
        t,
        selection,
        onTranslate: () => void translation.translateSelection(),
        onAsk: canAskCompanion ? askCompanion : undefined,
        onNote: () => openNoteEditor(),
        onHighlight: (color: string) => { void addHighlight(color) },
      })
      : null,
    h('div', { className: 'dsh-readpilot-sidebar-reader-body' },
      body,
      tocOpen
        ? h('div', { className: 'dsh-readpilot-sidebar-toc-layer' },
          h('button', {
            type: 'button',
            className: 'dsh-readpilot-sidebar-toc-backdrop',
            'aria-label': t('close'),
            onClick: () => setTocOpen(false),
          }),
          h('div', {
            id: 'dsh-readpilot-sidebar-toc',
            className: 'dsh-readpilot-sidebar-toc-panel',
            role: 'dialog',
            'aria-label': t('toc'),
          },
          h(Toc, {
            t,
            detail: screen.detail,
            activeChapter: activeChapterId ?? screen.content.chapterId,
            activePage: visual?.kind === 'pdf' ? visual.page : undefined,
            scanOnly: screen.detail.scanOnly,
            pageJump: tocPages,
            onSelect: jumpFromToc,
            onPageSelect: jumpToTocPage,
          })))
        : null),
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
      translationControl: h(TranslationControl, { t, state: translation, settingsOnly: !inlineAvailable }),
      onHistory: () => {
        setHistoryOpen(true)
        void refreshActionReceipts()
      },
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
      : null,
    historyOpen
      ? h(ActionHistory, {
        t,
        receipts: actionReceipts,
        busyId: undoBusyId,
        onUndo: undoAgentAction,
        onRefresh: refreshActionReceipts,
        onClose: () => setHistoryOpen(false),
      })
      : null,
    h(TranslationCard, {
      t,
      result: translation.selectionResult,
      onClose: translation.closeSelection,
    }))
}
