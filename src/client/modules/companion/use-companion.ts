import { React } from '../../runtime.ts'
import { foldTranscript, messageOf } from '../../lib/helpers.ts'
import { isMissingSessionError } from './session-recovery.ts'
import { companionSessionTitle, renameCompanionSession } from './session-title.ts'
import { useChatResize } from './use-chat-resize.ts'
import type { CallRpc, ChatMessage, Screen, TextFn } from '../../lib/types.ts'

interface ChatBinding {
  sessionId: string
  reference: any
  nativeMode: boolean
  unsubscribe: () => void
}

export type CompanionMode = 'native' | 'fallback'

/** Native rendering owns the transcript; folding is only needed for the fallback. */
export function companionMode(hasProvider: boolean, hasRenderSlot: boolean, nativeFailed: boolean): CompanionMode {
  return hasProvider && hasRenderSlot && !nativeFailed ? 'native' : 'fallback'
}

interface CompanionOptions {
  runtime: any
  call: CallRpc
  t: TextFn
  screen: Screen
  workspaceId: string | null
  activeSessionId: string | null
  nativeMode: boolean
  rememberSession: (bookId: string, sessionId: string) => void
  forgetSession: (bookId: string) => void
}

export function useCompanion({
  runtime,
  call,
  t,
  screen,
  workspaceId,
  activeSessionId,
  nativeMode,
  rememberSession,
  forgetSession,
}: CompanionOptions) {
  const [chatOpen, setChatOpen] = React.useState<boolean>(() => (typeof window !== 'undefined' ? window.innerWidth > 1100 : true))

  const chat = useChatResize()

  const [draft, setDraft] = React.useState('')
  const [sending, setSending] = React.useState(false)
  const [chatError, setChatError] = React.useState('')
  const [entries, setEntries] = React.useState<any[]>([])
  const [hasMore, setHasMore] = React.useState(false)
  const [eventSeq, setEventSeq] = React.useState(0)
  const [loadingEarlier, setLoadingEarlier] = React.useState(false)
  const [chatBinding, setChatBinding] = React.useState<any>(null)
  const [chatTab, setChatTab] = React.useState('chat')
  const chatRef = React.useRef<ChatBinding | null>(null)
  const titledKeyRef = React.useRef('')
  const chatBodyRef = React.useRef<HTMLDivElement | null>(null)
  const chatInputRef = React.useRef<HTMLTextAreaElement | null>(null)

  const disposeChat = React.useCallback(() => {
    const current = chatRef.current
    chatRef.current = null
    if (!current) return
    try {
      current.unsubscribe()
    } catch {
      // The event source may already be disposed with its session.
    }
    try {
      current.reference.release()
    } catch {
      // The session may already be gone.
    }
  }, [])

  const releaseChat = React.useCallback(() => {
    disposeChat()
    setChatBinding(null)
    setEntries([])
    setHasMore(false)
  }, [disposeChat])

  const invalidateSession = React.useCallback((bookId: string) => {
    setChatError(t('chatSessionLost'))
    forgetSession(bookId)
    void call('session', { bookId, sessionId: null }).catch(() => {})
  }, [call, forgetSession, t])

  const bindSession = React.useCallback((sessionId: string | null) => {
    if (!sessionId) {
      releaseChat()
      return null
    }
    if (chatRef.current?.sessionId === sessionId && chatRef.current.nativeMode === nativeMode) {
      return chatRef.current.reference
    }
    releaseChat()
    setChatError('')
    let reference: any
    try {
      reference = runtime.sessions.retain(sessionId, { source: 'controllerOperation' })
    } catch (error) {
      if (isMissingSessionError(error) && screen.kind === 'book') {
        releaseChat()
        invalidateSession(screen.detail.book.id)
      } else {
        setChatError(`${t('loadFailed')}：${messageOf(error)}`)
      }
      return null
    }
    const source = reference.binding.eventSource
    const record: ChatBinding = { sessionId, reference, nativeMode, unsubscribe: () => {} }
    if (nativeMode) {
      let lastSeq = -1
      let lastAt = 0
      let timer = 0
      const flush = () => {
        timer = 0
        if (lastSeq >= 0) setEventSeq(lastSeq)
      }
      const update = () => {
        const value = source.getSnapshot()
        const seq = value.entries.length ? value.entries[value.entries.length - 1]?.event?.seq ?? 0 : 0
        if (seq === lastSeq) return
        lastSeq = seq
        const now = Date.now()
        if (now - lastAt >= 500) {
          lastAt = now
          setEventSeq(seq)
          return
        }
        if (!timer) timer = window.setTimeout(flush, Math.max(0, 500 - (now - lastAt)))
      }
      const unsubscribeSource = source.subscribe(update)
      record.unsubscribe = () => {
        unsubscribeSource()
        if (timer) window.clearTimeout(timer)
      }
      update()
    } else {
      const update = () => {
        const value = source.getSnapshot()
        setEntries(value.entries)
        setHasMore(value.hasMore)
        setEventSeq(value.entries.length ? value.entries[value.entries.length - 1]?.event?.seq ?? 0 : 0)
      }
      update()
      record.unsubscribe = source.subscribe(update)
    }
    chatRef.current = record
    setChatBinding(record)
    reference.ready.then(() => {
      if (chatRef.current !== record) return
      void call('companionPolicy', { sessionId }).catch(() => {})
    }).catch((error: unknown) => {
      if (chatRef.current === record) {
        if (isMissingSessionError(error) && screen.kind === 'book') {
          releaseChat()
          invalidateSession(screen.detail.book.id)
        } else {
          setChatError(`${t('loadFailed')}：${messageOf(error)}`)
        }
      }
    })
    return reference
  }, [nativeMode, releaseChat, runtime, t, call, screen, invalidateSession])

  React.useEffect(() => {
    if (!activeSessionId) {
      releaseChat()
      return
    }
    bindSession(activeSessionId)
  }, [activeSessionId, bindSession, releaseChat])

  React.useEffect(() => () => disposeChat(), [disposeChat])

  const lastEntrySeq = entries.length > 0 ? entries[entries.length - 1]?.event?.seq ?? null : null

  React.useEffect(() => {
    const element = chatBodyRef.current
    if (element) element.scrollTop = element.scrollHeight
  }, [lastEntrySeq, sending, chatBinding, chatOpen, chatTab])

  const sessionSnapshot = React.useSyncExternalStore(
    React.useCallback((callback: () => void) => {
      const reference = chatBinding?.reference
      return reference ? reference.binding.session.subscribe(callback) : () => {}
    }, [chatBinding]),
    React.useCallback(() => chatBinding?.reference?.binding.session.getSnapshot() ?? null, [chatBinding]),
  )
  const running = Boolean(sessionSnapshot?.running)
  const messages: ChatMessage[] = React.useMemo(
    () => nativeMode ? [] : foldTranscript(entries).slice(-50),
    [entries, nativeMode],
  )

  React.useEffect(() => {
    if (screen.kind !== 'book') return
    const sessionId = chatBinding?.sessionId ?? activeSessionId
    if (!sessionId) return
    const title = companionSessionTitle(screen.detail.book.title)
    const key = `${sessionId}\u0000${title}`
    if (titledKeyRef.current === key) return
    titledKeyRef.current = key
    void renameCompanionSession(runtime, sessionId, title).catch(() => {
      if (titledKeyRef.current === key) titledKeyRef.current = ''
    })
  }, [activeSessionId, chatBinding, runtime, screen])

  const ensureSession = React.useCallback(async (): Promise<string> => {
    if (screen.kind !== 'book') throw new Error(t('chatDisabled'))
    if (!workspaceId) throw new Error(t('chatDisabled'))
    const book = screen.detail.book
    const existing = chatRef.current?.sessionId ?? activeSessionId ?? undefined
    if (existing) {
      let alive = false
      try {
        alive = (await call('sessionAlive', { sessionId: existing })).alive !== false
      } catch {
        alive = false
      }
      if (alive && bindSession(existing)) {
        await renameCompanionSession(runtime, existing, companionSessionTitle(book.title)).catch(() => {})
        return existing
      }
      await call('session', { bookId: book.id, sessionId: null }).catch(() => {})
      forgetSession(book.id)
      releaseChat()
    }
    let sessionId: string | undefined
    if (typeof runtime.sessions.create === 'function') {
      try {
        sessionId = await runtime.sessions.create({ workspaceId })
      } catch {
        sessionId = undefined
      }
    }
    if (!sessionId) {
      sessionId = await runtime.uiWorkspace.connectWorkspace(workspaceId)
      runtime.layout.selectPanel('dsh-readpilot')
    }
    const session = sessionId as string
    await call('session', { bookId: book.id, sessionId: session })
    rememberSession(book.id, session)
    const reference = bindSession(session)
    if (!reference) throw new Error(t('loadFailed'))
    await renameCompanionSession(runtime, session, companionSessionTitle(book.title)).catch(() => {})
    return session
  }, [activeSessionId, bindSession, call, forgetSession, releaseChat, rememberSession, runtime, screen, t, workspaceId])

  const send = React.useCallback(async () => {
    const text = draft.trim()
    if (!text || sending || screen.kind !== 'book') return
    if (!workspaceId) {
      setChatError(t('chatDisabled'))
      return
    }
    const book = screen.detail.book
    setChatError('')
    setSending(true)

    const createSession = async () => {
      await ensureSession()
      const reference = chatRef.current?.reference
      if (!reference) throw new Error(t('loadFailed'))
      return reference
    }

    const runPrompt = async (reference: any) => {
      await reference.ready
      const result = await reference.binding.session.prompt([{ type: 'text', text }], 'queue')
      if (result && result.ok === false) {
        throw new Error(result.error?.message ?? t('sendFailed'))
      }
    }

    const sessionArchived = async (sessionId: string) => {
      try {
        const result = await call('sessionAlive', { sessionId })
        return result.alive === false
      } catch {
        return false
      }
    }

    try {
      const current = chatRef.current?.sessionId ?? activeSessionId
      if (current && await sessionArchived(current)) {
        await call('session', { bookId: book.id, sessionId: null }).catch(() => {})
        forgetSession(book.id)
        releaseChat()
        setChatError(t('chatSessionLost'))
      }
      let reference = chatRef.current?.reference
      if (!reference) reference = await createSession()
      try {
        await runPrompt(reference)
      } catch (error) {
        if (!isMissingSessionError(error)) throw error
        await call('session', { bookId: book.id, sessionId: null }).catch(() => {})
        forgetSession(book.id)
        releaseChat()
        reference = await createSession()
        setChatError('')
        await runPrompt(reference)
      }
      setChatError('')
      setDraft('')
    } catch (error) {
      setChatError(`${t('sendFailed')}：${messageOf(error)}`)
    } finally {
      setSending(false)
    }
  }, [draft, ensureSession, sending, screen, workspaceId, activeSessionId, rememberSession, forgetSession, bindSession, releaseChat, runtime, call, t])

  const loadEarlier = React.useCallback(async () => {
    const reference = chatRef.current?.reference
    if (!reference || loadingEarlier) return
    setLoadingEarlier(true)
    setChatError('')
    try {
      await reference.binding.session.loadOlder()
    } catch (error) {
      setChatError(`${t('loadFailed')}：${messageOf(error)}`)
    } finally {
      setLoadingEarlier(false)
    }
  }, [loadingEarlier, t])

  return {
    chatOpen,
    setChatOpen,
    ...chat,
    draft,
    setDraft,
    sending,
    chatError,
    setChatError,
    entries,
    hasMore,
    loadingEarlier,
    chatBinding,
    chatTab,
    setChatTab,
    chatBodyRef,
    chatInputRef,
    running,
    messages,
    eventSeq,
    send,
    ensureSession,
    loadEarlier,
  }
}
