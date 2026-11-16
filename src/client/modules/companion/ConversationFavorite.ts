import { React, h } from '../../runtime.ts'
import type { CallRpc, TextFn } from '../../lib/types.ts'

interface ConversationFavoriteProps {
  t: TextFn
  call: CallRpc
  sessionId: string
  messageId: string
}

type FavoriteStatus = 'idle' | 'saving' | 'saved' | 'error'

const bookCache = new Map<string, Promise<{ bookId: string; title?: string } | null>>()

function lookupBook(call: CallRpc, sessionId: string) {
  const cached = bookCache.get(sessionId)
  if (cached) return cached
  const pending = call('sessionBook', { sessionId })
    .then(value => (value && typeof value.bookId === 'string' ? value : null))
    .catch(() => null)
  bookCache.set(sessionId, pending)
  void pending.then(value => {
    if (!value && bookCache.get(sessionId) === pending) bookCache.delete(sessionId)
  })
  return pending
}

/** Star one finalized companion answer as a topic long note. */
export function ConversationFavorite({ t, call, sessionId, messageId }: ConversationFavoriteProps) {
  const [book, setBook] = React.useState<{ bookId: string } | null | undefined>(undefined)
  const [status, setStatus] = React.useState<FavoriteStatus>('idle')
  const [error, setError] = React.useState('')

  React.useEffect(() => {
    let cancelled = false
    setBook(undefined)
    lookupBook(call, sessionId).then(value => {
      if (!cancelled) setBook(value)
    })
    return () => { cancelled = true }
  }, [call, sessionId])

  if (!book) return null

  const save = async () => {
    if (status === 'saving' || status === 'saved') return
    setStatus('saving')
    setError('')
    try {
      await call('favoriteConversation', { sessionId, messageId })
      setStatus('saved')
    } catch (cause) {
      setStatus('error')
      setError(cause instanceof Error ? cause.message : String(cause))
    }
  }

  const label = status === 'saving'
    ? t('favoriteConversationSaving')
    : status === 'saved'
      ? t('favoriteConversationSaved')
      : status === 'error' ? t('retry') : t('favoriteConversation')
  const title = status === 'error' && error ? error : t('favoriteConversationHint')

  return h('button', {
    type: 'button',
    className: 'dsh-readpilot-chat-favorite',
    'data-state': status,
    title,
    'aria-label': title,
    disabled: status === 'saving' || status === 'saved',
    onClick: () => void save(),
  }, label)
}
