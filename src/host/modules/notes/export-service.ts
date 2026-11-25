import { readFile, stat } from 'node:fs/promises'
import JSZip from 'jszip'
import type { Settings } from '../../../shared/contracts/library.ts'
import type { LibraryMeta } from '../../../shared/contracts/library.ts'
import type { NotesArchiveResult } from '../../../shared/contracts/notes.ts'
import type { OpenResult } from '../../../shared/contracts/reading.ts'
import type { Book } from '../library/book.ts'
import type { NoteFileStore } from './files/index.ts'
import type { NotesStore } from './store.ts'
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

function safeFileTitle(title: string, fallback: string): string {
  return title.replace(/[\\/:*?"<>|]/g, '-').trim() || fallback
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

  async function exportNotes({ bookId }: any = {}): Promise<{ markdown: string; fileName: string }> {
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
    const settings = await deps.currentSettings()
    const language = settings.workspaceLanguage ?? 'zh'
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
      language,
    })
    const safeTitle = safeFileTitle(book.title, language === 'en' ? 'Reading notes' : '阅读笔记')
    const fileName = `${safeTitle}-${language === 'en' ? 'reading-notes.md' : '阅读笔记.md'}`
    return { markdown, fileName }
  }

  async function exportNotesArchive({ bookId }: any = {}): Promise<NotesArchiveResult> {
    const book = await deps.resolveBook(bookId)
    const store = await deps.store()
    const files = await store.list(book)
    const settings = await deps.currentSettings()
    if (!settings.libraryDir) throw new ReaderError('no-library', '还没有配置书库')
    const zip = new JSZip()
    const entries: NotesArchiveResult['notes'] = []
    for (const file of files) {
      const entry = {
        id: file.id,
        kind: file.kind,
        title: file.title,
        path: file.path,
        size: file.size,
        hash: file.hash,
      }
      try {
        const target = noteFilePath(settings.libraryDir, file.path)
        zip.file(file.path, await readFile(target))
        entries.push(entry)
      } catch {
        entries.push({ ...entry, missing: true })
      }
    }
    zip.file('manifest.json', `${JSON.stringify({
      version: 1,
      bookId: book.id,
      bookTitle: book.title,
      exportedAt: Date.now(),
      notes: entries,
    }, null, 2)}\n`)
    const buffer = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' })
    const language = settings.workspaceLanguage ?? 'zh'
    const safeTitle = safeFileTitle(book.title, language === 'en' ? 'Long notes' : '阅读笔记')
    const fileName = `${safeTitle}-${language === 'en' ? 'long-notes.zip' : '长笔记.zip'}`
    return { base64: buffer.toString('base64'), fileName, count: files.length, notes: entries }
  }

  return { openNoteFile, exportNotes, exportNotesArchive }
}
