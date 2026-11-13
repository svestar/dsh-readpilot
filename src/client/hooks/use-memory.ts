import { React } from '../common/runtime.ts'
import { messageOf } from '../common/helpers.ts'
import type { CallRpc, TextFn } from '../common/types.ts'
import type { BookMemoryState, MemoryMode, MemoryScope, MemoryView } from '../companion/memory-panel.ts'

interface MemoryOptions {
  call: CallRpc
  t: TextFn
  activeBookId: string | null
  notesTabActive: boolean
}

export interface MemoryState {
  status: MemoryView | null
  loading: boolean
  error: string
  busy: boolean
  refresh: () => Promise<void>
  setMode: (mode: MemoryMode) => Promise<void>
  setBookState: (state: BookMemoryState) => Promise<void>
  saveCard: (scope: MemoryScope, text: string) => Promise<void>
  undo: (scope: MemoryScope) => Promise<void>
  clear: (scope: MemoryScope) => Promise<void>
}

export function useMemory({ call, t, activeBookId, notesTabActive }: MemoryOptions): MemoryState {
  const [status, setStatus] = React.useState<MemoryView | null>(null)
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState('')
  const [busy, setBusy] = React.useState(false)
  const bookRef = React.useRef<string | null>(activeBookId)

  React.useEffect(() => {
    bookRef.current = activeBookId
    setStatus(null)
    setError('')
  }, [activeBookId])

  const load = React.useCallback(async () => {
    if (!activeBookId) {
      setStatus(null)
      return
    }
    const bookId = activeBookId
    setLoading(true)
    setError('')
    try {
      const value = await call('memory.status', { bookId })
      if (bookRef.current === bookId) setStatus(value as MemoryView)
    } catch (cause) {
      if (bookRef.current === bookId) setError(`${t('memoryFailed')}：${messageOf(cause)}`)
    } finally {
      setLoading(false)
    }
  }, [activeBookId, call, t])

  React.useEffect(() => {
    if (!activeBookId || !notesTabActive) return
    let cancelled = false
    const tick = () => {
      if (!cancelled) void load()
    }
    tick()
    const timer = window.setInterval(tick, 5000)
    return () => {
      cancelled = true
      window.clearInterval(timer)
    }
  }, [activeBookId, notesTabActive, load])

  const run = React.useCallback(async (action: string, payload: Record<string, unknown> = {}) => {
    if (!activeBookId || busy) return
    const bookId = activeBookId
    setBusy(true)
    setError('')
    try {
      const value = await (call as any)(`memory.${action}`, { ...payload, bookId })
      if (bookRef.current === bookId) setStatus(value as MemoryView)
    } catch (cause) {
      if (bookRef.current === bookId) setError(`${t('memoryFailed')}：${messageOf(cause)}`)
    } finally {
      setBusy(false)
    }
  }, [activeBookId, busy, call, t])

  return {
    status,
    loading,
    error,
    busy,
    refresh: () => run('status'),
    setMode: mode => run('setMode', { mode }),
    setBookState: state => run('setBook', { state }),
    saveCard: (scope, text) => run('write', { scope, text }),
    undo: scope => run('undo', { scope }),
    clear: scope => run('clear', { scope }),
  }
}
