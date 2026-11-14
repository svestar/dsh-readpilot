import { React } from '../../runtime.ts'
import { messageOf } from '../../lib/helpers.ts'
import { useLongNoteActions } from './use-long-note-actions.ts'
import type { LongNotesState } from './long-notes-state.ts'
import type { CallRpc, LongNote, NoteDraft, TextFn } from '../../lib/types.ts'

interface LongNotesOptions {
  call: CallRpc
  t: TextFn
  activeBookId: string | null
  notesTabActive: boolean
  draftWatch: boolean
  chatVersion?: string
}

export interface LongNoteDraft {
  note: LongNote
  body: string
  hash: string
}

export function useLongNotes({ call, t, activeBookId, notesTabActive, draftWatch, chatVersion = '' }: LongNotesOptions): LongNotesState {
  const [notes, setNotes] = React.useState<LongNote[]>([])
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState('')
  const [active, setActive] = React.useState<LongNoteDraft | null>(null)
  const [title, setTitle] = React.useState('')
  const [creating, setCreating] = React.useState(false)
  const [createKind, setCreateKind] = React.useState<'book' | 'topic'>('topic')
  const [saving, setSaving] = React.useState(false)
  const [drafts, setDrafts] = React.useState<NoteDraft[]>([])
  const [draftBusyId, setDraftBusyId] = React.useState<string | null>(null)

  const requestRef = React.useRef(0)
  const draftRequestRef = React.useRef(0)
  const readRef = React.useRef(0)
  const bookRef = React.useRef<string | null>(activeBookId)
  bookRef.current = activeBookId

  const load = React.useCallback(async (silent = false) => {
    if (!activeBookId) {
      setNotes([])
      return
    }
    const request = requestRef.current + 1
    requestRef.current = request
    if (!silent) setLoading(true)
    setError('')
    try {
      const value = await call('noteFiles.list', { bookId: activeBookId })
      if (requestRef.current !== request) return
      setNotes(previous => {
        const next = value.notes
        const same = previous.length === next.length
          && previous.every((note, index) => note.id === next[index].id
            && note.updatedAt === next[index].updatedAt
            && note.title === next[index].title)
        return same ? previous : next.slice()
      })
    } catch (cause) {
      if (requestRef.current === request) setError(`${t('notesFailed')}：${messageOf(cause)}`)
    } finally {
      // A silent poll may supersede an explicit load; the latest request must
      // always settle the spinner or the list stays "loading" forever.
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
      const value = await call('noteDrafts.list', { bookId })
      if (draftRequestRef.current !== request || bookRef.current !== bookId) return
      setDrafts(value.drafts.slice())
    } catch (cause) {
      if (draftRequestRef.current === request && bookRef.current === bookId) {
        setError(`${t('notesFailed')}：${messageOf(cause)}`)
      }
    }
  }, [activeBookId, call, t])

  const longActions = useLongNoteActions({
    call,
    t,
    activeBookId,
    active,
    bookRef,
    setActive,
    setError,
    load,
  })
  const { resetHistory, resetTransfer, confirm } = longActions

  React.useEffect(() => {
    requestRef.current += 1
    draftRequestRef.current += 1
    readRef.current += 1
    setNotes([])
    setLoading(false)
    setError('')
    setActive(null)
    setTitle('')
    setCreating(false)
    setSaving(false)
    setDrafts([])
    setDraftBusyId(null)
    resetHistory()
    resetTransfer()
    void load()
  }, [activeBookId, load, resetHistory, resetTransfer])

  React.useEffect(() => {
    if (!activeBookId || !notesTabActive) return
    let cancelled = false
    const tick = () => {
      if (!cancelled) void load(true)
    }
    tick()
    const timer = window.setInterval(tick, 4000)
    return () => {
      cancelled = true
      window.clearInterval(timer)
    }
  }, [activeBookId, notesTabActive, load])

  React.useEffect(() => {
    if (!activeBookId || !draftWatch) {
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
  }, [activeBookId, draftWatch, loadDrafts])

  const chatVersionRef = React.useRef(chatVersion)
  React.useEffect(() => {
    if (chatVersionRef.current === chatVersion) return
    chatVersionRef.current = chatVersion
    if (!activeBookId) return
    if (notesTabActive) void load(true)
    void loadDrafts()
  }, [activeBookId, chatVersion, load, loadDrafts, notesTabActive])

  const open = React.useCallback(async (note: LongNote) => {
    if (!activeBookId) return
    const bookId = activeBookId
    const request = readRef.current + 1
    readRef.current = request
    setError('')
    try {
      const value = await call('noteFiles.read', { bookId, id: note.id })
      if (readRef.current !== request || bookRef.current !== bookId) return
      setActive({ note: value.note, body: value.body, hash: value.hash })
      setCreating(false)
      setTitle('')
      resetHistory()
      resetTransfer()
    } catch (cause) {
      if (readRef.current === request && bookRef.current === bookId) {
        setError(`${t('notesFailed')}：${messageOf(cause)}`)
      }
    }
  }, [activeBookId, call, t])

  React.useEffect(() => {
    if (typeof window === 'undefined') return
    const onFocus = () => {
      if (active) void open(active.note)
      if (notesTabActive) void load()
    }
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [active, load, notesTabActive, open])

  const beginCreate = React.useCallback((kind: 'book' | 'topic') => {
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
    setError('')
    resetHistory()
    resetTransfer()
    setTitle(kind === 'book' ? t('bookNote') : '')
  }, [notes, open, t])

  const create = React.useCallback(async () => {
    if (!activeBookId || saving) return
    const bookId = activeBookId
    const wantedTitle = title.trim()
    if (!wantedTitle) {
      setError(t('longNoteTitleRequired'))
      return
    }
    setSaving(true)
    setError('')
    try {
      const value = await call('noteFiles.create', {
        bookId,
        title: wantedTitle,
        kind: createKind,
        body: `# ${wantedTitle}\n`,
      })
      if (bookRef.current !== bookId) return
      setActive({ note: value.note, body: value.body, hash: value.hash })
      setCreating(false)
      setTitle('')
      await load()
      if (bookRef.current !== bookId) return
      await call('openNoteFile', { bookId, id: value.note.id })
    } catch (cause) {
      if (bookRef.current === bookId) {
        const code = (cause as { code?: string } | null)?.code
        setError(code === 'open-failed'
          ? `${t('openExternalFailed')}：${messageOf(cause)}`
          : `${t('noteSaveFailed')}：${messageOf(cause)}`)
      }
    } finally {
      setSaving(false)
    }
  }, [activeBookId, call, createKind, load, saving, t, title])

  const cancelCreate = React.useCallback(() => {
    setCreating(false)
    setTitle('')
    setError('')
  }, [])


  const close = React.useCallback(() => {
    readRef.current += 1
    setActive(null)
    setCreating(false)
    setTitle('')
    setError('')
    resetHistory()
  }, [])

  const remove = React.useCallback(async () => {
    if (!activeBookId || !active) return
    const bookId = activeBookId
    if (!(await confirm(t('deleteLongNoteConfirm')))) return
    setSaving(true)
    setError('')
    try {
      await call('noteFiles.remove', { bookId, id: active.note.id })
      if (bookRef.current !== bookId) return
      setActive(null)
      setCreating(false)
      setTitle('')
      await load()
    } catch (cause) {
      if (bookRef.current === bookId) {
        setError(`${t('noteDeleteFailed')}：${messageOf(cause)}`)
      }
    } finally {
      setSaving(false)
    }
  }, [active, activeBookId, call, confirm, load, t])

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
      const value = await call('noteDrafts.apply', { bookId, draftId: item.id })
      if (bookRef.current !== bookId) return
      setActive({ note: value.note, body: value.body, hash: value.hash })
      setCreating(false)
      setTitle('')
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
      await call('noteDrafts.reject', { bookId, draftId: item.id })
      if (bookRef.current === bookId) await loadDrafts()
    } catch (cause) {
      if (bookRef.current === bookId) setError(`${t('draftActionFailed')}：${messageOf(cause)}`)
    } finally {
      setDraftBusyId(null)
    }
  }, [activeBookId, call, draftBusyId, loadDrafts, t])


  const applyExternalNote = React.useCallback((value: any) => {
    setActive(current => {
      if (!current || current.note.id !== value?.note?.id || current.hash === value.hash) return current
      return { note: value.note, body: value.body, hash: value.hash }
    })
  }, [])

  return {
    notes,
    loading,
    error,
    active,
    title,
    creating,
    saving,
    createKind,
    drafts,
    draftBusyId,
    history: longActions.history,
    historyOpen: longActions.historyOpen,
    historyBusy: longActions.historyBusy,
    exporting: longActions.exporting,
    exportStatus: longActions.exportStatus,
    clearExportStatus: longActions.clearExportStatus,
    externalBusy: longActions.externalBusy,
    confirmMessage: longActions.confirmMessage,
    settleConfirm: longActions.settleConfirm,
    setTitle,
    open,
    beginCreate,
    create,
    cancelCreate,
    close,
    remove,
    reload,
    applyDraft,
    rejectDraft,
    toggleHistory: longActions.toggleHistory,
    restoreHistory: longActions.restoreHistory,
    removeHistory: longActions.removeHistory,
    clearHistory: longActions.clearHistory,
    exportNotes: longActions.exportNotes,
    openExternal: longActions.openExternal,
    applyExternalNote,
  }
}
