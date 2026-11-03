import { React } from '../runtime.ts'
import { messageOf } from '../helpers.ts'
import type { CallRpc, LongNote, TextFn } from '../types.ts'

interface LongNotesOptions {
  call: CallRpc
  t: TextFn
  activeBookId: string | null
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
  setDraft: (value: string) => void
  setTitle: (value: string) => void
  open: (note: LongNote) => Promise<void>
  start: (kind: 'book' | 'topic') => void
  save: () => Promise<void>
  cancel: () => void
  remove: () => Promise<void>
  reload: () => Promise<void>
}

export function useLongNotes({ call, t, activeBookId }: LongNotesOptions): LongNotesState {
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
  const requestRef = React.useRef(0)
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

  React.useEffect(() => {
    requestRef.current += 1
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
    void load()
  }, [activeBookId, load])

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
    setDraft,
    setTitle,
    open,
    start,
    save,
    cancel,
    remove,
    reload,
  }
}
