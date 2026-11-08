import { React } from '../runtime.ts'
import type { CallRpc } from '../types.ts'
import type { ReaderActionReceipt } from '../../reader-actions.ts'

const SEEN_RECEIPTS = new Set<string>()

interface ActionReceiptOptions {
  call: CallRpc
  bookId?: string | null
  onUndone?: () => Promise<void> | void
  intervalMs?: number
}

/** Poll recent agent receipts and expose one undoable toast at a time. */
export function useActionReceipts({ call, bookId, onUndone, intervalMs = 1000 }: ActionReceiptOptions) {
  const [toast, setToast] = React.useState<{ id: string; text: string } | null>(null)
  const undoneRef = React.useRef(onUndone)
  undoneRef.current = onUndone

  React.useEffect(() => {
    let stopped = false
    const startedAt = Date.now() - 60_000
    const tick = async () => {
      if (stopped) return
      try {
        const value = await call('readerReceipts', {
          action: 'list',
          ...(bookId ? { bookId } : {}),
          limit: 10,
        })
        const next = (value.receipts ?? []).find((receipt: ReaderActionReceipt) =>
          receipt.undoable
          && !receipt.undoneAt
          && receipt.createdAt >= startedAt
          && !SEEN_RECEIPTS.has(receipt.id))
        if (!next) return
        SEEN_RECEIPTS.add(next.id)
        setToast({ id: next.id, text: next.summary })
      } catch {
        // Old Host builds may not expose receipts; polling stays silent.
      }
    }
    const timer = window.setInterval(() => void tick(), intervalMs)
    void tick()
    return () => {
      stopped = true
      window.clearInterval(timer)
    }
  }, [bookId, call, intervalMs])

  const undo = React.useCallback(async () => {
    if (!toast) return
    const id = toast.id
    setToast(null)
    try {
      await call('readerReceipts', { action: 'undo', receiptId: id })
      await undoneRef.current?.()
    } catch (error) {
      console.warn('dsh-readpilot: undo failed', error)
    }
  }, [call, toast])

  const dismiss = React.useCallback(() => setToast(null), [])

  return { toast, undo, dismiss }
}
