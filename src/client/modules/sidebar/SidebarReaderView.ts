import { React, h } from '../../runtime.ts'
import { renderBlocks, renderBlocksWithTranslations } from '../markdown/render.ts'
import { ReaderBar } from '../reader/ReaderBar.ts'
import { SelectionToolbar } from '../reader/SelectionNote.ts'
import { NoteDialog } from '../reader/SelectionNote.ts'
import { ActionHistory } from '../reader/ActionHistory.ts'
import { VisualReader } from '../reader/VisualReader.ts'
import { useReaderTranslation } from '../translation/use-reader-translation.ts'
import { translationBlocksOf } from '../translation/blocks.ts'
import { TranslationControl } from '../translation/TranslationControl.ts'
import { TranslationCard } from '../translation/TranslationCard.ts'
import { visibleBlockIndices } from '../reader/block-visibility.ts'
import { useSidebarReader } from './use-sidebar-reader.ts'
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
  const bookScreen = state.screen.kind === 'book' ? state.screen : null
  const inlineAvailable = bookScreen !== null
    && state.mode === 'text'
    && !bookScreen.detail.scanOnly
  const translationBlocks = inlineAvailable && bookScreen && translation.enabled
    ? translationBlocksOf(bookScreen.content)
    : []
  const viewKey = inlineAvailable && bookScreen && translation.enabled
    ? `${bookScreen.detail.book.id}\u0000${bookScreen.content.chapterId}:${state.textPager.navigationToken}`
    : ''
  const anchorPageRef = React.useRef(0)
  const anchorKeyRef = React.useRef('')
  const anchorRevisionRef = React.useRef(0)
  translation.setViewKey(viewKey)

  React.useEffect(() => {
    if (!inlineAvailable || !translation.enabled || state.textPager.navigationPending) {
      anchorKeyRef.current = ''
      return
    }
    const run = () => {
      const container = state.contentRef.current
      const visible = visibleBlockIndices(container)
      const candidates = visible.size === 0
        ? translationBlocks
        : translationBlocks.filter(block => visible.has(block.index))
      const missing = candidates.filter(block => !translation.blocks[block.index])
      if (missing.length === 0) return
      if (anchorKeyRef.current === '') {
        anchorPageRef.current = state.textPager.page
        anchorKeyRef.current = viewKey
        anchorRevisionRef.current = translation.revision
      }
      void translation.translateAll(missing, viewKey)
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
    translation.blocks,
    translation.enabled,
    translation.provider,
    translation.targetLanguage,
    translation.translateAll,
    translationBlocks,
    state.contentRef,
    state.textPager.navigationPending,
    viewKey,
  ])

  React.useEffect(() => {
    if (anchorKeyRef.current === '') return
    if (anchorKeyRef.current !== viewKey) {
      anchorKeyRef.current = ''
      return
    }
    if (translation.revision === anchorRevisionRef.current) return
    const frame = (typeof requestAnimationFrame === 'function'
      ? requestAnimationFrame
      : (fn: () => void) => { fn(); return 0 })(() => {
      state.textPager.goToPage(anchorPageRef.current)
      anchorKeyRef.current = ''
    })
    return () => {
      if (typeof cancelAnimationFrame === 'function') cancelAnimationFrame(frame)
    }
  }, [state.textPager, translation.revision, viewKey])

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
    pageFrameStyle,
    visual,
    pageViews,
    loadedView,
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
    h('div', { className: 'dsh-readpilot-page-frame', ref: textPager.frameRef, style: pageFrameStyle },
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

  return h('div', { className: 'dsh-readpilot-sidebar-reader-root', ref: rootRef },
    h('div', { className: 'dsh-readpilot-sidebar-reader-head' },
      h('div', { className: 'dsh-readpilot-sidebar-reader-title', title: book.title }, book.title),
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
        }, t('sidebarOriginalMode')))),
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
