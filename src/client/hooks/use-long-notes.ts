import { React } from '../runtime.ts'
import { messageOf } from '../helpers.ts'
import type { CallRpc, LongNote, NoteDraft, TextFn } from '../types.ts'

interface LongNotesOptions {
  call: CallRpc
  t: TextFn
  activeBookId: string | null
  notesTabActive: boolean
}

export interface LongNoteDraft {
  note: LongNote
  body: string
  hash: string
}

export interface LongNotesState {
  notes: LongNote[]
  loading: boolean
  error: string
  active: LongNoteDraft | null
  draft: string
  title: string
  creating: boolean
  saving: boolean
  conflict: boolean
  createKind: 'book' | 'topic'
  drafts: NoteDraft[]
  draftBusyId: string | null
  setDraft: (value: string) => void
  setTitle: (value: string) => void
  open: (note: LongNote) => Promise<void>
  start: (kind: 'book' | 'topic') => void
  save: () => Promise<void>
  cancel: () => void
  remove: () => Promise<void>
  reload: () => Promise<void>
  applyDraft: (draft: NoteDraft) => Promise<void>
  rejectDraft: (draft: NoteDraft) => Promise<void>
}

export function useLongNotes({ call, t, activeBookId, notesTabActive }: LongNotesOptions): LongNotesState {
  const [notes, setNotes] = React.useState<LongNote[]>([])
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState('')
  const [active, setActive] = React.useState<LongNoteDraft | null>(null)
  const [draft, setDraft] = React.useState('')
  const [title, setTitle] = React.useState('')
  const [creating, setCreating] = React.useState(false)
  const [createKind, setCreateKind] = React.useState<'book' | 'topic'>('topic')
  const [saving, setSaving] = React.useState(false)
  const [conflict, setConflict] = React.useState(false)
  const [drafts, setDrafts] = React.useState<NoteDraft[]>([])
  const [draftBusyId, setDraftBusyId] = React.useState<string | null>(null)
  const requestRef = React.useRef(0)
  const draftRequestRef = React.useRef(0)
  const readRef = React.useRef(0)
  const bookRef = React.useRef<string | null>(activeBookId)
  bookRef.current = activeBookId

  const load = React.useCallback(async () => {
    if (!activeBookId) {
      setNotes([])
      return
    }
    const request = requestRef.current + 1
    requestRef.current = request
    setLoading(true)
    setError('')
    try {
      const value = await call('noteFiles', { action: 'list', bookId: activeBookId })
      if (requestRef.current !== request) return
      setNotes(value.notes.slice())
    } catch (cause) {
      if (requestRef.current === request) setError(`${t('notesFailed')}：${messageOf(cause)}`)
    } finally {
      if (requestRef.current === request) setLoading(false)
    }
  }, [activeBookId, call, t])

  const loadDrafts = React.useCallback(async () => {
    const bookId = activeBookId
    if (!bookId) {
      setDrafts([])
      return
    }
    const request = draftRequestRef.current + 1
    draftRequestRef.current = request
    try {
      const value = await call('noteDrafts', { action: 'list', bookId })
      if (draftRequestRef.current !== request || bookRef.current !== bookId) return
      setDrafts(value.drafts.slice())
    } catch (cause) {
      if (draftRequestRef.current === request && bookRef.current === bookId) {
        setError(`${t('notesFailed')}：${messageOf(cause)}`)
      }
    }
  }, [activeBookId, call, t])

  React.useEffect(() => {
    requestRef.current += 1
    draftRequestRef.current += 1
    readRef.current += 1
    setNotes([])
    setLoading(false)
    setError('')
    setActive(null)
    setDraft('')
    setTitle('')
    setCreating(false)
    setSaving(false)
    setConflict(false)
    setDrafts([])
    setDraftBusyId(null)
    void load()
  }, [activeBookId, load])

  React.useEffect(() => {
    if (!activeBookId || !notesTabActive) {
      setDrafts([])
      return
    }
    let cancelled = false
    const tick = () => {
      if (!cancelled) void loadDrafts()
    }
    tick()
    const timer = window.setInterval(tick, 4000)
    return () => {
      cancelled = true
      window.clearInterval(timer)
    }
  }, [activeBookId, notesTabActive, loadDrafts])

  const open = React.useCallback(async (note: LongNote) => {
    if (!activeBookId) return
    const bookId = activeBookId
    const request = readRef.current + 1
    readRef.current = request
    setError('')
    setConflict(false)
    try {
      const value = await call('noteFiles', { action: 'read', bookId, id: note.id })
      if (readRef.current !== request || bookRef.current !== bookId) return
      setActive({ note: value.note, body: value.body, hash: value.hash })
      setDraft(value.body)
      setTitle(value.note.title)
      setCreating(false)
    } catch (cause) {
      if (readRef.current === request && bookRef.current === bookId) {
        setError(`${t('notesFailed')}：${messageOf(cause)}`)
      }
    }
  }, [activeBookId, call, t])

  const start = React.useCallback((kind: 'book' | 'topic') => {
    if (kind === 'book') {
      const existing = notes.find(note => note.kind === 'book')
      if (existing) {
        void open(existing)
        return
      }
    }
    readRef.current += 1
    setActive(null)
    setCreating(true)
    setCreateKind(kind)
    setConflict(false)
    setError('')
    setTitle(kind === 'book' ? t('bookNote') : '')
    setDraft('')
  }, [notes, open, t])

  const save = React.useCallback(async () => {
    if (!activeBookId || saving) return
    const bookId = activeBookId
    const wantedTitle = title.trim()
    if (!wantedTitle) {
      setError(t('longNoteTitleRequired'))
      return
    }
    setSaving(true)
    setError('')
    setConflict(false)
    try {
      if (creating) {
        const value = await call('noteFiles', {
          action: 'create',
          bookId,
          title: wantedTitle,
          kind: createKind,
          body: draft,
        })
        if (bookRef.current !== bookId) return
        setActive({ note: value.note, body: value.body, hash: value.hash })
        setDraft(value.body)
        setTitle(value.note.title)
        setCreating(false)
      } else if (active) {
        const value = await call('noteFiles', {
          action: 'write',
          bookId,
          id: active.note.id,
          title: wantedTitle,
          body: draft,
          baseHash: active.hash,
        })
        if (bookRef.current !== bookId) return
        setActive({ note: value.note, body: value.body, hash: value.hash })
        setDraft(value.body)
        setTitle(value.note.title)
      }
      await load()
    } catch (cause) {
      if (bookRef.current !== bookId) return
      if ((cause as { code?: string } | null)?.code === 'note-conflict') setConflict(true)
      else setError(`${t('noteSaveFailed')}：${messageOf(cause)}`)
    } finally {
      setSaving(false)
    }
  }, [active, activeBookId, call, createKind, creating, draft, load, saving, t, title])

  const cancel = React.useCallback(() => {
    readRef.current += 1
    setActive(null)
    setCreating(false)
    setDraft('')
    setTitle('')
    setError('')
    setConflict(false)
  }, [])

  const remove = React.useCallback(async () => {
    if (!activeBookId || !active) return
    const bookId = activeBookId
    if (typeof window !== 'undefined' && typeof window.confirm === 'function'
      && !window.confirm(t('deleteLongNoteConfirm'))) return
    setSaving(true)
    setError('')
    try {
      await call('noteFiles', { action: 'remove', bookId, id: active.note.id })
      if (bookRef.current !== bookId) return
      setActive(null)
      setDraft('')
      setTitle('')
      setCreating(false)
      await load()
    } catch (cause) {
      if (bookRef.current === bookId) {
        setError(`${t('noteDeleteFailed')}：${messageOf(cause)}`)
      }
    } finally {
      setSaving(false)
    }
  }, [active, activeBookId, call, load, t])

  const reload = React.useCallback(async () => {
    if (!active) return
    await open(active.note)
  }, [active, open])

  const applyDraft = React.useCallback(async (item: NoteDraft) => {
    if (!activeBookId || draftBusyId) return
    const bookId = activeBookId
    setDraftBusyId(item.id)
    setError('')
    try {
      await call('noteDrafts', { action: 'apply', bookId, draftId: item.id })
      if (bookRef.current !== bookId) return
      await loadDrafts()
      await load()
    } catch (cause) {
      if (bookRef.current === bookId) setError(`${t('draftActionFailed')}：${messageOf(cause)}`)
    } finally {
      setDraftBusyId(null)
    }
  }, [activeBookId, call, draftBusyId, load, loadDrafts, t])

  const rejectDraft = React.useCallback(async (item: NoteDraft) => {
    if (!activeBookId || draftBusyId) return
    const bookId = activeBookId
    setDraftBusyId(item.id)
    setError('')
    try {
      await call('noteDrafts', { action: 'reject', bookId, draftId: item.id })
      if (bookRef.current === bookId) await loadDrafts()
    } catch (cause) {
      if (bookRef.current === bookId) setError(`${t('draftActionFailed')}：${messageOf(cause)}`)
    } finally {
      setDraftBusyId(null)
    }
  }, [activeBookId, call, draftBusyId, loadDrafts, t])

  return {
    notes,
    loading,
    error,
    active,
    draft,
    title,
    creating,
    saving,
    conflict,
    createKind,
    drafts,
    draftBusyId,
    setDraft,
    setTitle,
    open,
    start,
    save,
    cancel,
    remove,
    reload,
    applyDraft,
    rejectDraft,
  }
}
