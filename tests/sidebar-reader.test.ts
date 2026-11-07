import test from 'node:test'
import assert from 'node:assert/strict'
import { preserveSidebarVisual } from '../src/client/views/sidebar-reader.ts'

test('sidebar_pdf_visual_keeps_current_page_when_chapter_updates', () => {
  const current = { kind: 'pdf' as const, page: 2, scale: 1.5 }
  const chapterStart = { kind: 'pdf' as const, page: 1, scale: 1.5 }
  assert.deepEqual(preserveSidebarVisual(current, chapterStart, false), current)
  assert.deepEqual(preserveSidebarVisual(current, chapterStart, true), chapterStart)
})

test('sidebar_epub_visual_keeps_same_href_and_follows_chapter_change', () => {
  const current = { kind: 'epub' as const, href: 'ch1.xhtml' }
  assert.deepEqual(preserveSidebarVisual(current, { kind: 'epub', href: 'ch1.xhtml' }, false), current)
  assert.deepEqual(preserveSidebarVisual(current, { kind: 'epub', href: 'ch2.xhtml' }, false), { kind: 'epub', href: 'ch2.xhtml' })
})
