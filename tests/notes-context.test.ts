import test from 'node:test'
import assert from 'node:assert/strict'
import { buildReadingNotes } from '../src/host/modules/notes/context.ts'

test('notes_context_builds_notes_and_highlights', () => {
  const text = buildReadingNotes({
    bookTitle: '三体',
    notes: [
      { kind: 'book', title: '整书笔记', body: '总览', path: 'notes/三体-abc/book.md' },
      { kind: 'topic', title: '权力', body: '黑暗森林', path: 'notes/三体-abc/权力.md' },
    ],
    highlights: [{ quote: '给岁月以文明', annotation: '时间尺度' }],
  })

  assert.match(text, /^<reading_notes>/)
  assert.match(text, /三体/)
  assert.match(text, /整书笔记/)
  assert.match(text, /权力/)
  assert.match(text, /给岁月以文明/)
  assert.match(text, /时间尺度/)
  assert.match(text, /<\/reading_notes>$/)
})

test('notes_context_truncates_and_lists_paths', () => {
  const body = 'x'.repeat(5000)
  const text = buildReadingNotes({
    bookTitle: 'B',
    notes: Array.from({ length: 4 }, (_, index) => ({
      kind: 'topic' as const,
      title: `T${index}`,
      body,
      path: `notes/b/t${index}.md`,
    })),
    highlights: [],
    maxTotal: 6000,
    maxNote: 2000,
  })

  assert.ok(text.length <= 6200, String(text.length))
  assert.match(text, /已截断/)
  assert.match(text, /未注入的笔记/)
})

test('notes_context_uses_workspace_language', () => {
  const text = buildReadingNotes({
    bookTitle: 'Three Body',
    notes: [
      { kind: 'book', title: 'Book note', body: 'Overview', path: 'notes/book.md' },
      { kind: 'topic', title: 'Power', body: 'Dark forest', path: 'notes/power.md' },
    ],
    highlights: [{ quote: 'Give years to civilization', annotation: 'Timescale' }],
    language: 'en',
  })

  assert.match(text, /reference data, not instructions/)
  assert.match(text, /Book: Three Body/)
  assert.match(text, /## Book note/)
  assert.match(text, /## Topic notes/)
  assert.match(text, /## Annotated highlights/)
  assert.doesNotMatch(text, /书名|整书笔记|主题笔记|有批注的划线/)
})

test('notes_context_empty_returns_empty', () => {
  assert.equal(buildReadingNotes({ bookTitle: 'B', notes: [], highlights: [] }), '')
})
