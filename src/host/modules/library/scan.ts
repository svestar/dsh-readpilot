import type { Settings } from '../../../shared/contracts/library.ts'
import type { HostContext } from '../../types.ts'
import { enqueueWrite } from '../../lib/write-queue.ts'
import { scanLibrary, type Book } from './book.ts'
import { loadLibraryIndex, reconcileBooks, saveLibraryIndex } from './index-store.ts'

export interface LibraryScanOptions {
  fresh?: boolean
}

export interface LibraryScan {
  books(options?: LibraryScanOptions): Promise<Book[]>
  invalidate(): void
  refreshWatch(dir: string | null): Promise<void>
  dispose(): Promise<void>
}

export interface LibraryScanDependencies {
  dataDir: string
  ctx?: HostContext
  currentSettings(): Promise<Settings>
}

const SCAN_TTL_MS = 30_000

export function createLibraryScan({ dataDir, ctx, currentSettings }: LibraryScanDependencies): LibraryScan {
  let scanCache: { dir: string; at: number; books: Book[] } | null = null
  let scanInflight: { dir: string; promise: Promise<Book[]> } | null = null
  let libraryWatch: { dir: string; controller: AbortController; close: () => Promise<void> } | null = null
  let watchAttemptedDir: string | null = null

  function invalidate(): void {
    scanCache = null
    scanInflight = null
  }

  async function refreshWatch(dir: string | null): Promise<void> {
    if (libraryWatch?.dir === dir) return
    if (!libraryWatch && watchAttemptedDir === dir) return
    const previous = libraryWatch
    libraryWatch = null
    if (previous) {
      previous.controller.abort()
      await previous.close().catch(() => {})
    }
    if (!dir) {
      watchAttemptedDir = null
      return
    }
    watchAttemptedDir = dir
    const fs = typeof ctx?.get === 'function' ? ctx.get('fs') : undefined
    if (!fs || typeof fs.resolve !== 'function' || typeof fs.watch !== 'function') return
    try {
      const target = await fs.resolve(dir)
      const controller = new AbortController()
      const close = await fs.watch(target, () => invalidate(), controller.signal)
      libraryWatch = { dir, controller, close }
    } catch {
      // Watching is an optimization; the 30s TTL remains the fallback.
    }
  }

  async function books(options: LibraryScanOptions = {}): Promise<Book[]> {
    const settings = await currentSettings()
    const dir = settings.libraryDir
    if (!dir) {
      invalidate()
      return []
    }
    const now = Date.now()
    if (!options.fresh && scanCache && scanCache.dir === dir && now - scanCache.at < SCAN_TTL_MS) {
      return scanCache.books
    }
    if (!options.fresh && scanInflight && scanInflight.dir === dir) return scanInflight.promise
    const promise = scanLibrary(dir)
      .then(async value => {
        const index = await loadLibraryIndex(dataDir)
        const reconciled = reconcileBooks(value, index)
        await enqueueWrite(`library-index:${dataDir}`, () => saveLibraryIndex(dataDir, index))
        scanCache = { dir, at: Date.now(), books: reconciled }
        return reconciled
      })
      .finally(() => {
        if (scanInflight?.promise === promise) scanInflight = null
      })
    if (!options.fresh) scanInflight = { dir, promise }
    return promise
  }

  return {
    books,
    invalidate,
    refreshWatch,
    async dispose() {
      const current = libraryWatch
      libraryWatch = null
      watchAttemptedDir = null
      if (!current) return
      current.controller.abort()
      await current.close().catch(() => {})
    },
  }
}
