import { React } from '../../runtime.ts'
import { hashText } from '../reader/anchor.ts'
import { isAnnotationKind } from './mark-filters.ts'
import {
  applyEpubNoteMarks,
  collectTextNodes,
  compactAnchorText,
  findNoteOccurrence,
  noteBlockMatch,
  pdfChapterIdForPage,
  pdfNoteRects,
  rangeForNodes,
} from '../../lib/helpers.ts'
import type { CompactAnchor, ReaderPalette } from '../../lib/helpers.ts'
import type { PageLayout } from '../reader/paging.ts'
import type { MutableRef } from '../../lib/types.ts'
import type { Note, PageView, Screen, Visual } from '../../lib/types.ts'

interface NoteMarksOptions {
  activeChapterId: string
  contentRef: MutableRef<HTMLDivElement | null>
  fontSize: number
  layout: PageLayout
  notes: Note[]
  openNoteEditor: (note?: Note) => void
  paged: boolean
  pageView: PageView | null
  pageViews: PageView[]
  screen: Screen
  visual: Visual | null
  epubFrameRef: MutableRef<HTMLIFrameElement | null>
  epubReady: number
  epubJumpToken: number
  palette: ReaderPalette
  pendingEpubNoteRef: MutableRef<string | null>
  noteLayerRef: MutableRef<HTMLDivElement | null>
  noteLayersRef: MutableRef<Array<HTMLDivElement | null>>
  layoutKey?: string
}

export function useNoteMarks({
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
  layoutKey,
}: NoteMarksOptions): void {
  React.useEffect(() => {
    const targets: Array<{
      layer: HTMLDivElement
      view: PageView | null
      chapterId: string
      root: Element | null
      pdf: boolean
    }> = []
    if (visual?.kind === 'pdf') {
      const basePage = visual.page
      const layers = noteLayersRef.current ?? []
      const views = pageViews
      for (let index = 0; index < Math.max(layers.length, views.length); index += 1) {
        const layer = layers[index]
        if (!layer) continue
        const chapterId = screen.kind === 'book'
          ? pdfChapterIdForPage(screen, basePage + index, activeChapterId)
          : activeChapterId
        targets.push({
          layer,
          view: views[index] ?? null,
          chapterId,
          root: layer.parentElement,
          pdf: true,
        })
      }
    } else {
      const layer = noteLayerRef.current
      if (layer) {
        targets.push({
          layer,
          view: pageView,
          chapterId: activeChapterId,
          root: visual?.kind === 'epub'
            ? null
            : contentRef.current?.querySelector('.dsh-readpilot-reader-inner') ?? null,
          pdf: false,
        })
      }
    }
    for (const target of targets) target.layer.textContent = ''
    if (targets.length === 0 || screen.kind !== 'book') return

    let frame = 0
    const paintTarget = (target: typeof targets[number]) => {
      const { layer } = target
      layer.textContent = ''
      const root = target.pdf ? layer.parentElement : target.root
      if (!root || !root.isConnected) return
      const relevant = notes.filter(note =>
        note.chapterId === target.chapterId
        && typeof note.quote === 'string'
        && note.quote)
      if (relevant.length === 0) return
      const combined = collectTextNodes(root)
      const doc = root.ownerDocument ?? document
      const layerRect = layer.getBoundingClientRect()
      let compact: CompactAnchor | null = null
      const compactText = () => (compact ??= compactAnchorText(combined.text))
      for (const note of relevant) {
        const stripped = note.quote.replace(/^[\s•·▪◦●]+/, '')
        const quote = stripped || note.quote
        const shift = note.quote.length - quote.length
        const preferred = typeof note.start === 'number' ? note.start : note.offset + shift
        let nodes = combined.nodes
        let match: { start: number; end: number } | null = null
        let block: Element | null = null
        if (!target.pdf && Number.isInteger(note.blockIndex)) {
          const candidate = root.querySelector(`[data-block-index="${note.blockIndex}"]`)
          if (candidate && (!note.blockHash || hashText(candidate.textContent ?? '') === note.blockHash)) {
            block = candidate
            const scoped = collectTextNodes(candidate)
            if (scoped.text) {
              let scopedCompact: CompactAnchor | null = null
              const scopedCompactText = () => (scopedCompact ??= compactAnchorText(scoped.text))
              match = noteBlockMatch(scoped.text, note, scopedCompactText)
              if (match) nodes = scoped.nodes
            }
          }
        }
        if (!match) {
          match = findNoteOccurrence(combined.text, quote, preferred, note.quotePrefix, note.quoteSuffix, compactText)
          if (!match) {
            match = findNoteOccurrence(combined.text, note.quote, note.offset, note.quotePrefix, note.quoteSuffix, compactText)
          }
          nodes = combined.nodes
        }
        if (!match && !block) continue
        const pdfRects = match && target.pdf && target.view ? pdfNoteRects(target.view, match) : null
        let rects: Array<{ left: number; top: number; width: number; height: number }>
        if (pdfRects) rects = pdfRects
        else if (!match && block) {
          const blockRange = doc.createRange()
          blockRange.selectNodeContents(block)
          rects = [...blockRange.getClientRects()]
        } else {
          const range = match ? rangeForNodes(nodes, doc, match.start, match.end) : null
          rects = range ? [...range.getClientRects()] : []
        }
        for (const rect of rects) {
          if (!rect.width || !rect.height) continue
          const hit = document.createElement('div')
          hit.className = isAnnotationKind(note.kind)
            ? `dsh-readpilot-note-hit dsh-readpilot-highlight-${note.color ?? 'yellow'}`
            : 'dsh-readpilot-note-hit'
          hit.dataset.noteId = note.id
          hit.style.left = `${target.pdf ? rect.left : rect.left - layerRect.left}px`
          hit.style.top = `${target.pdf ? rect.top : rect.top - layerRect.top}px`
          hit.style.width = `${rect.width}px`
          hit.style.height = `${rect.height}px`
          layer.appendChild(hit)
        }
      }
    }
    const paint = () => {
      frame = 0
      for (const target of targets) paintTarget(target)
    }
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(paint)
    }
    // 译文插入/文本更新会改变多栏布局，但不会触发 React 依赖；用 DOM 变更兜住。
    const observer = typeof MutationObserver === 'function'
      ? new MutationObserver(records => {
        for (const record of records) {
          const inLayer = targets.some(target => target.layer.contains(record.target as Node))
          if (!inLayer) {
            schedule()
            return
          }
        }
      })
      : null
    if (observer) {
      for (const target of targets) {
        if (target.root) observer.observe(target.root, { childList: true, subtree: true, characterData: true })
      }
    }
    const onClick = (event: MouseEvent) => {
      const target = event.target as Element | null
      const hit = target?.closest?.('.dsh-readpilot-note-hit') as HTMLElement | null
      if (!hit) return
      const note = notes.find(entry => entry.id === hit.dataset.noteId)
      if (note) openNoteEditor(note)
    }
    for (const target of targets) target.layer.addEventListener('click', onClick)
    window.addEventListener('resize', schedule)
    paint()
    return () => {
      observer?.disconnect()
      if (frame) cancelAnimationFrame(frame)
      for (const target of targets) {
        target.layer.removeEventListener('click', onClick)
        target.layer.textContent = ''
      }
      window.removeEventListener('resize', schedule)
    }
  }, [activeChapterId, contentRef, fontSize, layout, layoutKey, notes, openNoteEditor, paged, pageView, pageViews, screen, visual])

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
}
