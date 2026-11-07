import test from 'node:test'
import assert from 'node:assert/strict'
import { parseReaderBooksResult, readerToolResultText } from '../src/client/views/reader-tool-view.ts'

test('reader_books_tool_result_parses', () => {
  const value = parseReaderBooksResult(JSON.stringify({
    libraryDir: 'E:\\Books',
    books: [
      { id: 'b1', title: 'A', format: 'txt', size: 2048, progress: { chapterTitle: '第一章' } },
      { id: 'b2', title: 'B', format: 'pdf', size: 4096 },
      { title: '' },
      'not a book',
    ],
  }))
  assert.deepEqual(value, {
    books: [
      { id: 'b1', title: 'A', format: 'txt', size: 2048, progress: '第一章' },
      { id: 'b2', title: 'B', format: 'pdf', size: 4096, progress: '' },
    ],
  })
  assert.equal(parseReaderBooksResult('not json'), null)
  assert.equal(parseReaderBooksResult('{}'), null)
  assert.equal(parseReaderBooksResult(''), null)
})

test('reader_tool_result_text_reads_single_text_block', () => {
  assert.equal(readerToolResultText({ content: [{ type: 'text', text: 'hello' }] }), 'hello')
  assert.equal(readerToolResultText({ content: [{ type: 'text', text: 'a' }, { type: 'text', text: 'b' }] }), null)
  assert.equal(readerToolResultText({ content: [{ type: 'image' }] }), null)
  assert.equal(readerToolResultText(null), null)
})
