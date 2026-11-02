import { React } from '../runtime.js'
import {
  CHAT_WIDTH_DEFAULT,
  clampChatWidth,
  foldTranscript,
  messageOf,
  readChatWidth,
  saveChatWidth,
} from '../helpers.js'

export function useCompanion({
  runtime,
  call,
  t,
  screen,
  workspaceId,
  activeSessionId,
  rememberSession,
}) {
  const [chatOpen, setChatOpen] = React.useState(() => (typeof window !== 'undefined' ? window.innerWidth > 1100 : true))
  const [chatWidth, setChatWidth] = React.useState(readChatWidth)
  const [draft, setDraft] = React.useState('')
  const [sending, setSending] = React.useState(false)
  const [chatError, setChatError] = React.useState('')
  const [entries, setEntries] = React.useState([])
  const [hasMore, setHasMore] = React.useState(false)
  const [loadingEarlier, setLoadingEarlier] = React.useState(false)
  const [chatBinding, setChatBinding] = React.useState(null)
  const [chatTab, setChatTab] = React.useState('chat')
  const chatRef = React.useRef(null)
  const chatBodyRef = React.useRef(null)
  const chatInputRef = React.useRef(null)
  const dragRef = React.useRef(null)
  const chatWidthRef = React.useRef(chatWidth)
  chatWidthRef.current = chatWidth

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

  const bindSession = React.useCallback(sessionId => {
    if (!sessionId) {
      releaseChat()
      return null
    }
    if (chatRef.current?.sessionId === sessionId) return chatRef.current.reference
    releaseChat()
    setChatError('')
    let reference
    try {
      reference = runtime.sessions.retain(sessionId, { source: 'controllerOperation' })
    } catch (error) {
      setChatError(`${t('loadFailed')}：${messageOf(error)}`)
      return null
    }
    const source = reference.binding.eventSource
    const update = () => {
      const value = source.getSnapshot()
      setEntries(value.entries)
      setHasMore(value.hasMore)
    }
    update()
    const unsubscribe = source.subscribe(update)
    const record = { sessionId, reference, unsubscribe }
    chatRef.current = record
    setChatBinding(record)
    reference.ready.catch(error => {
      if (chatRef.current === record) {
        setChatError(`${t('loadFailed')}：${messageOf(error)}`)
      }
    })
    return reference
  }, [releaseChat, runtime, t])

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
    React.useCallback(callback => {
      const reference = chatBinding?.reference
      return reference ? reference.binding.session.subscribe(callback) : () => {}
    }, [chatBinding]),
    React.useCallback(() => chatBinding?.reference?.binding.session.getSnapshot() ?? null, [chatBinding]),
  )
  const running = Boolean(sessionSnapshot?.running)
  const messages = React.useMemo(() => foldTranscript(entries).slice(-50), [entries])

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
      let sessionId
      if (typeof runtime.sessions.create === 'function') {
        try {
          sessionId = await runtime.sessions.create({ workspaceId })
        } catch {
          sessionId = undefined
        }
      }
      if (!sessionId) {
        sessionId = await runtime.uiWorkspace.connectWorkspace(workspaceId)
        runtime.layout.selectPanel('dsh-reader')
      }
      await call('session', { bookId: book.id, sessionId })
      rememberSession(book.id, sessionId)
      const reference = bindSession(sessionId)
      if (!reference) throw new Error(t('loadFailed'))
      return reference
    }

    try {
      let reference = chatRef.current?.reference
      if (!reference) reference = await createSession()
      try {
        await reference.ready
      } catch {
        await call('session', { bookId: book.id, sessionId: null }).catch(() => {})
        releaseChat()
        reference = await createSession()
        await reference.ready
      }
      const result = await reference.binding.session.prompt([{ type: 'text', text }], 'queue')
      if (result && result.ok === false) {
        throw new Error(result.error?.message ?? t('sendFailed'))
      }
      setDraft('')
    } catch (error) {
      setChatError(`${t('sendFailed')}：${messageOf(error)}`)
    } finally {
      setSending(false)
    }
  }, [draft, sending, screen, workspaceId, rememberSession, bindSession, releaseChat, runtime, call, t])

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

  React.useEffect(() => {
    const onResize = () => {
      if (window.innerWidth > 1100) {
        setChatWidth(current => clampChatWidth(current, window.innerWidth))
      }
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  const startResize = React.useCallback(event => {
    if (event.button !== 0) return
    event.preventDefault()
    try {
      event.currentTarget.setPointerCapture(event.pointerId)
    } catch {
      // Pointer capture is an optimization; dragging still works without it.
    }
    dragRef.current = { startX: event.clientX, startWidth: chatWidth }
  }, [chatWidth])

  const moveResize = React.useCallback(event => {
    const drag = dragRef.current
    if (!drag) return
    const next = clampChatWidth(drag.startWidth - (event.clientX - drag.startX), window.innerWidth)
    setChatWidth(next)
  }, [])

  const endResize = React.useCallback(event => {
    if (!dragRef.current) return
    dragRef.current = null
    try {
      event.currentTarget.releasePointerCapture(event.pointerId)
    } catch {
      // The pointer may already be released.
    }
    saveChatWidth(chatWidthRef.current)
  }, [])

  const resetResize = React.useCallback(() => {
    setChatWidth(CHAT_WIDTH_DEFAULT)
    saveChatWidth(CHAT_WIDTH_DEFAULT)
  }, [])

  const resizeKeyDown = React.useCallback(event => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return
    event.preventDefault()
    const delta = event.key === 'ArrowLeft' ? 24 : -24
    const next = clampChatWidth(chatWidthRef.current + delta, window.innerWidth)
    setChatWidth(next)
    saveChatWidth(next)
  }, [])

  return {
    chatOpen,
    setChatOpen,
    chatWidth,
    draft,
    setDraft,
    sending,
    chatError,
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
    send,
    loadEarlier,
    startResize,
    moveResize,
    endResize,
    resetResize,
    resizeKeyDown,
  }
}
