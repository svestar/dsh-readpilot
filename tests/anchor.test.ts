import test from 'node:test'
import assert from 'node:assert/strict'
import { compactAnchorText, findNoteOccurrence } from '../src/client/lib/helpers.ts'
import type { CompactAnchor } from '../src/client/lib/helpers.ts'

test('note_occurrence_falls_back_to_whitespace_normalized_text', () => {
  const text = '第一段 有 空格\n第二段。'
  const match = findNoteOccurrence(text, '第一段有空格第二段', 0)
  assert.ok(match)
  assert.equal(text.slice(match!.start, match!.end), '第一段 有 空格\n第二段')
})

test('note_occurrence_uses_prefix_and_preferred_offset_for_duplicates', () => {
  const text = '重复句。中间。重复句。'
  const match = findNoteOccurrence(text, '重复句', 7, '中间。', '')
  assert.equal(match?.start, 7)
})

test('note_occurrence_reuses_lazy_compact_text', () => {
  const text = '第一段 有 空格\n第二段。'
  let compact: CompactAnchor | null = null
  const getCompact = () => (compact ??= compactAnchorText(text))
  assert.ok(findNoteOccurrence(text, '第二段', 0, '', '', getCompact))
  assert.equal(compact, null)
  assert.ok(findNoteOccurrence(text, '第一段有空格第二段', 0, '', '', getCompact))
  assert.ok(compact)
  const first = compact
  assert.ok(findNoteOccurrence(text, '第一段有空格第二段', 0, '', '', getCompact))
  assert.equal(compact, first)
})
