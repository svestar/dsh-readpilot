export interface NoteBookRef {
  id: string
  title: string
  path?: string
}

export const NOTES_ENDPOINTS = {
  notes: 'notes',
  noteFiles: 'noteFiles',
  noteDrafts: 'noteDrafts',
  setNoteContext: 'setNoteContext',
  setAutoApplyNotes: 'setAutoApplyNotes',
  exportNotes: 'exportNotes',
  exportNotesArchive: 'exportNotesArchive',
  openNoteFile: 'openNoteFile',
} as const

export type NoteKind = 'annotation' | 'bookmark'
export type HighlightColor = 'yellow' | 'green' | 'blue' | 'pink' | 'purple'

export interface NoteRecord {
  id: string
  bookId: string
  kind: NoteKind
  color: HighlightColor
  chapterId: string
  blockIndex: number
  offset: number
  quote: string
  note: string
  annotation: string
  quotePrefix?: string
  quoteSuffix?: string
  textHash?: string
  start?: number
  end?: number
  blockHash?: string
  createdAt: number
  updatedAt: number
}

export type NoteFileKind = 'book' | 'topic'

export interface NoteFileRecord {
  id: string
  kind: NoteFileKind
  title: string
  bookId: string
  fileName: string
  path: string
  size: number
  hash: string
  createdAt: number
  updatedAt: number
}

export interface NoteFileContent {
  note: NoteFileRecord
  body: string
  hash: string
}

export interface NotesArchiveEntry {
  id: string
  kind: NoteFileKind
  title: string
  path: string
  size: number
  hash: string
  missing?: boolean
}

export interface NotesArchiveResult {
  base64?: string
  fileName: string
  count: number
  path?: string
  notes: NotesArchiveEntry[]
}

export interface NoteHistoryEntry {
  id: string
  createdAt: number
  characters: number
}

export type NoteDraftAction = 'create' | 'write' | 'append'

export interface NoteDraftRecord {
  id: string
  bookId: string
  action: NoteDraftAction
  noteId?: string
  kind: NoteFileKind
  title: string
  body: string
  baseBody: string
  baseHash?: string
  createdAt: number
}
