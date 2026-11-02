import { React } from '../runtime.js'
import { blocksText, contextAround, hashText, offsetInChapter } from '../anchor.js'
import { bookmarkContext } from '../bookmark-label.js'
import {
  applyEpubNoteMarks,
  collectTextNodes,
  findNoteOccurrence,
  messageOf,
  rangeForNote,
  timestampOf,
} from '../helpers.js'

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
  contentRef,
  epubFrameRef,
  epubReady,
  selection,
  setSelection,
  selectChapter,
}) {
  const [notes, setNotes] = React.useState([])
  const [notesLoading, setNotesLoading] = React.useState(false)
  const [notesError, setNotesError] = React.useState('')
  const [noteDeletingId, setNoteDeletingId] = React.useState(null)
  const [noteEditor, setNoteEditor] = React.useState(null)
  const [noteDraft, setNoteDraft] = React.useState('')
  const [noteColor, setNoteColor] = React.useState('yellow')
  const [noteSaving, setNoteSaving] = React.useState(false)
  const [noteError, setNoteError] = React.useState('')
  const [epubJumpToken, setEpubJumpToken] = React.useState(0)
  const noteInputRef = React.useRef(null)
  const noteLayerRef = React.useRef(null)
  const pendingEpubNoteRef = React.useRef(null)
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
      const value = await call('notes', { action: 'list', bookId })
      if (notesRequestRef.current !== request) return
      const list = Array.isArray(value?.notes) ? value.notes.slice() : []
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

  const openNote = React.useCallback(note => {
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

  const deleteNote = React.useCallback(async note => {
    if (!note?.id || noteDeletingId) return
    setNoteDeletingId(note.id)
    setNotesError('')
    try {
      await call('notes', {
        action: 'delete',
        bookId: note.bookId ?? activeBookId,
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
    if (!selection || selection.blockIndex == null || screen.kind !== 'book') return null
    const chapter = blocksText(screen.content.blocks)
    const preferred = offsetInChapter(screen.content.blocks, selection.blockIndex, selection.offset)
    const occurrence = findNoteOccurrence(chapter, selection.text, preferred)
    const start = occurrence?.start ?? preferred
    const context = contextAround(chapter, start, start + selection.text.length)
    return {
      chapterId: activeChapterId,
      blockIndex: selection.blockIndex,
      offset: selection.offset,
      quote: selection.text,
      quotePrefix: context.prefix,
      quoteSuffix: context.suffix,
      textHash: hashText(chapter),
    }
  }, [activeChapterId, screen, selection])

  const addHighlight = React.useCallback(async color => {
    const fields = selectionFields()
    if (!fields || screen.kind !== 'book' || noteSaving) return
    setNoteSaving(true)
    setNoteError('')
    try {
      await call('notes', {
        action: 'add',
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
  }, [call, loadNotes, noteSaving, screen, selectionFields, setSelection, t])

  const openNoteEditor = React.useCallback(note => {
    if (note) {
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

  const addBookmark = React.useCallback(async label => {
    if (screen.kind !== 'book' || noteSaving) return
    const context = bookmarkContext(screen, activeChapterId)
    setNoteSaving(true)
    setNoteError('')
    try {
      await call('notes', {
        action: 'add',
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
    setNoteSaving(true)
    setNoteError('')
    try {
      if (editor.kind === 'highlight') {
        await call('notes', {
          action: 'update',
          bookId: screen.detail.book.id,
          noteId: editor.noteId,
          annotation: text,
          color: noteColor,
        })
      } else if (editor.noteId) {
        await call('notes', {
          action: 'update',
          bookId: screen.detail.book.id,
          noteId: editor.noteId,
          note: text,
        })
      } else {
        await call('notes', {
          action: 'add',
          bookId: screen.detail.book.id,
          kind: 'note',
          chapterId: editor.chapterId,
          blockIndex: editor.blockIndex,
          offset: editor.offset,
          quote: editor.quote,
          quotePrefix: editor.quotePrefix,
          quoteSuffix: editor.quoteSuffix,
          textHash: editor.textHash,
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
      : contentRef.current?.querySelector('.dsh-reader-reader-inner')
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
      const rootRect = root.getBoundingClientRect()
      for (const note of relevant) {
        const match = findNoteOccurrence(text, note.quote, note.offset, note.quotePrefix, note.quoteSuffix)
        if (!match) continue
        const range = rangeForNote(root, match.start, match.end)
        if (!range) continue
        for (const rect of range.getClientRects()) {
          if (!rect.width || !rect.height) continue
          const hit = document.createElement('div')
          hit.className = note.kind === 'highlight'
            ? `dsh-reader-note-hit dsh-reader-highlight-${note.color ?? 'yellow'}`
            : 'dsh-reader-note-hit'
          hit.dataset.noteId = note.id
          hit.style.left = `${rect.left - rootRect.left}px`
          hit.style.top = `${rect.top - rootRect.top}px`
          hit.style.width = `${rect.width}px`
          hit.style.height = `${rect.height}px`
          layer.appendChild(hit)
        }
      }
    }
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(paint)
    }
    const onClick = event => {
      const hit = event.target.closest?.('.dsh-reader-note-hit')
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
  }, [activeChapterId, contentRef, fontSize, notes, openNoteEditor, pageView, palette, screen, visual?.kind, visual?.page])

  React.useEffect(() => {
    if (visual?.kind !== 'epub' || screen.kind !== 'book' || !epubFrameRef.current) return
    const result = applyEpubNoteMarks(
      epubFrameRef.current,
      notes,
      screen.content.chapterId,
      palette,
      openNoteEditor,
      pendingEpubNoteRef.current,
    )
    if (result.jumped) pendingEpubNoteRef.current = null
    return result.cleanup
  }, [epubFrameRef, epubJumpToken, epubReady, notes, openNoteEditor, palette, screen, visual?.href, visual?.kind])

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
