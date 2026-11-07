import test from 'node:test'
import assert from 'node:assert/strict'
import { buildReaderResource, parseReaderResource } from '../src/client/reader-resource.ts'

test('reader_resource_roundtrips_book_chapter_offset', () => {
  const address = buildReaderResource('b1', 'c2', 42)
  assert.equal(address, 'dsh-resource://dsh-readpilot/book/b1?chapter=c2&offset=42')
  assert.deepEqual(parseReaderResource(address), { bookId: 'b1', chapterId: 'c2', offset: 42 })
})

test('reader_resource_accepts_book_only_and_rejects_other_addresses', () => {
  assert.deepEqual(parseReaderResource(buildReaderResource('b1')), { bookId: 'b1' })
  assert.equal(parseReaderResource('dsh-resource://file/C%3A/books/a.txt'), null)
  assert.equal(parseReaderResource('https://example.com'), null)
  assert.equal(parseReaderResource(''), null)
  assert.equal(parseReaderResource('dsh-resource://dsh-readpilot/book/'), null)
  assert.deepEqual(parseReaderResource('dsh-resource://dsh-readpilot/book/b1?offset=x'), { bookId: 'b1' })
})
