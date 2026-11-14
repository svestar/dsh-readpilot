import { h } from '../../runtime.ts'
import { Toc } from './Toc.ts'
import { ReaderBodyView } from './ReaderBodyView.ts'
import { ChatPanel } from '../companion/ChatPanel.ts'
import { ChatBody, ChatCompose } from '../companion/ChatContent.ts'
import { MemoryPanel } from '../companion/MemoryPanel.ts'
import { LongNotes } from '../notes/LongNotesView.ts'
import { NotesBody } from '../notes/NotesBodyView.ts'
import type { ReaderPanelModel } from './use-reader-panel.ts'
import type { TextFn } from '../../lib/types.ts'

interface ReaderBookProps {
  t: TextFn
  model: ReaderPanelModel
  NativeChatBoundary: any
}

/** Three-column book layout: TOC, reader body and the companion panel. */
export function ReaderBookView({ t, model, NativeChatBoundary }: ReaderBookProps) {
  const screen = model.screen
  if (screen.kind !== 'book') return null
  const { prefs, view, notes, companion, composer, longNotes, memory } = model

  const chatBody = h(ChatBody, {
    t,
    workspaceId: companion.workspaceId,
    hasMore: companion.hasMore,
    loadingEarlier: companion.loadingEarlier,
    loadEarlier: companion.loadEarlier,
    messages: companion.messages,
    sending: companion.sending,
    running: companion.running,
    chatBodyRef: companion.chatBodyRef,
  })
  const chatCompose = h(ChatCompose, {
    t,
    workspaceId: companion.workspaceId,
    draft: companion.draft,
    setDraft: companion.setDraft,
    sending: companion.sending,
    send: companion.send,
    chatInputRef: companion.chatInputRef,
  })
  const fallbackChat = h('div', { className: 'dsh-readpilot-chat-fallback' },
    chatBody,
    companion.chatError ? h('div', { className: 'dsh-readpilot-chat-error' }, companion.chatError) : null,
    chatCompose)

  const companionReference = companion.chatBinding?.reference
  const nativeChat = companionReference && model.SessionProvider && model.renderSlot
    ? h(NativeChatBoundary, { fallback: fallbackChat, onError: companion.handleNativeFallback },
      h(model.SessionProvider, { session: companionReference },
        model.renderSlot('dsh-readpilot.companion', {
          onReady: companion.handleNativeReady,
          onFallback: companion.handleNativeFallback,
          fallback: fallbackChat,
        })))
    : null

  const notesBody = h(NotesBody, {
    t,
    notesError: notes.notesError,
    notesLoading: notes.notesLoading,
    annotations: notes.annotations,
    bookmarks: notes.bookmarks,
    screen,
    openNote: notes.openNote,
    noteDeletingId: notes.noteDeletingId,
    deleteNote: notes.deleteNote,
  })
  const longNotesBody = h(LongNotes, {
    t,
    state: longNotes,
    noteContext: composer.noteContext,
    autoApply: composer.autoApply,
    useResource: model.useResource,
  })
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

  const chatPanel = h(ChatPanel, {
    t,
    chatOpen: companion.chatOpen,
    chatTab: companion.chatTab,
    setChatTab: companion.setChatTab,
    setChatOpen: companion.setChatOpen,
    notesBody,
    longNotesBody,
    memoryBody,
    chatBody,
    nativeChat,
    onPageJump: prefs.format === 'pdf' ? view.jumpToPage : null,
    chatError: companion.chatError,
    chatCompose,
    chatWidth: companion.chatWidth,
    minWidth: 360,
    maxWidth: 640,
    startResize: companion.startResize,
    moveResize: companion.moveResize,
    endResize: companion.endResize,
    resetResize: companion.resetResize,
    resizeKeyDown: companion.resizeKeyDown,
  })

  return h('div', {
    className: 'dsh-readpilot-book',
    'data-toc': prefs.tocOpen ? 'true' : 'false',
    'data-chat': companion.chatOpen ? 'true' : 'false',
    style: { '--dsh-readpilot-chat-width': `${companion.chatWidth}px` },
  },
  prefs.tocOpen ? h(Toc, {
    t,
    detail: screen.detail,
    activeChapter: screen.content.chapterId,
    activePage: view.pdfVisualPage,
    scanOnly: prefs.scanOnly,
    pageJump: prefs.supportedFormat === 'pdf' && !prefs.reflowMode,
    onSelect: (chapterId: string) => void view.selectChapter(screen.detail.book.id, chapterId),
    onPageSelect: (page: number) => void view.goPdfPage(page),
  }) : null,
  h(ReaderBodyView, {
    t,
    model,
    onHistory: () => {
      model.setHistoryOpen(true)
      void model.receipts.refresh()
    },
  }),
  companion.chatOpen
    ? h('button', {
      type: 'button',
      className: 'dsh-readpilot-chat-backdrop',
      'aria-label': t('closeChat'),
      onClick: () => companion.setChatOpen(false),
    })
    : null,
  chatPanel)
}
