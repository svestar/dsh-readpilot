import test from 'node:test'
import assert from 'node:assert/strict'
import { buildBookDigest } from '../src/host/modules/reading/digest.ts'

test('digest_returns_full_text_for_small_books', () => {
  const digest = buildBookDigest([
    { id: 'c1', title: '第一章', text: '开场。中间。结尾。' },
    { id: 'c2', title: '第二章', text: '第二章正文。' },
  ], { maxChars: 1000 })
  assert.equal(digest.coverage, 'full')
  assert.equal(digest.truncated, false)
  assert.equal(digest.returnedChars, digest.totalChars)
  assert.equal(digest.chapters[0].excerpt, '开场。中间。结尾。')
})

test('digest_budgets_long_chapters_and_keeps_first_and_last', () => {
  const long = `开头句子。${'中间内容。'.repeat(400)}结尾句子。`
  const digest = buildBookDigest([
    { id: 'c1', title: '长章', text: long },
    { id: 'c2', title: '短章', text: '短章正文。' },
  ], { maxChars: 500, perChapterChars: 200 })
  assert.equal(digest.coverage, 'extractive')
  assert.equal(digest.truncated, true)
  assert.ok(digest.returnedChars <= 500)
  assert.ok(digest.chapters[0].excerpt.length <= 250)
  assert.match(digest.chapters[0].excerpt, /开头句子/)
  assert.match(digest.chapters[0].excerpt, /结尾句子/)
})

test('digest_handles_empty_and_oversized_inputs', () => {
  const empty = buildBookDigest([])
  assert.equal(empty.totalChars, 0)
  assert.equal(empty.coverage, 'full')
  const digest = buildBookDigest([
    { id: 'c1', title: '无正文', text: '   ' },
  ], { maxChars: 999999, perChapterChars: 9999 })
  assert.equal(digest.chapters[0].chars, 0)
  assert.equal(digest.chapters[0].excerpt, '')
})
