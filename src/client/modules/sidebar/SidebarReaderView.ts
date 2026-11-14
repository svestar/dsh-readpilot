import { h } from '../../runtime.ts'
import { renderBlocks } from '../markdown/render.ts'
import { ReaderBar } from '../reader/ReaderBar.ts'
import { SelectionToolbar } from '../reader/SelectionNote.ts'
import { NoteDialog } from '../reader/SelectionNote.ts'
import { ActionHistory } from '../reader/ActionHistory.ts'
import { VisualReader } from '../reader/VisualReader.ts'
import { useSidebarReader } from './use-sidebar-reader.ts'
import type { SidebarReaderProps } from './use-sidebar-reader.ts'
import type { PageLayout } from '../reader/paging.ts'

export function SidebarReader(props: SidebarReaderProps) {
  const state = useSidebarReader(props)
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
      renderBlocks(screen.content.blocks, `sidebar-${screen.content.chapterId}`),
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
      : null)
}
