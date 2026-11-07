export const PROGRESS_SYNC_EVENT = 'dsh-readpilot:progress-sync'

export interface ProgressSyncDetail {
  bookId: string
  chapterId: string
  chapterFraction: number
  origin: 'sidebar' | 'main'
}

export function publishProgressSync(detail: ProgressSyncDetail): void {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent(PROGRESS_SYNC_EVENT, { detail }))
}

export function readProgressSync(event: Event): ProgressSyncDetail | null {
  const detail = (event as CustomEvent<Partial<ProgressSyncDetail>>).detail
  if (!detail || typeof detail.bookId !== 'string' || typeof detail.chapterId !== 'string') return null
  if (typeof detail.chapterFraction !== 'number' || !Number.isFinite(detail.chapterFraction)) return null
  if (detail.origin !== 'sidebar' && detail.origin !== 'main') return null
  return {
    bookId: detail.bookId,
    chapterId: detail.chapterId,
    chapterFraction: Math.max(0, Math.min(1, detail.chapterFraction)),
    origin: detail.origin,
  }
}
