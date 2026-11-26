import { React } from '../../runtime.ts'
import { messageOf } from '../../lib/helpers.ts'
import type { CallRpc, TextFn } from '../../lib/types.ts'
import type { RoleScope, RoleState } from '../../../shared/contracts/role.ts'

interface RoleOptions {
  call: CallRpc
  t: TextFn
  activeBookId: string | null
  roleTabActive: boolean
}

export interface RoleControlState {
  status: RoleState | null
  loading: boolean
  error: string
  busy: boolean
  refresh: () => Promise<void>
  setEnabled: (enabled: boolean) => Promise<void>
  setBookEnabled: (enabled: boolean) => Promise<void>
  saveCard: (scope: RoleScope, text: string) => Promise<void>
  restoreHistory: (scope: RoleScope, id: string) => Promise<void>
  removeHistory: (scope: RoleScope, id: string) => Promise<void>
  clearHistory: (scope: RoleScope) => Promise<void>
  undo: (scope: RoleScope) => Promise<void>
  clear: (scope: RoleScope) => Promise<void>
}

export function useRole({ call, t, activeBookId, roleTabActive }: RoleOptions): RoleControlState {
  const [status, setStatus] = React.useState<RoleState | null>(null)
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
      const value = await call('role.status', { bookId })
      if (bookRef.current === bookId) setStatus(value as RoleState)
    } catch (cause) {
      if (bookRef.current === bookId) setError(`${t('roleFailed')}${t('errorSeparator')}${messageOf(cause, t)}`)
    } finally {
      setLoading(false)
    }
  }, [activeBookId, call, t])

  React.useEffect(() => {
    if (!activeBookId || !roleTabActive) return
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
  }, [activeBookId, roleTabActive, load])

  const run = React.useCallback(async (action: string, payload: Record<string, unknown> = {}) => {
    if (!activeBookId || busy) return
    const bookId = activeBookId
    setBusy(true)
    setError('')
    try {
      const value = await (call as any)(`role.${action}`, { ...payload, bookId })
      if (bookRef.current === bookId) setStatus(value as RoleState)
    } catch (cause) {
      if (bookRef.current === bookId) setError(`${t('roleFailed')}${t('errorSeparator')}${messageOf(cause, t)}`)
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
    setEnabled: enabled => run('setEnabled', { enabled }),
    setBookEnabled: enabled => run('setBookEnabled', { enabled }),
    saveCard: (scope, text) => run('write', { scope, text }),
    restoreHistory: (scope, id) => run('historyRestore', { scope, id }),
    removeHistory: (scope, id) => run('historyRemove', { scope, id }),
    clearHistory: scope => run('historyClear', { scope }),
    undo: scope => run('undo', { scope }),
    clear: scope => run('clear', { scope }),
  }
}
