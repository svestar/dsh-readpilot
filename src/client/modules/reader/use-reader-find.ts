import { React } from '../../runtime.ts'
import { useSearch } from './use-search.ts'
import { useChatJump } from './use-chat-jump.ts'
import { useContentSelection } from './use-content-selection.ts'
import { useSelectionDismiss } from './use-selection-dismiss.ts'
import type { ReaderView } from './use-reader-view.ts'
import type { CallRpc, Screen, Selection, TextFn } from '../../lib/types.ts'
import type { ReaderJumpTarget } from '../../../shared/jump-url.ts'
import type { StateSetter } from '../../runtime.ts'

interface ReaderFindOptions {
  call: CallRpc
  t: TextFn
  screen: Screen
  view: ReaderView
  selection: Selection | null
  setSelection: StateSetter<Selection | null>
  setChatError: StateSetter<string>
  setChatOpen: StateSetter<boolean>
  openOtherBook: (target: ReaderJumpTarget) => void
}

/** In-book search, chat jump links, selection capture and dismissal. */
export function useReaderFind({
  call,
  t,
  screen,
  view,
  selection,
  setSelection,
  setChatError,
  setChatOpen,
  openOtherBook,
}: ReaderFindOptions) {
  const activeBookId = screen.kind === 'book' ? screen.detail.book.id : null
  const search = useSearch({ call, screen, t, selectChapter: view.selectChapter })

  React.useEffect(() => {
    search.resetSearch()
  }, [activeBookId, search.resetSearch])

  useChatJump({
    call,
    screen,
    t,
    selectChapter: view.selectChapter,
    setChatError,
    setChatOpen,
    openOtherBook,
  })

  const onContentMouseUp = useContentSelection({ contentRef: view.contentRef, setSelection })
  useSelectionDismiss(selection, setSelection, view.epubFrameRef)

  return { ...search, onContentMouseUp }
}
