export interface NoteResourceTarget {
  bookId: string
  noteId: string
}

const NOTE_RESOURCE_PREFIX = 'dsh-resource://dsh-readpilot-note/'

export function buildNoteResource(bookId: string, noteId: string): string {
  return `${NOTE_RESOURCE_PREFIX}${encodeURIComponent(bookId)}/${encodeURIComponent(noteId)}`
}

export function parseNoteResource(address: unknown): NoteResourceTarget | null {
  if (typeof address !== 'string' || !address.startsWith(NOTE_RESOURCE_PREFIX)) return null
  const rest = address.slice(NOTE_RESOURCE_PREFIX.length)
  const parts = rest.split('/')
  if (parts.length !== 2) return null
  try {
    const bookId = decodeURIComponent(parts[0])
    const noteId = decodeURIComponent(parts[1])
    return bookId && noteId ? { bookId, noteId } : null
  } catch {
    return null
  }
}
