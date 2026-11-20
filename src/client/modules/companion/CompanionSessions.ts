import { React, h } from '../../runtime.ts'
import { ModalShell } from '../common/ModalShell.ts'
import type { CompanionSessionSummary } from '../../../shared/contracts/companion.ts'
import type { TextFn } from '../../lib/types.ts'

interface CompanionSessionsProps {
  t: TextFn
  bookId: string
  currentSessionId: string | null
  currentTitle: string
  sessions: CompanionSessionSummary[]
  loading: boolean
  error: string
  busy: boolean
  onRefresh: () => Promise<void>
  onCreate: () => Promise<boolean>
  onSelect: (sessionId: string) => Promise<boolean>
}

function updatedLabel(value: number): string {
  if (!value) return ''
  return new Date(value).toLocaleString()
}

/** Current conversation bar plus the picker for creating or rebinding one. */
export function CompanionSessions({
  t,
  bookId,
  currentSessionId,
  currentTitle,
  sessions,
  loading,
  error,
  busy,
  onRefresh,
  onCreate,
  onSelect,
}: CompanionSessionsProps) {
  const [open, setOpen] = React.useState(false)
  const [pendingId, setPendingId] = React.useState<string | null>(null)
  const [workingId, setWorkingId] = React.useState<string | null>(null)
  const [creating, setCreating] = React.useState(false)
  const pending = sessions.find(session => session.sessionId === pendingId) ?? null

  const openPicker = () => {
    setOpen(true)
    setPendingId(null)
    void onRefresh()
  }

  const choose = async (session: CompanionSessionSummary) => {
    if (busy || workingId || creating) return
    if (session.boundBookId && session.boundBookId !== bookId) {
      setPendingId(session.sessionId)
      return
    }
    setWorkingId(session.sessionId)
    try {
      if (await onSelect(session.sessionId)) setOpen(false)
    } finally {
      setWorkingId(null)
    }
  }

  const confirmPending = async () => {
    if (!pendingId || busy || workingId) return
    const sessionId = pendingId
    setWorkingId(sessionId)
    try {
      if (await onSelect(sessionId)) {
        setOpen(false)
        setPendingId(null)
      }
    } finally {
      setWorkingId(null)
    }
  }

  const create = async () => {
    if (busy || creating) return
    setCreating(true)
    try {
      if (await onCreate()) setOpen(false)
      else setOpen(true)
    } finally {
      setCreating(false)
    }
  }

  const currentLabel = currentTitle || t('companionSessionUntitled')

  const sessionRow = (session: CompanionSessionSummary) => {
    const active = session.sessionId === currentSessionId
    const boundElsewhere = Boolean(session.boundBookId && session.boundBookId !== bookId)
    const boundLabel = `${t('companionSessionBound')}${session.boundBookTitle ? `《${session.boundBookTitle}》` : ''}`
    const badge = active
      ? h('span', { className: 'dsh-readpilot-session-badge' }, t('companionSessionCurrent'))
      : boundElsewhere
        ? h('span', { className: 'dsh-readpilot-session-badge', title: boundLabel }, boundLabel)
        : null
    return h('button', {
      key: session.sessionId,
      type: 'button',
      className: 'dsh-readpilot-session-row',
      'data-active': active ? 'true' : 'false',
      disabled: busy || Boolean(workingId),
      onClick: () => void choose(session),
    },
    h('span', { className: 'dsh-readpilot-session-row-main' },
      h('span', { className: 'dsh-readpilot-session-row-title' }, session.title || t('companionSessionUntitled')),
      h('span', { className: 'dsh-readpilot-session-row-meta' }, updatedLabel(session.updatedAt))),
    badge)
  }

  return h('div', { className: 'dsh-readpilot-session-bar' },
    h('button', {
      type: 'button',
      className: 'dsh-readpilot-session-current',
      title: t('companionSessionPickerTitle'),
      'aria-haspopup': 'dialog',
      onClick: openPicker,
    },
    h('span', { className: 'dsh-readpilot-session-name' }, currentLabel),
    h('span', { className: 'dsh-readpilot-session-caret', 'aria-hidden': 'true' }, '▾')),
    h('button', {
      type: 'button',
      className: 'dsh-readpilot-session-new',
      disabled: busy || creating,
      onClick: () => void create(),
    }, t('companionSessionNew')),
    open
      ? h(ModalShell, {
        t,
        title: t('companionSessionPickerTitle'),
        meta: t('companionSessionPickerHint'),
        onClose: () => setOpen(false),
        children: [
          h('div', { className: 'dsh-readpilot-session-picker' },
            h('button', {
              type: 'button',
              className: 'dsh-readpilot-session-create',
              disabled: busy || creating,
              onClick: () => void create(),
            }, creating ? t('companionSessionCreating') : t('companionSessionNew')),
            error ? h('div', { className: 'dsh-readpilot-chat-error' }, error) : null,
            pending
              ? h('div', { className: 'dsh-readpilot-session-confirm' },
                h('div', { className: 'dsh-readpilot-session-confirm-text' },
                  `${t('companionSessionRebindWarning')} `,
                  pending.boundBookTitle ? `《${pending.boundBookTitle}》` : ''),
                h('div', { className: 'dsh-readpilot-session-confirm-actions' },
                  h('button', {
                    type: 'button',
                    className: 'dsh-readpilot-chat-send',
                    disabled: busy || Boolean(workingId),
                    onClick: () => void confirmPending(),
                  }, t('companionSessionRebindAction')),
                  h('button', {
                    type: 'button',
                    className: 'dsh-readpilot-note-jump',
                    disabled: busy || Boolean(workingId),
                    onClick: () => setPendingId(null),
                  }, t('cancel'))))
              : null,
            loading && sessions.length === 0
              ? h('div', { className: 'dsh-readpilot-chat-empty' }, t('loading'))
              : sessions.length === 0
                ? h('div', { className: 'dsh-readpilot-chat-empty' }, t('companionSessionEmpty'))
                : h('div', { className: 'dsh-readpilot-session-list' }, sessions.map(sessionRow)))
        ],
      })
      : null)
}
