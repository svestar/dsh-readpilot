import test from 'node:test'
import assert from 'node:assert/strict'
import { parseHTML } from 'linkedom'
import { consumePendingBlock, preserveSidebarVisual, prefillCompanionQuote, chapterFractionForOffset, tocUsesPages } from '../src/client/modules/sidebar/navigation.ts'

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

test('sidebar_toc_uses_pages_for_pdf_original', () => {
  assert.equal(tocUsesPages('pdf', 'original', false), true)
  assert.equal(tocUsesPages('pdf', 'original', true), true)
  assert.equal(tocUsesPages('pdf', 'text', false), false)
  assert.equal(tocUsesPages('epub', 'original', false), false)
  assert.equal(tocUsesPages('txt', 'text', false), false)
})

test('sidebar_chapter_offset_maps_to_reading_fraction', () => {
  const blocks = [{ text: 'abcd' }, { text: 'ef' }]
  assert.equal(chapterFractionForOffset(blocks, 3), 0.5)
  assert.equal(chapterFractionForOffset(blocks, -5), 0)
  assert.equal(chapterFractionForOffset(blocks, 50), 1)
  assert.equal(chapterFractionForOffset(blocks, null), null)
  assert.equal(chapterFractionForOffset([], 1), null)
})

test('sidebar_pending_block_jumps_with_rendered_text_fraction', () => {
  const { document } = parseHTML(
    '<html><body><div data-block-index="0"><p>abcdefghij</p></div></body></html>',
  )
  const calls: Array<[number, number]> = []
  const consumed = consumePendingBlock(
    { blockIndex: 0, blockOffset: 4 },
    document.body as unknown as Element,
    (blockIndex, fraction) => calls.push([blockIndex, fraction]),
  )
  assert.equal(consumed, true)
  assert.deepEqual(calls, [[0, 0.4]])
})

test('sidebar_pending_block_waits_until_the_block_exists', () => {
  const { document } = parseHTML('<html><body><div data-block-index="1"></div></body></html>')
  let called = false
  assert.equal(consumePendingBlock(
    { blockIndex: 0, blockOffset: 4 },
    document.body as unknown as Element,
    () => { called = true },
  ), false)
  assert.equal(called, false)
  assert.equal(consumePendingBlock(null, document.body as unknown as Element, () => { called = true }), false)
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
