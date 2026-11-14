import type { ProgressMap } from '../../../shared/contracts/library.ts'
import type { Book } from '../library/book.ts'
import { ReaderError } from '../../lib/errors.ts'
import { enqueueWrite } from '../../lib/write-queue.ts'
import { loadProgress, saveProgress } from './progress-store.ts'

export interface ProgressDependencies {
  dataDir: string
  resolveBook(bookId: unknown): Promise<Book>
}

export function createReadingProgress({ dataDir, resolveBook }: ProgressDependencies) {
  return async function saveReadingProgress({
    bookId,
    chapterId,
    chapterTitle,
    chapterFraction,
    percent,
  }: any = {}): Promise<{ bookId: string; chapterId: string }> {
    if (typeof bookId !== 'string' || typeof chapterId !== 'string') {
      throw new ReaderError('invalid-progress', '进度需要 bookId 与 chapterId')
    }
    const book = await resolveBook(bookId)
    const numericPercent = Number(percent)
    const numericFraction = Number(chapterFraction)
    await enqueueWrite(`progress:${dataDir}`, async () => {
      const progress: ProgressMap = await loadProgress(dataDir)
      progress[book.id] = {
        chapterId,
        chapterTitle: typeof chapterTitle === 'string' ? chapterTitle : '',
        ...(Number.isFinite(numericFraction)
          ? { chapterFraction: Math.max(0, Math.min(1, numericFraction)) }
          : {}),
        ...(Number.isFinite(numericPercent)
          ? { percent: Math.max(0, Math.min(100, numericPercent)) }
          : {}),
        updatedAt: Date.now(),
      }
      await saveProgress(dataDir, progress)
    })
    return { bookId: book.id, chapterId }
  }
}
