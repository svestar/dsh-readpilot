import { React } from '../../runtime.ts'
import { messageOf } from '../../lib/helpers.ts'
import { companionSessionTitle, renameCompanionSession } from './session-title.ts'
import type { CompanionSessionSummary } from '../../../shared/contracts/companion.ts'
import type { WorkspaceLanguage } from '../../../shared/contracts/library.ts'
import type { CallRpc, Screen, TextFn } from '../../lib/types.ts'
import type { StateSetter } from '../../runtime.ts'

interface CompanionSessionsOptions {
  runtime: any
  call: CallRpc
  t: TextFn
  screen: Screen
  workspaceId: string | null
  workspaceLanguage: WorkspaceLanguage
  activeSessionId: string | null
  boundSessionId: string | null
  chatOpen: boolean
  bindSession: (sessionId: string | null) => any
  applyNewSessionPolicy: (sessionId: string, reference: any) => Promise<void>
  rememberSession: (bookId: string, sessionId: string) => void
  forgetSession: (bookId: string) => void
  setChatOpen: StateSetter<boolean>
  setChatTab: StateSetter<string>
  setDraft: StateSetter<string>
  setChatError: StateSetter<string>
}

/** Catalog, creation and selection of companion conversations for one book. */
export function useCompanionSessions({
  runtime,
  call,
  t,
  screen,
  workspaceId,
  workspaceLanguage,
  activeSessionId,
  boundSessionId,
  chatOpen,
  bindSession,
  applyNewSessionPolicy,
  rememberSession,
  forgetSession,
  setChatOpen,
  setChatTab,
  setDraft,
  setChatError,
}: CompanionSessionsOptions) {
  const [conversations, setConversations] = React.useState<CompanionSessionSummary[]>([])
  const [conversationsLoading, setConversationsLoading] = React.useState(false)
  const [conversationsError, setConversationsError] = React.useState('')
  const [bindingBusy, setBindingBusy] = React.useState(false)
  const requestRef = React.useRef(0)
  const bookId = screen.kind === 'book' ? screen.detail.book.id : null
  const bookIdRef = React.useRef<string | null>(bookId)
  bookIdRef.current = bookId

  const refreshConversations = React.useCallback(async (targetBookId?: string): Promise<void> => {
    const requestedBookId = targetBookId ?? bookIdRef.current
    if (!requestedBookId) {
      setConversations([])
      return
    }
    const request = requestRef.current + 1
    requestRef.current = request
    setConversationsLoading(true)
    setConversationsError('')
    try {
      const value = await call('companionSessions', { bookId: requestedBookId })
      if (requestRef.current !== request || bookIdRef.current !== requestedBookId) return
      setConversations(Array.isArray(value?.sessions) ? value.sessions.slice() : [])
    } catch (cause) {
      if (requestRef.current === request && bookIdRef.current === requestedBookId) {
        setConversationsError(`${t('companionSessionsFailed')}：${messageOf(cause, t)}`)
      }
    } finally {
      if (requestRef.current === request && bookIdRef.current === requestedBookId) {
        setConversationsLoading(false)
      }
    }
  }, [call, t])

  React.useEffect(() => {
    if (!bookId || !chatOpen) {
      setConversations([])
      return
    }
    void refreshConversations(bookId)
  }, [bookId, chatOpen, refreshConversations])

  const createConversation = React.useCallback(async (): Promise<boolean> => {
    if (screen.kind !== 'book' || bindingBusy) return false
    if (!workspaceId) {
      setConversationsError(t('chatDisabled'))
      return false
    }
    const book = screen.detail.book
    // A blank conversation is already a new chat; reuse it instead of
    // filling the workspace with empty sessions.
    const currentSummary = boundSessionId
      ? runtime.sessions?.list?.getSnapshot?.()?.byId?.[boundSessionId]
      : null
    if (boundSessionId && currentSummary?.blank) {
      setChatTab('chat')
      setChatOpen(true)
      return true
    }
    setBindingBusy(true)
    setConversationsError('')
    try {
      let sessionId: string | undefined
      if (typeof runtime.sessions?.create === 'function') {
        try {
          sessionId = await runtime.sessions.create({ workspaceId })
        } catch {
          sessionId = undefined
        }
      }
      if (!sessionId && typeof runtime.uiWorkspace?.connectWorkspace === 'function') {
        sessionId = await runtime.uiWorkspace.connectWorkspace(workspaceId)
        try {
          runtime.layout?.selectPanel?.('dsh-readpilot')
        } catch {
          // The panel may already be mounted.
        }
      }
      if (!sessionId) throw new Error(t('loadFailed'))
      const binding = await call('session', { bookId: book.id, sessionId })
      for (const unboundBookId of binding?.unboundBookIds ?? []) forgetSession(unboundBookId)
      rememberSession(book.id, sessionId)
      const reference = bindSession(sessionId)
      if (!reference) throw new Error(t('loadFailed'))
      await applyNewSessionPolicy(sessionId, reference)
      setDraft('')
      setChatError('')
      setChatTab('chat')
      setChatOpen(true)
      await renameCompanionSession(runtime, sessionId, companionSessionTitle(book.title, workspaceLanguage)).catch(() => {})
      await refreshConversations(book.id)
      return true
    } catch (cause) {
      setConversationsError(`${t('companionSessionFailed')}：${messageOf(cause, t)}`)
      return false
    } finally {
      setBindingBusy(false)
    }
  }, [
    applyNewSessionPolicy,
    bindSession,
    bindingBusy,
    boundSessionId,
    call,
    forgetSession,
    refreshConversations,
    rememberSession,
    runtime,
    screen,
    setChatError,
    setChatOpen,
    setChatTab,
    setDraft,
    t,
    workspaceId,
    workspaceLanguage,
  ])

  const selectConversation = React.useCallback(async (sessionId: string): Promise<boolean> => {
    if (screen.kind !== 'book' || bindingBusy || !sessionId) return false
    if (sessionId === boundSessionId) return true
    const book = screen.detail.book
    setBindingBusy(true)
    setConversationsError('')
    try {
      const alive = await call('sessionAlive', { sessionId })
      if (alive?.alive === false) {
        setConversationsError(t('companionSessionMissing'))
        await refreshConversations(book.id)
        return false
      }
      const binding = await call('session', { bookId: book.id, sessionId })
      for (const unboundBookId of binding?.unboundBookIds ?? []) forgetSession(unboundBookId)
      rememberSession(book.id, sessionId)
      if (!bindSession(sessionId)) throw new Error(t('loadFailed'))
      setDraft('')
      setChatError('')
      setChatTab('chat')
      setChatOpen(true)
      await refreshConversations(book.id)
      return true
    } catch (cause) {
      setConversationsError(`${t('companionSessionFailed')}：${messageOf(cause, t)}`)
      return false
    } finally {
      setBindingBusy(false)
    }
  }, [
    bindSession,
    bindingBusy,
    boundSessionId,
    call,
    forgetSession,
    refreshConversations,
    rememberSession,
    screen,
    setChatError,
    setChatOpen,
    setChatTab,
    setDraft,
    t,
  ])

  const currentSessionTitle = React.useMemo(() => {
    const current = conversations.find(session => session.sessionId === activeSessionId)
    if (current?.title) return current.title
    return screen.kind === 'book' ? companionSessionTitle(screen.detail.book.title, workspaceLanguage) : ''
  }, [activeSessionId, conversations, screen, workspaceLanguage])

  return {
    conversations,
    conversationsLoading,
    conversationsError,
    bindingBusy,
    currentSessionTitle,
    refreshConversations,
    createConversation,
    selectConversation,
  }
}
