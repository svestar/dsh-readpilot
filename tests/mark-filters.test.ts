import test from 'node:test'
import assert from 'node:assert/strict'
import { filterMarks, markChapterIds, markColors } from '../src/client/mark-filters.ts'

const marks = [
  { kind: 'highlight', chapterId: 'c1', color: 'yellow' },
  { kind: 'highlight', chapterId: 'c2', color: 'blue' },
  { kind: 'highlight', chapterId: 'c2' },
  { kind: 'note', chapterId: 'c1' },
  { kind: 'bookmark', chapterId: 'c2' },
]

test('filter_marks_by_chapter_and_color', () => {
  assert.equal(filterMarks(marks).length, 5)
  assert.deepEqual(filterMarks(marks, { chapterId: 'c1' }).map(mark => mark.kind), ['highlight', 'note'])
  assert.equal(filterMarks(marks, { color: 'blue' }).length, 1)
  assert.equal(filterMarks(marks, { color: 'yellow' }).length, 2)
  assert.equal(filterMarks(marks, { chapterId: 'c2', color: 'blue' }).length, 1)
  assert.equal(filterMarks(marks, { chapterId: 'c1', color: 'blue' }).length, 0)
})

test('mark_filter_options', () => {
  assert.deepEqual(markChapterIds(marks), ['c1', 'c2'])
  assert.deepEqual(markColors(marks), ['yellow', 'blue'])
  assert.deepEqual(markColors([{ kind: 'note', chapterId: 'c1' }]), [])
})
