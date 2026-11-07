import { React } from '../runtime.ts'
import { blocksText, contextAround, hashText, offsetInChapter } from '../anchor.ts'
import { bookmarkContext } from '../bookmark-label.ts'
import {
  applyEpubNoteMarks,
  collectTextNodes,
  findNoteOccurrence,
  messageOf,
  pdfNoteRects,
  rangeForNote,
  timestampOf,
} from '../helpers.ts'
import type { ReaderPalette } from '../helpers.ts'
import type { PageLayout } from '../paging.ts'
import type { StateSetter } from '../runtime.ts'
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
} from '../types.ts'

interface NotesOptions {
  call: CallRpc
  t: TextFn
  screen: Screen
  activeBookId: string | null
  activeChapterId: string
  visual: Visual | null
  pageView: PageView | null
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
      const list = value.notes.slice()
      list.sort((left, right) => timestampOf(right.createdAt) - timestampOf(left.createdAt))
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

  const selectionFields = React.useCallback(() => {
    if (!selection || screen.kind !== 'book') return null
    const blockIndex = Number.isInteger(selection.blockIndex) ? selection.blockIndex as number : 0
    const block = screen.content.blocks[blockIndex]
    const chapter = blocksText(screen.content.blocks)
    const stripped = selection.text.replace(/^[\s•·▪◦●]+/, '')
    const quote = stripped || selection.text
    const shift = selection.text.length - quote.length
    const preferred = offsetInChapter(screen.content.blocks, blockIndex, selection.offset) + shift
    const occurrence = findNoteOccurrence(chapter, quote, preferred)
    const start = occurrence?.start ?? preferred
    const context = contextAround(chapter, start, start + quote.length)
    return {
      chapterId: activeChapterId,
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
  }, [activeChapterId, screen, selection])

  const addHighlight = React.useCallback(async (color: string) => {
    const fields = selectionFields()
    if (!fields || screen.kind !== 'book' || noteSaving) return
    window.getSelection()?.removeAllRanges()
    epubFrameRef.current?.contentWindow?.getSelection()?.removeAllRanges()
    setNoteSaving(true)
    setNoteError('')
    try {
      await call('notes.add', {
        bookId: screen.detail.book.id,
        kind: 'highlight',
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

  const openNoteEditor = React.useCallback((note?: Note) => {
    if (note) {
      window.getSelection()?.removeAllRanges()
      epubFrameRef.current?.contentWindow?.getSelection()?.removeAllRanges()
      setNoteEditor({
        noteId: note.id,
        kind: note.kind ?? 'note',
        chapterId: note.chapterId,
        blockIndex: note.blockIndex,
        offset: note.offset,
        quote: note.quote,
      })
      setNoteDraft(note.kind === 'highlight' ? (note.annotation ?? '') : (note.note ?? ''))
      setNoteColor(note.color ?? 'yellow')
      setNoteError('')
      setSelection(null)
      requestAnimationFrame(() => noteInputRef.current?.focus())
      return
    }
    const fields = selectionFields()
    if (!fields) return
    setNoteEditor({ kind: 'note', ...fields })
    setNoteDraft('')
    setNoteColor('yellow')
    setNoteError('')
    setSelection(null)
    requestAnimationFrame(() => noteInputRef.current?.focus())
  }, [noteInputRef, selectionFields, setSelection])

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
    if (!editor || (!text && editor.kind !== 'highlight') || noteSaving || screen.kind !== 'book') return
    const noteId = editor.noteId
    const highlightNoteId = editor.kind === 'highlight' ? noteId : null
    if (editor.kind === 'highlight' && !highlightNoteId) return
    setNoteSaving(true)
    setNoteError('')
    try {
      if (highlightNoteId) {
        await call('notes.update', {
          bookId: screen.detail.book.id,
          noteId: highlightNoteId,
          annotation: text,
          color: noteColor,
        })
      } else if (noteId) {
        await call('notes.update', {
          bookId: screen.detail.book.id,
          noteId,
          note: text,
        })
      } else {
        await call('notes.add', {
          bookId: screen.detail.book.id,
          kind: 'note',
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

  React.useEffect(() => {
    const layer = noteLayerRef.current
    if (!layer) return
    const root = visual?.kind === 'pdf'
      ? layer.parentElement
      : contentRef.current?.querySelector('.dsh-readpilot-reader-inner')
    const currentChapter = activeChapterId
    const relevant = screen.kind === 'book'
      ? notes.filter(note => note.chapterId === currentChapter && typeof note.quote === 'string' && note.quote)
      : []
    layer.textContent = ''
    if (!root || relevant.length === 0) return

    let frame = 0
    const paint = () => {
      frame = 0
      layer.textContent = ''
      if (!root.isConnected) return
      const { text } = collectTextNodes(root)
      const layerRect = layer.getBoundingClientRect()
      const isPdf = visual?.kind === 'pdf'
      for (const note of relevant) {
        const stripped = note.quote.replace(/^[\s•·▪◦●]+/, '')
        const quote = stripped || note.quote
        const shift = note.quote.length - quote.length
        const preferred = typeof note.start === 'number' ? note.start : note.offset + shift
        let match = findNoteOccurrence(text, quote, preferred, note.quotePrefix, note.quoteSuffix)
        if (!match) {
          match = findNoteOccurrence(text, note.quote, note.offset, note.quotePrefix, note.quoteSuffix)
        }
        let block: Element | null = null
        if (!match && Number.isInteger(note.blockIndex)) {
          const candidate = root.querySelector(`[data-block-index="${note.blockIndex}"]`)
          if (candidate && (!note.blockHash || hashText(candidate.textContent ?? '') === note.blockHash)) block = candidate
        }
        if (!match && !block) continue
        const pdfRects = match && isPdf ? pdfNoteRects(pageView, match) : null
        let rects: Array<{ left: number; top: number; width: number; height: number }>
        if (pdfRects) rects = pdfRects
        else if (block) {
          const blockRange = document.createRange()
          blockRange.selectNodeContents(block)
          rects = [...blockRange.getClientRects()]
        } else {
          const range = match ? rangeForNote(root, match.start, match.end) : null
          rects = range ? [...range.getClientRects()] : []
        }
        for (const rect of rects) {
          if (!rect.width || !rect.height) continue
          const hit = document.createElement('div')
          hit.className = note.kind === 'highlight'
            ? `dsh-readpilot-note-hit dsh-readpilot-highlight-${note.color ?? 'yellow'}`
            : 'dsh-readpilot-note-hit'
          hit.dataset.noteId = note.id
          hit.style.left = `${isPdf ? rect.left : rect.left - layerRect.left}px`
          hit.style.top = `${isPdf ? rect.top : rect.top - layerRect.top}px`
          hit.style.width = `${rect.width}px`
          hit.style.height = `${rect.height}px`
          layer.appendChild(hit)
        }
      }
    }
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(paint)
    }
    const onClick = (event: MouseEvent) => {
      const target = event.target as Element | null
      const hit = target?.closest?.('.dsh-readpilot-note-hit') as HTMLElement | null
      if (!hit) return
      const note = notes.find(entry => entry.id === hit.dataset.noteId)
      if (note) openNoteEditor(note)
    }
    layer.addEventListener('click', onClick)
    window.addEventListener('resize', schedule)
    paint()
    return () => {
      if (frame) cancelAnimationFrame(frame)
      layer.removeEventListener('click', onClick)
      window.removeEventListener('resize', schedule)
      layer.textContent = ''
    }
  }, [activeChapterId, contentRef, fontSize, layout, notes, openNoteEditor, paged, pageView, palette, screen, visual?.kind, visual?.kind === 'pdf' ? visual.page : null])

  React.useEffect(() => {
    const frame = epubFrameRef.current
    if (visual?.kind !== 'epub' || screen.kind !== 'book' || !frame) return
    const result = applyEpubNoteMarks(
      frame,
      notes,
      screen.content.chapterId,
      palette,
      openNoteEditor,
      pendingEpubNoteRef.current,
    )
    if (result.jumped) pendingEpubNoteRef.current = null
    return result.cleanup
  }, [epubFrameRef, epubJumpToken, epubReady, layout, notes, openNoteEditor, paged, palette, screen, visual?.kind, visual?.kind === 'epub' ? visual.href : null])

  const noteItems = notes.filter(note => note.kind !== 'highlight' && note.kind !== 'bookmark')
  const highlights = notes.filter(note => note.kind === 'highlight')
  const bookmarks = notes.filter(note => note.kind === 'bookmark')

  return {
    notes: noteItems,
    highlights,
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
