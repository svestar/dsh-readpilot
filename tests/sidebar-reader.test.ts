import test from 'node:test'
import assert from 'node:assert/strict'
import { preserveSidebarVisual, prefillCompanionQuote } from '../src/client/views/sidebar-reader.ts'

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

test('sidebar_companion_quote_uses_native_quote_insertion', () => {
  const quotes: string[] = []
  const drafts: string[] = []
  const inserted = prefillCompanionQuote({
    insertQuote(text) { quotes.push(text); return true },
    setDraft(text) { drafts.push(text) },
  }, 'a\nb')
  assert.equal(inserted, true)
  assert.deepEqual(quotes, ['a\nb'])
  assert.deepEqual(drafts, [])
})

test('sidebar_companion_quote_falls_back_to_the_draft', () => {
  const drafts: string[] = []
  const inserted = prefillCompanionQuote({
    insertQuote() { return false },
    setDraft(text) { drafts.push(text) },
  }, 'a\nb')
  assert.equal(inserted, true)
  assert.deepEqual(drafts, ['> a\n> b\n\n'])
})

test('sidebar_companion_quote_tolerates_a_throwing_composer', () => {
  const drafts: string[] = []
  const inserted = prefillCompanionQuote({
    insertQuote() { throw new Error('busy') },
    setDraft(text) { drafts.push(text) },
  }, 'quote')
  assert.equal(inserted, true)
  assert.deepEqual(drafts, ['> quote\n\n'])
})

test('sidebar_companion_quote_requires_text_and_actions', () => {
  assert.equal(prefillCompanionQuote({ setDraft() {} }, '   '), false)
  assert.equal(prefillCompanionQuote(null, 'quote'), false)
  assert.equal(prefillCompanionQuote({}, 'quote'), false)
})
