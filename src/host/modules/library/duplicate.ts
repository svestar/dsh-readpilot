import { realpath, rm } from 'node:fs/promises'
import { isAbsolute, relative } from 'node:path'
import type { BookSummary } from '../../../shared/contracts/reading.ts'
import type { NoteFileRecord } from '../../../shared/contracts/notes.ts'
import type {
  LibraryMeta,
  ProgressMap,
  ReaderState,
  Settings,
} from '../../../shared/contracts/library.ts'
import type { SessionMap } from '../../../shared/contracts/companion.ts'
import { cachePath } from '../../lib/data-paths.ts'
import { ReaderError } from '../../lib/errors.ts'
import { enqueueWrite } from '../../lib/write-queue.ts'
import type { Book } from './book.ts'
import { deleteLibraryRecord, loadLibraryIndex, saveLibraryIndex } from './index-store.ts'

export interface DuplicateDependencies {
  dataDir: string
  books(options?: { fresh?: boolean }): Promise<Book[]>
  currentSettings(): Promise<Settings>
  notes(bookId: string): Promise<unknown[]>
  noteFiles(book: { id: string; title: string; path?: string }): Promise<NoteFileRecord[]>
  progress(): Promise<ProgressMap>
  sessions(): Promise<SessionMap>
  meta(): Promise<LibraryMeta>
  invalidate(): void
  state(): Promise<ReaderState>
}

export function createDuplicateService(deps: DuplicateDependencies) {
  async function bookHasUserData(book: BookSummary): Promise<boolean> {
    const [notes, progress, sessions, meta] = await Promise.all([
      deps.notes(book.id),
      deps.progress(),
      deps.sessions(),
      deps.meta(),
    ])
    const hasMeta = Boolean(meta.tags[book.id] || meta.status[book.id] || meta.rating[book.id])
    let hasLongNotes = false
    try {
      hasLongNotes = (await deps.noteFiles(book)).length > 0
    } catch {
      // A broken note store must not block duplicate handling.
    }
    return notes.length > 0 || Boolean(progress[book.id]) || Boolean(sessions[book.id]) || hasMeta || hasLongNotes
  }

  async function bookFileTarget(book: Book): Promise<string> {
    const settings = await deps.currentSettings()
    if (!settings.libraryDir) throw new ReaderError('no-library', '还没有配置书库')
    const root = await realpath(settings.libraryDir)
    const target = await realpath(book.path)
    const rel = relative(root, target)
    if (!rel || rel.startsWith('..') || isAbsolute(rel)) {
      throw new ReaderError('invalid-path', '只能删除书库目录内的书籍文件')
    }
    return target
  }

  return async function deleteDuplicate({ bookId }: { bookId?: unknown } = {}): Promise<ReaderState> {
    const books = await deps.books()
    const book = books.find(candidate => candidate.id === bookId)
    if (!book) throw new ReaderError('book-not-found', `书库中找不到书籍：${String(bookId)}`)
    const group = books.filter(candidate => candidate.contentKey === book.contentKey)
    if (group.length < 2) throw new ReaderError('not-duplicate', '这本书没有同内容副本')

    const index = await loadLibraryIndex(deps.dataDir)
    if (book.duplicateOf) {
      if (await bookHasUserData(book)) {
        throw new ReaderError('duplicate-has-data', '副本已有批注、进度或笔记，不能直接删除；请保留两份')
      }
      await rm(await bookFileTarget(book))
      deleteLibraryRecord(index, book.id)
      await enqueueWrite(`library-index:${deps.dataDir}`, () => saveLibraryIndex(deps.dataDir, index))
      await rm(cachePath(deps.dataDir, book.id), { force: true }).catch(() => undefined)
    } else {
      const replacement = group.find(candidate => candidate.id !== book.id)
      if (!replacement) throw new ReaderError('not-duplicate', '没有可提升的副本')
      if (await bookHasUserData(replacement)) {
        throw new ReaderError('duplicate-has-data', '剩余副本已有批注、进度或笔记，不能删除主记录；请改为删除该副本')
      }
      await rm(await bookFileTarget(book))
      const record = index.records[book.id]
      if (record) {
        record.path = replacement.path
        record.title = replacement.title
        record.size = replacement.size
        record.mtimeMs = replacement.mtimeMs
        record.duplicateOf = undefined
      }
      deleteLibraryRecord(index, replacement.id)
      await enqueueWrite(`library-index:${deps.dataDir}`, () => saveLibraryIndex(deps.dataDir, index))
    }

    deps.invalidate()
    return deps.state()
  }
}
