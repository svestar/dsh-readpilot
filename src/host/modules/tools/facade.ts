import type { ReaderAction, ReaderActionInput } from '../../../shared/contracts/actions.ts'
import type { Book } from '../library/book.ts'

export interface ReaderToolApi {
  toolBooks(): Promise<any>
  toolOpen(payload?: any): Promise<any>
  toolDigest(payload?: any): Promise<any>
  toolContext(payload?: any): Promise<any>
  toolRead(payload?: any): Promise<any>
  toolSearch(payload?: any): Promise<any>
  toolNote(payload?: any): Promise<any>
  toolNoteFiles(payload?: any): Promise<any>
  noteDraftCreate(payload?: any): Promise<any>
  memoryTool(payload?: any): Promise<any>
  libraryMeta(): Promise<{ tags: Record<string, string[]>; status: Record<string, string> }>
  setBookTags(payload: { bookId: string; tags: string[] }): Promise<{ bookId: string; tags: string[] }>
  setBookStatus(payload: { bookId: string; status: string | null }): Promise<{ bookId: string; status: string | null }>
  pushReaderAction(input: ReaderActionInput): Promise<ReaderAction>
  recordReaderReceipt(input: any): Promise<unknown>
  books(): Promise<Book[]>
}
