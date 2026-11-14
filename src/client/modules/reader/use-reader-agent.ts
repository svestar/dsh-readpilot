import { React } from '../../runtime.ts'
import { useReaderActions } from './use-reader-actions.ts'
import { useActionReceipts } from './use-action-receipts.ts'
import type { ReaderView } from './use-reader-view.ts'
import type { CallRpc, Screen } from '../../lib/types.ts'
import type { ReaderAction } from '../../../shared/contracts/actions.ts'

interface ReaderAgentOptions {
  call: CallRpc
  screen: Screen
  view: ReaderView
  loadNotes: () => Promise<void>
  refresh: () => Promise<void>
  openOtherBook: (target: { bookId: string; chapterId: string; offset?: number }) => void
}

/** Host-pushed reader actions and the undoable receipt history. */
export function useReaderAgent({ call, screen, view, loadNotes, refresh, openOtherBook }: ReaderAgentOptions) {
  const activeBookId = screen.kind === 'book' ? screen.detail.book.id : null

  const onReaderAction = React.useCallback(async (action: ReaderAction) => {
    if (action.type === 'libraryRefresh') {
      await refresh()
      return
    }
    if (action.type === 'notesRefresh') {
      if (action.bookId === activeBookId) await loadNotes()
      return
    }
    if (!action.bookId || !action.chapterId) return
    if (action.bookId === activeBookId) {
      await view.selectChapter(action.bookId, action.chapterId, {
        ...(typeof action.offset === 'number' ? { offset: action.offset } : {}),
        flash: true,
      })
    } else {
      openOtherBook({ bookId: action.bookId, chapterId: action.chapterId, offset: action.offset })
    }
  }, [activeBookId, loadNotes, openOtherBook, refresh, view.selectChapter])

  useReaderActions({ call, bookId: activeBookId, onAction: onReaderAction })

  const receipts = useActionReceipts({
    call,
    bookId: activeBookId,
    onUndone: async () => {
      await refresh()
      if (activeBookId) await loadNotes()
    },
  })

  return receipts
}
