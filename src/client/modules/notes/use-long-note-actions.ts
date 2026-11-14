import { React } from '../../runtime.ts'
import { downloadText, messageOf } from '../../lib/helpers.ts'
import type { CallRpc, LongNoteHistory, TextFn } from '../../lib/types.ts'
import type { LongNoteDraft } from './use-long-notes.ts'

interface LongNoteActionsOptions {
  call: CallRpc
  t: TextFn
  activeBookId: string | null
  active: LongNoteDraft | null
  bookRef: { current: string | null }
  setActive: (value: LongNoteDraft | null) => void
  setError: (value: string) => void
  load: () => Promise<void>
}

export function useLongNoteActions({
  call,
  t,
  activeBookId,
  active,
  bookRef,
  setActive,
  setError,
  load,
}: LongNoteActionsOptions) {
  const [confirmMessage, setConfirmMessage] = React.useState('')
  const confirmRef = React.useRef<((ok: boolean) => void) | null>(null)
  const [history, setHistory] = React.useState<LongNoteHistory[]>([])
  const [historyOpen, setHistoryOpen] = React.useState(false)
  const [historyBusy, setHistoryBusy] = React.useState(false)
  const [exporting, setExporting] = React.useState(false)
  const [exportStatus, setExportStatus] = React.useState('')
  const [externalBusy, setExternalBusy] = React.useState(false)

  const confirm = React.useCallback((message: string) => new Promise<boolean>(resolve => {
    confirmRef.current?.(false)
    confirmRef.current = resolve
    setConfirmMessage(message)
  }), [])

  const settleConfirm = React.useCallback((ok: boolean) => {
    const resolve = confirmRef.current
    confirmRef.current = null
    setConfirmMessage('')
    resolve?.(ok)
  }, [])

  React.useEffect(() => () => {
    confirmRef.current?.(false)
    confirmRef.current = null
  }, [])

  const resetHistory = React.useCallback(() => {
    setHistory([])
    setHistoryOpen(false)
    setHistoryBusy(false)
  }, [])

  const resetTransfer = React.useCallback(() => {
    setExportStatus('')
  }, [])

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
    if (!(await confirm(t('historyRestoreConfirm')))) return
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
  }, [active, activeBookId, call, confirm, historyBusy, load, loadHistory, t])

  const removeHistory = React.useCallback(async (entry: LongNoteHistory) => {
    if (!activeBookId || !active || historyBusy) return
    const bookId = activeBookId
    if (!(await confirm(t('historyDeleteConfirm')))) return
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
  }, [active, activeBookId, call, confirm, historyBusy, loadHistory, t])

  const clearHistory = React.useCallback(async () => {
    if (!activeBookId || !active || historyBusy) return
    const bookId = activeBookId
    if (!(await confirm(t('historyClearConfirm')))) return
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
  }, [active, activeBookId, call, confirm, historyBusy, loadHistory, t])

  const clearExportStatus = React.useCallback(() => setExportStatus(''), [])

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
    confirmMessage,
    settleConfirm,
    confirm,
    history,
    historyOpen,
    historyBusy,
    resetHistory,
    toggleHistory,
    restoreHistory,
    removeHistory,
    clearHistory,
    exporting,
    exportStatus,
    externalBusy,
    clearExportStatus,
    resetTransfer,
    exportNotes,
    openExternal,
  }
}
