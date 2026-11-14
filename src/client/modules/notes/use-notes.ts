import { React } from '../../runtime.ts'
import { blocksText, contextAround, hashText, offsetInChapter } from '../reader/anchor.ts'
import { bookmarkContext } from './bookmark-label.ts'
import { findNoteOccurrence, messageOf, timestampOf } from '../../lib/helpers.ts'
import { useNoteMarks } from './use-note-marks.ts'
import type { ReaderPalette } from '../../lib/preferences.ts'
import type { PageLayout } from '../reader/paging.ts'
import type { StateSetter } from '../../runtime.ts'
import type {
  CallRpc,
  MutableRef,
  Note,
  NoteEditor,
  NoteRef,
  PageView,
  Screen,
  Selection,
  SelectChapter,
  TextFn,
  Visual,
} from '../../lib/types.ts'

interface NotesOptions {
  call: CallRpc
  t: TextFn
  screen: Screen
  activeBookId: string | null
  activeChapterId: string
  visual: Visual | null
  pageView: PageView | null
  pageViews: PageView[]
  palette: ReaderPalette
  fontSize: number
  paged: boolean
  layout: PageLayout
  contentRef: MutableRef<HTMLDivElement | null>
  epubFrameRef: MutableRef<HTMLIFrameElement | null>
  epubReady: number
  selection: Selection | null
  setSelection: StateSetter<Selection | null>
  selectChapter: SelectChapter
}

export function useNotes({
  call,
  t,
  screen,
  activeBookId,
  activeChapterId,
  visual,
  pageView,
  pageViews,
  palette,
  fontSize,
  paged,
  layout,
  contentRef,
  epubFrameRef,
  epubReady,
  selection,
  setSelection,
  selectChapter,
}: NotesOptions) {
  const [notes, setNotes] = React.useState<Note[]>([])
  const [notesLoading, setNotesLoading] = React.useState(false)
  const [notesError, setNotesError] = React.useState('')
  const [noteDeletingId, setNoteDeletingId] = React.useState<string | null>(null)
  const [noteEditor, setNoteEditor] = React.useState<NoteEditor | null>(null)
  const [noteDraft, setNoteDraft] = React.useState('')
  const [noteColor, setNoteColor] = React.useState('yellow')
  const [noteSaving, setNoteSaving] = React.useState(false)
  const [noteError, setNoteError] = React.useState('')
  const [epubJumpToken, setEpubJumpToken] = React.useState(0)
  const noteInputRef = React.useRef<HTMLTextAreaElement | null>(null)
  const noteLayerRef = React.useRef<HTMLDivElement | null>(null)
  const noteLayersRef = React.useRef<Array<HTMLDivElement | null>>([])
  const pendingEpubNoteRef = React.useRef<string | null>(null)
  const notesRequestRef = React.useRef(0)

  const loadNotes = React.useCallback(async () => {
    const bookId = activeBookId
    if (!bookId) {
      setNotes([])
      return
    }
    const request = notesRequestRef.current + 1
    notesRequestRef.current = request
    setNotesLoading(true)
    setNotesError('')
    try {
      const value = await call('notes.list', { bookId })
      if (notesRequestRef.current !== request) return
      const list: Note[] = value.notes.slice()
      list.sort((left: Note, right: Note) => timestampOf(right.createdAt) - timestampOf(left.createdAt))
      setNotes(list)
    } catch (cause) {
      if (notesRequestRef.current === request) {
        setNotesError(`${t('notesFailed')}：${messageOf(cause)}`)
      }
    } finally {
      if (notesRequestRef.current === request) setNotesLoading(false)
    }
  }, [activeBookId, call, t])

  React.useEffect(() => {
    notesRequestRef.current += 1
    setNotes([])
    setNotesLoading(false)
    setNotesError('')
    setNoteDeletingId(null)
    setNoteEditor(null)
    setNoteDraft('')
    setNoteError('')
  }, [activeBookId])

  React.useEffect(() => {
    if (screen.kind !== 'book') return
    void loadNotes()
  }, [screen.kind, activeBookId, loadNotes])

  const openNote = React.useCallback((note: Note) => {
    if (!note || screen.kind !== 'book') return
    setNoteEditor(null)
    if (screen.detail.book.format === 'epub') {
      pendingEpubNoteRef.current = note.id
      setEpubJumpToken(previous => previous + 1)
      if (screen.content.chapterId === note.chapterId) return
    }
    void selectChapter(screen.detail.book.id, note.chapterId, {
      blockIndex: note.blockIndex,
      flash: true,
    })
  }, [screen, selectChapter])

  const deleteNote = React.useCallback(async (note: NoteRef) => {
    if (!note?.id || noteDeletingId) return
    const bookId = note.bookId ?? activeBookId
    if (!bookId) return
    setNoteDeletingId(note.id)
    setNotesError('')
    try {
      await call('notes.delete', {
        bookId,
        noteId: note.id,
      })
    } catch (cause) {
      setNotesError(`${t('noteDeleteFailed')}：${messageOf(cause)}`)
      setNoteDeletingId(null)
      return
    }
    setNoteDeletingId(null)
    await loadNotes()
  }, [activeBookId, call, loadNotes, noteDeletingId, t])

  const closeNoteEditor = React.useCallback(() => {
    setNoteEditor(null)
    setNoteDraft('')
    setNoteColor('yellow')
    setNoteError('')
  }, [])

  const selectionFields = React.useCallback(async () => {
    if (!selection || screen.kind !== 'book') return null
    const chapterId = selection.chapterId || activeChapterId
    let blocks = screen.content.blocks
    if (chapterId !== screen.content.chapterId) {
      try {
        const content = await call('chapter', { bookId: screen.detail.book.id, chapterId })
        blocks = content.blocks
      } catch {
        return null
      }
    }
    const blockIndex = Number.isInteger(selection.blockIndex) ? selection.blockIndex as number : 0
    const block = blocks[blockIndex]
    const chapter = blocksText(blocks)
    const stripped = selection.text.replace(/^[\s•·▪◦●]+/, '')
    const quote = stripped || selection.text
    const shift = selection.text.length - quote.length
    const preferred = offsetInChapter(blocks, blockIndex, selection.offset) + shift
    const occurrence = findNoteOccurrence(chapter, quote, preferred)
    const start = occurrence?.start ?? preferred
    const context = contextAround(chapter, start, start + quote.length)
    return {
      chapterId,
      blockIndex,
      offset: selection.offset + shift,
      quote,
      quotePrefix: context.prefix,
      quoteSuffix: context.suffix,
      textHash: hashText(chapter),
      start,
      end: start + quote.length,
      ...(block?.text ? { blockHash: hashText(block.text) } : {}),
    }
  }, [activeChapterId, call, screen, selection])

  const addHighlight = React.useCallback(async (color: string) => {
    const fields = await selectionFields()
    if (!fields || screen.kind !== 'book' || noteSaving) return
    window.getSelection()?.removeAllRanges()
    epubFrameRef.current?.contentWindow?.getSelection()?.removeAllRanges()
    setNoteSaving(true)
    setNoteError('')
    try {
      await call('notes.add', {
        bookId: screen.detail.book.id,
        kind: 'annotation',
        color,
        annotation: '',
        note: '',
        ...fields,
      })
    } catch (cause) {
      setNoteError(`${t('noteSaveFailed')}：${messageOf(cause)}`)
      setNoteSaving(false)
      return
    }
    setNoteSaving(false)
    setSelection(null)
    await loadNotes()
    window.getSelection()?.removeAllRanges()
    epubFrameRef.current?.contentWindow?.getSelection()?.removeAllRanges()
  }, [call, epubFrameRef, loadNotes, noteSaving, screen, selectionFields, setSelection, t])

  const openNoteEditor = React.useCallback(async (note?: Note) => {
    window.getSelection()?.removeAllRanges()
    epubFrameRef.current?.contentWindow?.getSelection()?.removeAllRanges()
    if (note) {
      setNoteEditor({
        noteId: note.id,
        kind: note.kind ?? 'annotation',
        chapterId: note.chapterId,
        blockIndex: note.blockIndex,
        offset: note.offset,
        quote: note.quote,
      })
      setNoteDraft(note.note || note.annotation || '')
      setNoteColor(note.color ?? 'yellow')
      setNoteError('')
      setSelection(null)
      requestAnimationFrame(() => noteInputRef.current?.focus())
      return
    }
    const fields = await selectionFields()
    if (!fields) return
    setNoteEditor({ kind: 'annotation', ...fields })
    setNoteDraft('')
    setNoteColor('yellow')
    setNoteError('')
    setSelection(null)
    requestAnimationFrame(() => noteInputRef.current?.focus())
  }, [epubFrameRef, noteInputRef, selectionFields, setSelection])

  const addBookmark = React.useCallback(async (label?: string) => {
    if (screen.kind !== 'book' || noteSaving) return
    const context = bookmarkContext(screen, activeChapterId)
    setNoteSaving(true)
    setNoteError('')
    try {
      await call('notes.add', {
        bookId: screen.detail.book.id,
        kind: 'bookmark',
        color: 'yellow',
        chapterId: activeChapterId,
        blockIndex: 0,
        offset: 0,
        quote: '',
        note: (typeof label === 'string' && label.trim()) || context.chapterTitle || screen.content.title || t('bookmark'),
        annotation: context.pageLabel,
      })
    } catch (cause) {
      setNoteError(`${t('noteSaveFailed')}：${messageOf(cause)}`)
      setNoteSaving(false)
      return
    }
    setNoteSaving(false)
    await loadNotes()
  }, [activeChapterId, call, loadNotes, noteSaving, screen, t])

  const saveNote = React.useCallback(async () => {
    const editor = noteEditor
    const text = noteDraft.trim()
    if (!editor || noteSaving || screen.kind !== 'book') return
    if (editor.kind === 'bookmark' && !text) return
    const noteId = editor.noteId
    setNoteSaving(true)
    setNoteError('')
    try {
      if (noteId) {
        await call('notes.update', {
          bookId: screen.detail.book.id,
          noteId,
          note: text,
          ...(editor.kind === 'bookmark' ? {} : { color: noteColor, annotation: '' }),
        })
      } else {
        await call('notes.add', {
          bookId: screen.detail.book.id,
          kind: editor.kind === 'bookmark' ? 'bookmark' : 'annotation',
          color: editor.kind === 'bookmark' ? 'yellow' : noteColor,
          chapterId: editor.chapterId,
          blockIndex: editor.blockIndex,
          offset: editor.offset,
          quote: editor.quote,
          quotePrefix: editor.quotePrefix,
          quoteSuffix: editor.quoteSuffix,
          textHash: editor.textHash,
          start: editor.start,
          end: editor.end,
          blockHash: editor.blockHash,
          note: text,
          annotation: '',
        })
      }
    } catch (cause) {
      setNoteError(`${t('noteSaveFailed')}：${messageOf(cause)}`)
      setNoteSaving(false)
      return
    }
    setNoteSaving(false)
    setNoteEditor(null)
    setNoteDraft('')
    setNoteColor('yellow')
    void loadNotes()
  }, [call, loadNotes, noteColor, noteDraft, noteEditor, noteSaving, screen, t])


  useNoteMarks({
    activeChapterId,
    contentRef,
    fontSize,
    layout,
    notes,
    openNoteEditor,
    paged,
    pageView,
    pageViews,
    screen,
    visual,
    epubFrameRef,
    epubReady,
    epubJumpToken,
    palette,
    pendingEpubNoteRef,
    noteLayerRef,
    noteLayersRef,
  })

  const annotations = notes.filter(note => note.kind !== 'bookmark')
  const bookmarks = notes.filter(note => note.kind === 'bookmark')

  return {
    annotations,
    bookmarks,
    notesLoading,
    notesError,
    noteDeletingId,
    noteEditor,
    noteDraft,
    setNoteDraft,
    noteColor,
    setNoteColor,
    noteSaving,
    noteError,
    noteInputRef,
    noteLayerRef,
    noteLayersRef,
    loadNotes,
    openNote,
    deleteNote,
    closeNoteEditor,
    openNoteEditor,
    addHighlight,
    addBookmark,
    saveNote,
  }
}
