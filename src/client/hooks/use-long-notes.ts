import { React } from '../runtime.ts'
import { downloadText, messageOf } from '../helpers.ts'
import type { CallRpc, LongNote, LongNoteHistory, NoteDraft, TextFn } from '../types.ts'

interface LongNotesOptions {
  call: CallRpc
  t: TextFn
  activeBookId: string | null
  notesTabActive: boolean
  chatVersion?: string
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
  title: string
  creating: boolean
  saving: boolean
  createKind: 'book' | 'topic'
  drafts: NoteDraft[]
  draftBusyId: string | null
  history: LongNoteHistory[]
  historyOpen: boolean
  historyBusy: boolean
  exporting: boolean
  exportStatus: string
  externalBusy: boolean
  setTitle: (value: string) => void
  open: (note: LongNote) => Promise<void>
  beginCreate: (kind: 'book' | 'topic') => void
  create: () => Promise<void>
  cancelCreate: () => void
  close: () => void
  remove: () => Promise<void>
  reload: () => Promise<void>
  applyDraft: (draft: NoteDraft) => Promise<void>
  rejectDraft: (draft: NoteDraft) => Promise<void>
  toggleHistory: () => void
  restoreHistory: (entry: LongNoteHistory) => Promise<void>
  removeHistory: (entry: LongNoteHistory) => Promise<void>
  clearHistory: () => Promise<void>
  exportNotes: (save: boolean) => Promise<void>
  openExternal: () => Promise<void>
}

export function useLongNotes({ call, t, activeBookId, notesTabActive, chatVersion = '' }: LongNotesOptions): LongNotesState {
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
  const [history, setHistory] = React.useState<LongNoteHistory[]>([])
  const [historyOpen, setHistoryOpen] = React.useState(false)
  const [historyBusy, setHistoryBusy] = React.useState(false)
  const [exporting, setExporting] = React.useState(false)
  const [exportStatus, setExportStatus] = React.useState('')
  const [externalBusy, setExternalBusy] = React.useState(false)
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
    setHistory([])
    setHistoryOpen(false)
    setHistoryBusy(false)
    setExportStatus('')
    void load()
  }, [activeBookId, load])

  React.useEffect(() => {
    if (!activeBookId || !notesTabActive) {
      setDrafts([])
      return
    }
    let cancelled = false
    const tick = () => {
      if (cancelled) return
      void loadDrafts()
      void load(true)
    }
    tick()
    const timer = window.setInterval(tick, 4000)
    return () => {
      cancelled = true
      window.clearInterval(timer)
    }
  }, [activeBookId, notesTabActive, loadDrafts, load])

  const chatVersionRef = React.useRef(chatVersion)
  React.useEffect(() => {
    if (chatVersionRef.current === chatVersion) return
    chatVersionRef.current = chatVersion
    if (!activeBookId) return
    void load(true)
    void loadDrafts()
  }, [activeBookId, chatVersion, load, loadDrafts])

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
      setHistory([])
      setHistoryOpen(false)
      setExportStatus('')
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
      void load()
    }
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [active, load, open])

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
    setHistory([])
    setHistoryOpen(false)
    setExportStatus('')
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
    setHistory([])
    setHistoryOpen(false)
  }, [])

  const remove = React.useCallback(async () => {
    if (!activeBookId || !active) return
    const bookId = activeBookId
    if (typeof window !== 'undefined' && typeof window.confirm === 'function'
      && !window.confirm(t('deleteLongNoteConfirm'))) return
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

  const loadHistory = React.useCallback(async () => {
    if (!activeBookId || !active) return
    const bookId = activeBookId
    setHistoryBusy(true)
    try {
      const value = await call('noteFiles.history', { bookId, id: active.note.id })
      if (bookRef.current === bookId) setHistory(value.history.slice())
    } catch (cause) {
      if (bookRef.current === bookId) setError(`${t('historyFailed')}：${messageOf(cause)}`)
    } finally {
      setHistoryBusy(false)
    }
  }, [active, activeBookId, call, t])

  const toggleHistory = React.useCallback(() => {
    if (!active) return
    if (historyOpen) {
      setHistoryOpen(false)
      return
    }
    setHistoryOpen(true)
    void loadHistory()
  }, [active, historyOpen, loadHistory])

  const restoreHistory = React.useCallback(async (entry: LongNoteHistory) => {
    if (!activeBookId || !active || historyBusy) return
    const bookId = activeBookId
    if (typeof window !== 'undefined' && typeof window.confirm === 'function'
      && !window.confirm(t('historyRestoreConfirm'))) return
    setHistoryBusy(true)
    setError('')
    try {
      const value = await call('noteFiles.restore', {
        bookId,
        id: active.note.id,
        historyId: entry.id,
      })
      if (bookRef.current !== bookId) return
      setActive({ note: value.note, body: value.body, hash: value.hash })
      await loadHistory()
      await load()
    } catch (cause) {
      if (bookRef.current === bookId) setError(`${t('historyFailed')}：${messageOf(cause)}`)
    } finally {
      setHistoryBusy(false)
    }
  }, [active, activeBookId, call, historyBusy, load, loadHistory, t])

  const removeHistory = React.useCallback(async (entry: LongNoteHistory) => {
    if (!activeBookId || !active || historyBusy) return
    const bookId = activeBookId
    if (typeof window !== 'undefined' && typeof window.confirm === 'function'
      && !window.confirm(t('historyDeleteConfirm'))) return
    setHistoryBusy(true)
    setError('')
    try {
      await call('noteFiles.historyRemove', {
        bookId,
        id: active.note.id,
        historyId: entry.id,
      })
      if (bookRef.current === bookId) await loadHistory()
    } catch (cause) {
      if (bookRef.current === bookId) setError(`${t('historyFailed')}：${messageOf(cause)}`)
    } finally {
      setHistoryBusy(false)
    }
  }, [active, activeBookId, call, historyBusy, loadHistory, t])

  const clearHistory = React.useCallback(async () => {
    if (!activeBookId || !active || historyBusy) return
    const bookId = activeBookId
    if (typeof window !== 'undefined' && typeof window.confirm === 'function'
      && !window.confirm(t('historyClearConfirm'))) return
    setHistoryBusy(true)
    setError('')
    try {
      await call('noteFiles.historyClear', {
        bookId,
        id: active.note.id,
      })
      if (bookRef.current === bookId) await loadHistory()
    } catch (cause) {
      if (bookRef.current === bookId) setError(`${t('historyFailed')}：${messageOf(cause)}`)
    } finally {
      setHistoryBusy(false)
    }
  }, [active, activeBookId, call, historyBusy, loadHistory, t])

  const exportNotes = React.useCallback(async (save: boolean) => {
    if (!activeBookId || exporting) return
    const bookId = activeBookId
    setExporting(true)
    setExportStatus('')
    setError('')
    try {
      const value = await call('exportNotes', { bookId, save })
      if (bookRef.current !== bookId) return
      if (save) {
        setExportStatus(value.path ? `${t('exportSaved')}：${value.path}` : t('exportSaved'))
      } else {
        downloadText(value.fileName, value.markdown)
      }
    } catch (cause) {
      if (bookRef.current === bookId) setError(`${t('exportFailed')}：${messageOf(cause)}`)
    } finally {
      setExporting(false)
    }
  }, [activeBookId, call, exporting, t])

  const openExternal = React.useCallback(async () => {
    if (!activeBookId || !active || externalBusy) return
    const bookId = activeBookId
    setExternalBusy(true)
    setError('')
    try {
      await call('openNoteFile', { bookId, id: active.note.id })
    } catch (cause) {
      if (bookRef.current === bookId) setError(`${t('openExternalFailed')}：${messageOf(cause)}`)
    } finally {
      setExternalBusy(false)
    }
  }, [active, activeBookId, call, externalBusy, t])

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
    history,
    historyOpen,
    historyBusy,
    exporting,
    exportStatus,
    externalBusy,
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
    toggleHistory,
    restoreHistory,
    removeHistory,
    clearHistory,
    exportNotes,
    openExternal,
  }
}
