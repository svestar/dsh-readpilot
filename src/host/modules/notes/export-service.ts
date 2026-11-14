import { mkdir, stat, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { Settings } from '../../../shared/contracts/library.ts'
import type { LibraryMeta } from '../../../shared/contracts/library.ts'
import type { OpenResult } from '../../../shared/contracts/reading.ts'
import type { Book } from '../library/book.ts'
import type { NoteFileStore } from './files/index.ts'
import type { NotesStore } from './store.ts'
import { NOTES_DIR_NAME } from '../../lib/notes-paths.ts'
import { ReaderError } from '../../lib/errors.ts'
import { buildNotesMarkdown, type ExportLongNote, type ExportMark } from './export.ts'
import { noteFilePath, openWithExternalEditor } from './files/open.ts'

export interface NotesExportDependencies {
  resolveBook(bookId: unknown): Promise<Book>
  openBook(bookId: string): Promise<OpenResult>
  store(): Promise<NoteFileStore>
  notes: NotesStore
  libraryMeta(): Promise<LibraryMeta>
  currentSettings(): Promise<Settings>
}

export function createNotesExport(deps: NotesExportDependencies) {
  async function openNoteFile({ bookId, id }: any = {}): Promise<{ opened: boolean; path: string }> {
    const book = await deps.resolveBook(bookId)
    const store = await deps.store()
    const content = await store.read(book, String(id ?? ''))
    const settings = await deps.currentSettings()
    if (!settings.libraryDir) throw new ReaderError('no-library', '还没有配置书库')
    const target = noteFilePath(settings.libraryDir, content.note.path)
    try {
      await stat(target)
    } catch {
      throw new ReaderError('open-failed', '笔记文件不存在或无法读取')
    }
    try {
      await openWithExternalEditor(target)
    } catch (error) {
      throw new ReaderError(
        'open-failed',
        `无法打开外部编辑器：${error instanceof Error ? error.message : String(error)}`,
      )
    }
    return { opened: true, path: content.note.path }
  }

  async function exportNotes({ bookId, save }: any = {}): Promise<{ markdown: string; fileName: string; path?: string }> {
    const book = await deps.resolveBook(bookId)
    const opened = await deps.openBook(book.id)
    const store = await deps.store()
    const files = await store.list(book)
    const notes: ExportLongNote[] = []
    for (const file of files) {
      try {
        const content = await store.read(book, file.id)
        notes.push({
          kind: file.kind,
          title: file.title,
          body: content.body,
          path: file.path,
          updatedAt: file.updatedAt,
        })
      } catch {
        // Export the remaining notes even if one file is unreadable.
      }
    }
    const chapterTitles = new Map(opened.toc.map(item => [item.id, item.title]))
    const marks: ExportMark[] = (await deps.notes.list(book.id)).map(record => ({
      kind: record.kind,
      chapterTitle: chapterTitles.get(record.chapterId) ?? record.chapterId,
      quote: record.quote,
      note: record.note,
      annotation: record.annotation,
      color: record.color,
      pageLabel: record.kind === 'bookmark' ? record.annotation : undefined,
    }))
    const meta = await deps.libraryMeta()
    const markdown = buildNotesMarkdown({
      book: {
        title: book.title,
        ...(opened.book.author ? { author: opened.book.author } : {}),
        ...(meta.tags[book.id]?.length ? { tags: meta.tags[book.id] } : {}),
        ...(opened.progress
          ? { progress: { chapterTitle: opened.progress.chapterTitle, percent: opened.progress.percent } }
          : {}),
      },
      notes,
      marks,
    })
    const safeTitle = book.title.replace(/[\\/:*?"<>|]/g, '-').trim() || '阅读笔记'
    const fileName = `${safeTitle}-阅读笔记.md`
    if (save !== true) return { markdown, fileName }
    const settings = await deps.currentSettings()
    if (!settings.libraryDir) throw new ReaderError('no-library', '还没有配置书库')
    const dir = join(settings.libraryDir, NOTES_DIR_NAME, '.exports')
    await mkdir(dir, { recursive: true })
    await writeFile(join(dir, fileName), markdown, 'utf8')
    return { markdown, fileName, path: `notes/.exports/${fileName}` }
  }

  return { openNoteFile, exportNotes }
}
