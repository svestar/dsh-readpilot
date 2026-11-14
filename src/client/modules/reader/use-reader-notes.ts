import { useLongNotes } from '../notes/use-long-notes.ts'
import { useMemory } from '../companion/use-memory.ts'
import { useNotes } from '../notes/use-notes.ts'
import type { ReaderView } from './use-reader-view.ts'
import type { ReaderPreferences } from './use-reader-preferences.ts'
import type { CallRpc, ChatMessage, Screen, Selection, TextFn } from '../../lib/types.ts'
import type { StateSetter } from '../../runtime.ts'

interface ReaderNotesOptions {
  call: CallRpc
  t: TextFn
  screen: Screen
  prefs: ReaderPreferences
  view: ReaderView
  selection: Selection | null
  setSelection: StateSetter<Selection | null>
  chatOpen: boolean
  chatTab: string
  messages: ChatMessage[]
  nativeMode: boolean
  eventSeq: number
}

/** Annotations, long notes and memory state for the current book. */
export function useReaderNotes({
  call,
  t,
  screen,
  prefs,
  view,
  selection,
  setSelection,
  chatOpen,
  chatTab,
  messages,
  nativeMode,
  eventSeq,
}: ReaderNotesOptions) {
  const activeBookId = screen.kind === 'book' ? screen.detail.book.id : null
  const lastMessage = messages[messages.length - 1]
  const chatVersion = nativeMode
    ? `native:${eventSeq}`
    : `${messages.length}:${lastMessage?.key ?? ''}:${lastMessage?.text.length ?? 0}`

  const longNotes = useLongNotes({
    call,
    t,
    activeBookId,
    notesTabActive: chatTab === 'long',
    draftWatch: chatOpen,
    chatVersion,
  })
  const memory = useMemory({ call, t, activeBookId, notesTabActive: chatTab === 'memory' })

  const notes = useNotes({
    call,
    t,
    screen,
    activeBookId,
    activeChapterId: view.activeChapterId,
    visual: view.visual,
    pageView: view.pageView,
    pageViews: view.pageViews,
    palette: prefs.palette,
    fontSize: prefs.fontSize,
    paged: prefs.effectiveMode === 'paged',
    layout: prefs.pageLayout,
    contentRef: view.contentRef,
    epubFrameRef: view.epubFrameRef,
    epubReady: view.epubReady,
    selection,
    setSelection,
    selectChapter: view.selectChapter,
  })

  return { longNotes, memory, notes, activeBookId }
}
