import test from 'node:test'
import assert from 'node:assert/strict'
import { buildReaderJumpUrl, parseReaderJumpUrl } from '../src/jump-url.ts'
import { findPageReferences } from '../src/client/page-jump.ts'

test('reader_jump_url_roundtrip_and_validation', () => {
  const url = buildReaderJumpUrl('book-1', 'chapter-2', 120, '原文片段')
  assert.deepEqual(parseReaderJumpUrl(url), {
    bookId: 'book-1',
    chapterId: 'chapter-2',
    offset: 120,
    q: '原文片段',
  })
  assert.equal(parseReaderJumpUrl('https://example.com/jump?book=b&chapter=c'), null)
  assert.equal(parseReaderJumpUrl('not a url'), null)
  const spaces = buildReaderJumpUrl('book-1', 'chapter-2', undefined, '当创建 Ashmem 时')
  assert.ok(!spaces.includes(' '))
  assert.equal(parseReaderJumpUrl(spaces)?.q, '当创建 Ashmem 时')
})

test('page_references_find_ranges_and_single_pages', () => {
  const ranges = findPageReferences('第一段：13.1–13.3（PDF 148–150 页）｜先建立动机')
  assert.equal(ranges.length, 1)
  assert.equal(ranges[0].start, 148)
  assert.equal(ranges[0].end, 150)

  assert.deepEqual(findPageReferences('第 77 页').map(item => item.start), [77])
  assert.deepEqual(findPageReferences('13.1–13.3').map(item => item.start), [])
})
