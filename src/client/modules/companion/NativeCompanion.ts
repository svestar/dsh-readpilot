import { React } from '../../runtime.ts'

/** Local boundary keeps a failing Factory occurrence from taking down the reader. */
export function createNativeChatBoundary(): any {
  if (typeof React.Component !== 'function') {
    return function NativeChatBoundaryPassthrough({ children }: { children?: any }) {
      return children
    }
  }
  const Base: new (...args: any[]) => any = React.Component
  return class NativeChatBoundary extends Base {
    declare state: { failed: boolean }
    declare props: { children?: any; fallback?: any; onError?: () => void }

    constructor(props: any) {
      super(props)
      this.state = { failed: false }
    }

    static getDerivedStateFromError() {
      return { failed: true }
    }

    componentDidCatch(error: any, info: any) {
      console.error('dsh-readpilot: native companion failed', error, info)
      this.props.onError?.()
    }

    render() {
      if (this.state.failed) return this.props.fallback ?? null
      return this.props.children
    }
  }
}

/** Fixed Chat selection used by an embedded Conversation occurrence. */
function FixedChatView(props: any) {
  return props.renderSlot('conversation.session', { view: 'chat' })
}

/**
 * Render the shared Conversation content for the book's Session.
 * The surrounding SessionProvider supplies the Session; this component only
 * selects the embedded occurrence and fixes the local View to Chat.
 */
export function NativeCompanion(props: any) {
  const {
    renderFactorySlot,
    useSession,
    useConversation,
    useSessions,
    sessionId,
    inputActions,
    onReady,
    onFallback,
    fallback,
  } = props

  React.useEffect(() => {
    if (typeof onReady === 'function') onReady({ inputActions })
    return () => {
      if (typeof onReady === 'function') onReady(null)
    }
  }, [inputActions, onReady])

  const session = useSession((value: any) => value)
  const conversation = useConversation((value: any) => value)
  const summaryBlank = useSessions((state: any) => state?.byId?.[sessionId]?.blank)

  const unavailable = typeof renderFactorySlot !== 'function' || sessionId === undefined
  React.useEffect(() => {
    if (unavailable && typeof onFallback === 'function') onFallback()
  }, [unavailable, onFallback])

  if (unavailable) {
    return fallback ?? null
  }

  const activeTargets = conversation?.activeTargets
  const shellPhase = (activeTargets && typeof activeTargets.size === 'number' && activeTargets.size > 0)
    || (!session?.blank && !session?.awaitingFirstTurn)
    || session?.running
    ? 'active'
    : session?.promptAttempted
      ? 'engaging'
      : 'blank'
  const settling = shellPhase === 'blank' && session?.openState === 'loading' && summaryBlank !== true
  const hero = shellPhase === 'blank' && (session?.openState === 'open' || summaryBlank === true)
  const rendered = renderFactorySlot(
    'conversation.content',
    { variant: 'embedded', phase: settling ? 'settling' : hero ? 'hero' : 'active', hero },
    { slots: { views: FixedChatView } },
  )
  return rendered ?? fallback ?? null
}
