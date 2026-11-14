import { React, h } from '../../runtime.ts'
import { diffLines } from '../../lib/helpers.ts'
import { ModalShell } from '../common/ModalShell.ts'
import type { LongNotesState } from './long-notes-state.ts'
import type { TextFn } from '../../lib/types.ts'

interface DraftNoticeProps {
  t: TextFn
  state: LongNotesState
}

const seenDraftIds = new Set<string>()

export function DraftNotice({ t, state }: DraftNoticeProps) {
  const [draftId, setDraftId] = React.useState<string | null>(null)
  const draft = state.drafts.find(item => item.id === draftId) ?? null

  React.useEffect(() => {
    if (state.active || state.creating) {
      setDraftId(null)
      return
    }
    if (draftId) return
    const unseen = state.drafts.filter(item => !seenDraftIds.has(item.id))
    if (unseen.length === 0) return
    for (const item of unseen) seenDraftIds.add(item.id)
    setDraftId(unseen[0].id)
  }, [state.drafts, state.active, state.creating, draftId])

  React.useEffect(() => {
    if (draftId && !state.drafts.some(item => item.id === draftId)) setDraftId(null)
  }, [state.drafts, draftId])

  React.useEffect(() => {
    if (!draft) return
    if (typeof document === 'undefined' || !document.body) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
    }
  }, [draft])

  if (!draft) return null
  const lines = diffLines(draft.baseBody, draft.body)
  const added = lines.filter(line => line.type === 'add').length
  const removed = lines.filter(line => line.type === 'del').length
  return h(ModalShell, {
    t,
    title: draft.title,
    meta: `${draft.action === 'create'
      ? t('draftCreate')
      : draft.action === 'append' ? t('draftAppend') : t('draftEdit')} · +${added} −${removed}`,
    onClose: () => setDraftId(null),
    children: [
      state.error ? h('div', { className: 'dsh-readpilot-chat-error' }, state.error) : null,
      h('div', { className: 'dsh-readpilot-modal-actions' },
        h('button', {
          type: 'button',
          className: 'dsh-readpilot-chat-send',
          disabled: state.draftBusyId === draft.id,
          onClick: () => void state.applyDraft(draft),
        }, t('applyDraft')),
        h('button', {
          type: 'button',
          className: 'dsh-readpilot-note-jump',
          disabled: state.draftBusyId === draft.id,
          onClick: () => void state.rejectDraft(draft),
        }, t('rejectDraft'))),
      h('div', { className: 'dsh-readpilot-modal-body' },
        h('pre', { className: 'dsh-readpilot-diff dsh-readpilot-modal-diff' },
          lines.slice(0, 80).map((line, index) => h('div', {
            key: `${draft.id}-${index}`,
            className: `dsh-readpilot-diff-line dsh-readpilot-diff-${line.type}`,
          }, `${line.type === 'add' ? '+ ' : line.type === 'del' ? '- ' : '  '}${line.text}`))),
        lines.length > 80
          ? h('div', { className: 'dsh-readpilot-long-hint' }, t('draftDiffTruncated'))
          : null),
    ],
  })
}
