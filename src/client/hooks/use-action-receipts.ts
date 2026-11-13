import { React } from '../runtime.ts'
import type { CallRpc } from '../types.ts'
import type { ReaderActionReceipt } from '../../reading/actions.ts'

interface ActionReceiptOptions {
  call: CallRpc
  bookId?: string | null
  onUndone?: () => Promise<void> | void
  intervalMs?: number
}

/** Poll recent agent receipts for the operation history panel. */
export function useActionReceipts({ call, bookId, onUndone, intervalMs = 2000 }: ActionReceiptOptions) {
  const [receipts, setReceipts] = React.useState<ReaderActionReceipt[]>([])
  const [busyId, setBusyId] = React.useState<string | null>(null)
  const undoneRef = React.useRef(onUndone)
  undoneRef.current = onUndone

  const load = React.useCallback(async () => {
    try {
      const value = await call('readerReceipts', {
        action: 'list',
        ...(bookId ? { bookId } : {}),
        limit: 50,
      })
      setReceipts(Array.isArray(value.receipts) ? value.receipts : [])
    } catch {
      // Old Host builds may not expose receipts; keep the panel empty.
    }
  }, [bookId, call])

  React.useEffect(() => {
    let stopped = false
    const tick = () => {
      if (!stopped) void load()
    }
    void load()
    const timer = window.setInterval(tick, intervalMs)
    return () => {
      stopped = true
      window.clearInterval(timer)
    }
  }, [intervalMs, load])

  const undo = React.useCallback(async (receiptId: string) => {
    if (busyId) return
    setBusyId(receiptId)
    try {
      await call('readerReceipts', { action: 'undo', receiptId })
      await undoneRef.current?.()
      await load()
    } catch (error) {
      console.warn('dsh-readpilot: undo failed', error)
    } finally {
      setBusyId(null)
    }
  }, [busyId, call, load])

  return { receipts, busyId, undo, refresh: load }
}
