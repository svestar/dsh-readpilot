import { React } from '../../runtime.ts'
import { messageOf } from '../../lib/helpers.ts'
import { companionMode, useCompanion } from '../companion/use-companion.ts'
import type { CallRpc, Screen, Snapshot, TextFn } from '../../lib/types.ts'

interface ReaderCompanionOptions {
  runtime: any
  call: CallRpc
  t: TextFn
  screen: Screen
  snapshot: Snapshot | null
  hasProvider: boolean
  hasRenderSlot: boolean
  setError: (value: string) => void
  rememberSession: (bookId: string, sessionId: string) => void
  forgetSession: (bookId: string) => void
}

/** The companion session, native fallback and the workspace rail it opens into. */
export function useReaderCompanion({
  runtime,
  call,
  t,
  screen,
  snapshot,
  hasProvider,
  hasRenderSlot,
  setError,
  rememberSession,
  forgetSession,
}: ReaderCompanionOptions) {
  const activeBookId = screen.kind === 'book' ? screen.detail.book.id : null
  const activeSessionId = activeBookId && snapshot
    ? snapshot.sessions?.[activeBookId]?.sessionId ?? null
    : null
  const workspaceId = snapshot?.settings?.workspaceId ?? null
  const workspaceLanguage = snapshot?.settings?.workspaceLanguage ?? 'zh'

  const [nativeFailed, setNativeFailed] = React.useState(false)
  const nativeMode = companionMode(hasProvider, hasRenderSlot, nativeFailed) === 'native'
  const nativeInputRef = React.useRef<any>(null)

  const companion = useCompanion({
    runtime,
    call,
    t,
    screen,
    workspaceId,
    workspaceLanguage,
    activeSessionId,
    nativeMode,
    rememberSession,
    forgetSession,
  })

  const handleNativeReady = React.useCallback((value: any) => {
    nativeInputRef.current = value
  }, [])
  const handleNativeFallback = React.useCallback(() => setNativeFailed(true), [])

  const openReaderSidebar = React.useCallback((sessionId: string) => {
    const sidebar = runtime.sidebarRight
    if (!sessionId || !sidebar || typeof sidebar.openTab !== 'function' || typeof window === 'undefined') return
    let attempts = 0
    const schedule = () => {
      if (attempts++ >= 20) return
      window.setTimeout(attempt, 80)
    }
    const attempt = () => {
      const mounted = sidebar.mounted?.getSnapshot?.()
      if (typeof mounted === 'string' && mounted !== sessionId) {
        schedule()
        return
      }
      try {
        sidebar.openTab('dsh-readpilot')
      } catch {
        schedule()
      }
    }
    window.setTimeout(attempt, 0)
  }, [runtime])

  const [openingWorkspace, setOpeningWorkspace] = React.useState(false)
  const openWorkspace = React.useCallback(async () => {
    if (screen.kind !== 'book' || openingWorkspace) return
    setOpeningWorkspace(true)
    setError('')
    try {
      const sessionId = await companion.ensureSession()
      runtime.uiWorkspace.openSession(sessionId)
      openReaderSidebar(sessionId)
    } catch (cause) {
      setError(`${t('openWorkspaceFailed')}：${messageOf(cause, t)}`)
    } finally {
      setOpeningWorkspace(false)
    }
  }, [companion.ensureSession, openReaderSidebar, openingWorkspace, runtime, screen, setError, t])

  return {
    ...companion,
    activeBookId,
    activeSessionId,
    workspaceId,
    workspaceLanguage,
    nativeMode,
    nativeInputRef,
    handleNativeReady,
    handleNativeFallback,
    openingWorkspace,
    openWorkspace,
  }
}
