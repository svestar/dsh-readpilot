import { React } from '../../runtime.ts'
import { PROGRESS_SYNC_EVENT, readProgressSync } from './progress-sync.ts'
import type { CallRpc, Screen } from '../../lib/types.ts'

interface ReaderSyncOptions {
  runtime: any
  call: CallRpc
  screen: Screen
  selectChapter: (bookId: string, chapterId: string, target?: { offset?: number }) => Promise<void>
  setReadingAnchor: (value: { chapterId: string; fraction: number; token: number } | null) => void
  anchorTokenRef: { current: number }
  progressSkipRef: { current: boolean }
}

/**
 * Cross-panel progress (the sidebar reader) and the re-read when the main
 * panel becomes active again after switching DSH pages.
 */
export function useReaderSync({
  runtime,
  call,
  screen,
  selectChapter,
  setReadingAnchor,
  anchorTokenRef,
  progressSkipRef,
}: ReaderSyncOptions): void {
  const applyRemoteProgress = React.useCallback(async (detail: { bookId: string; chapterId: string; chapterFraction: number }) => {
    if (screen.kind !== 'book' || screen.detail.book.id !== detail.bookId) return
    setReadingAnchor({
      chapterId: detail.chapterId,
      fraction: Math.max(0, Math.min(1, detail.chapterFraction)),
      token: ++anchorTokenRef.current,
    })
    if (detail.chapterId !== screen.content.chapterId) {
      progressSkipRef.current = true
      await selectChapter(detail.bookId, detail.chapterId)
    }
  }, [anchorTokenRef, progressSkipRef, screen, selectChapter, setReadingAnchor])

  React.useEffect(() => {
    const handler = (event: Event) => {
      const detail = readProgressSync(event)
      if (!detail || detail.origin !== 'sidebar') return
      void applyRemoteProgress(detail)
    }
    window.addEventListener(PROGRESS_SYNC_EVENT, handler)
    return () => window.removeEventListener(PROGRESS_SYNC_EVENT, handler)
  }, [applyRemoteProgress])

  const refreshFromHost = React.useCallback(async () => {
    if (screen.kind !== 'book') return
    try {
      const latest = await call('open', { bookId: screen.detail.book.id })
      const saved = latest.progress
      if (!saved?.chapterId) return
      const fraction = typeof saved.chapterFraction === 'number' && Number.isFinite(saved.chapterFraction)
        ? Math.max(0, Math.min(1, saved.chapterFraction))
        : 0
      setReadingAnchor({ chapterId: saved.chapterId, fraction, token: ++anchorTokenRef.current })
      if (saved.chapterId !== screen.content.chapterId) {
        progressSkipRef.current = true
        await selectChapter(screen.detail.book.id, saved.chapterId)
      }
    } catch {
      // The current page remains usable if the Host cannot refresh progress.
    }
  }, [anchorTokenRef, call, progressSkipRef, screen, selectChapter, setReadingAnchor])

  const panelInfo = runtime.layout?.panelInfo
  const panelSubscribe = React.useCallback((callback: () => void) =>
    panelInfo?.subscribe ? panelInfo.subscribe(callback) : () => {}, [panelInfo])
  const panelSnapshot = React.useCallback(() =>
    panelInfo?.getSnapshot?.().activePanelId ?? null, [panelInfo])
  const activePanelId = React.useSyncExternalStore(panelSubscribe, panelSnapshot)
  const panelWasActiveRef = React.useRef(false)

  React.useEffect(() => {
    const active = activePanelId === 'dsh-readpilot'
    if (active && !panelWasActiveRef.current && screen.kind === 'book') void refreshFromHost()
    panelWasActiveRef.current = active
  }, [activePanelId, refreshFromHost, screen.kind])
}
