import test from 'node:test'
import assert from 'node:assert/strict'
import { parseHTML } from 'linkedom'
import { blockJumpFraction, noteBlockMatch, noteLayoutKey, resolveNoteBlock } from '../src/client/lib/helpers.ts'
import { resolveSourceNoteHighlight } from '../src/client/modules/notes/use-note-marks.ts'
import { hashText } from '../src/client/modules/reader/anchor.ts'

const globalAny = globalThis as any

globalAny.window = {
  __ModuleLoader__: {
    load(registration: any) {
      globalAny.__readerRegistration = registration
    },
  },
}
globalAny.document = {
  createElement() {
    return { dataset: {}, style: {}, textContent: '' }
  },
  head: { appendChild() {} },
}

// @ts-expect-error client.js is a build artifact without type declarations.
await import('../client.js')

const plugin = globalAny.__readerRegistration.factory(() => ({ createElement: () => null }))

test('find_note_occurrence_prefers_offset', () => {
  const text = 'alpha beta alpha gamma'
  const first = plugin.findNoteOccurrence(text, 'alpha', 0)
  const second = plugin.findNoteOccurrence(text, 'alpha', 15)
  assert.deepEqual(first, { start: 0, end: 5 })
  assert.deepEqual(second, { start: 11, end: 16 })
})

test('find_note_occurrence_missing', () => {
  assert.equal(plugin.findNoteOccurrence('hello', 'missing', 0), null)
  assert.equal(plugin.findNoteOccurrence('hello', '', 0), null)
  assert.equal(plugin.findNoteOccurrence('', 'hello', 0), null)
})

test('find_note_occurrence_uses_context', () => {
  const text = '开头 target 结尾；另一段 target 后续'
  const match = plugin.findNoteOccurrence(text, 'target', 0, '另一段 ', ' 后续')
  assert.deepEqual(match, { start: text.lastIndexOf('target'), end: text.lastIndexOf('target') + 6 })
})

test('note_block_match_uses_intra_block_offset', () => {
  const text = 'alpha beta alpha gamma'
  assert.deepEqual(noteBlockMatch(text, { quote: 'alpha', offset: 0 }), { start: 0, end: 5 })
  assert.deepEqual(noteBlockMatch(text, { quote: 'alpha', offset: 11 }), { start: 11, end: 16 })
  assert.deepEqual(noteBlockMatch(text, { quote: 'alpha', offset: 99 }), { start: 0, end: 5 })
})

test('note_block_match_uses_block_context', () => {
  const text = '开头 target 结尾；另一段 target 后续'
  const match = noteBlockMatch(text, { quote: 'target', offset: 3, quotePrefix: '另一段 ', quoteSuffix: ' 后续' })
  assert.deepEqual(match, { start: text.lastIndexOf('target'), end: text.lastIndexOf('target') + 6 })
})

test('note_block_match_ignores_raw_markdown_block_hash', () => {
  const { document } = parseHTML(
    '<html><body><p data-block-index="0"><strong>target</strong></p><div data-translation-index="0"><p>target</p></div></body></html>',
  )
  ;(document.defaultView as any).NodeFilter = { SHOW_TEXT: 4 }
  const resolved = resolveNoteBlock(document.body as unknown as Element, {
    quote: 'target',
    offset: 0,
    blockIndex: 0,
    blockHash: hashText('**target**'),
  } as any)
  assert.ok(resolved)
  assert.equal(resolved.block.getAttribute('data-block-index'), '0')
  assert.deepEqual(resolved.match, { start: 0, end: 6 })
})

test('resolve_note_block_falls_back_to_block_index', () => {
  const { document } = parseHTML(
    '<html><body><p data-block-index="0"><strong>other</strong></p></body></html>',
  )
  ;(document.defaultView as any).NodeFilter = { SHOW_TEXT: 4 }
  const resolved = resolveNoteBlock(document.body as unknown as Element, {
    quote: 'target',
    offset: 0,
    blockIndex: 0,
    blockHash: hashText('**target**'),
  } as any)
  assert.ok(resolved)
  assert.equal(resolved.match, null)
  assert.equal(resolved.block.getAttribute('data-block-index'), '0')
})

test('note_highlight_prefers_exact_quote_across_blocks', () => {
  const { document } = parseHTML(
    '<html><body><div data-block-index="0"><p>alpha </p></div><div data-block-index="1"><p>beta</p></div></body></html>',
  )
  ;(document.defaultView as any).NodeFilter = { SHOW_TEXT: 4 }
  const resolved = resolveSourceNoteHighlight(document.body as unknown as Element, {
    quote: 'alpha beta',
    offset: 0,
    blockIndex: 0,
  } as any)
  assert.equal(resolved.block?.getAttribute('data-block-index'), '0')
  assert.deepEqual(resolved.match, { start: 0, end: 10 })
})

test('note_highlight_recovers_quote_when_block_index_moved', () => {
  const { document } = parseHTML(
    '<html><body><div data-block-index="0"><p>other</p></div><div data-block-index="1"><p>target</p></div></body></html>',
  )
  ;(document.defaultView as any).NodeFilter = { SHOW_TEXT: 4 }
  const resolved = resolveSourceNoteHighlight(document.body as unknown as Element, {
    quote: 'target',
    offset: 0,
    blockIndex: 0,
  } as any)
  assert.deepEqual(resolved.match, { start: 5, end: 11 })
  assert.ok(resolved.nodes.some(node => node.parentElement?.closest('[data-block-index="1"]')))
})

test('note_highlight_does_not_match_translation_for_source_note', () => {
  const { document } = parseHTML(
    '<html><body><div data-block-index="0"><p>other</p></div><div data-translation-index="0"><p>target</p></div></body></html>',
  )
  ;(document.defaultView as any).NodeFilter = { SHOW_TEXT: 4 }
  const resolved = resolveSourceNoteHighlight(document.body as unknown as Element, {
    quote: 'target',
    offset: 0,
    blockIndex: 0,
  } as any)
  assert.equal(resolved.match, null)
  assert.equal(resolved.block?.getAttribute('data-block-index'), '0')
})

test('note_highlight_does_not_match_chapter_title', () => {
  const { document } = parseHTML(
    '<html><body><h1>target</h1><div data-block-index="0"><p>other</p></div></body></html>',
  )
  ;(document.defaultView as any).NodeFilter = { SHOW_TEXT: 4 }
  const resolved = resolveSourceNoteHighlight(document.body as unknown as Element, {
    quote: 'target',
    offset: 0,
    blockIndex: 0,
  } as any)
  assert.equal(resolved.match, null)
  assert.equal(resolved.block?.getAttribute('data-block-index'), '0')
})

test('note_highlight_uses_rendered_block_offset_for_duplicate_quotes', () => {
  const { document } = parseHTML(
    '<html><body><div data-block-index="0"><p>target padding</p></div><div data-block-index="1"><p>other</p></div><div data-block-index="2"><p>target</p></div></body></html>',
  )
  ;(document.defaultView as any).NodeFilter = { SHOW_TEXT: 4 }
  const resolved = resolveSourceNoteHighlight(document.body as unknown as Element, {
    quote: 'target',
    offset: 0,
    blockIndex: 1,
    start: 0,
  } as any)
  assert.deepEqual(resolved.match, { start: 19, end: 25 })
})

test('block_jump_fraction_maps_intra_block_offset', () => {
  assert.equal(blockJumpFraction(0, 100), 0)
  assert.equal(blockJumpFraction(50, 100), 0.5)
  assert.equal(blockJumpFraction(100, 100), 1)
  assert.equal(blockJumpFraction(101, 100), 0)
  assert.equal(blockJumpFraction(-1, 100), 0)
  assert.equal(blockJumpFraction(10, 0), 0)
})

test('note_layout_key_changes_with_page_and_translation', () => {
  const base = noteLayoutKey(0, true, '1:')
  assert.notEqual(base, noteLayoutKey(1, true, '1:'))
  assert.notEqual(base, noteLayoutKey(0, false, '1:'))
  assert.notEqual(base, noteLayoutKey(0, true, '1:a'))
})
