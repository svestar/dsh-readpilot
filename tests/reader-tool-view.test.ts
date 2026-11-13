import test from 'node:test'
import assert from 'node:assert/strict'
import { parseReaderBooksResult, parseReaderOpenResult, parseReaderSearchResult, readerToolResultText } from '../src/client/reader/reader-tool-view.ts'

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

test('reader_search_tool_result_parses', () => {
  const value = parseReaderSearchResult(JSON.stringify({
    matches: [
      { bookId: 'b1', bookTitle: 'Book', chapterId: 'c1', chapterTitle: 'One', offset: 12, snippet: '片段' },
      { bookId: '', chapterId: 'c2', offset: 1, snippet: 'invalid' },
    ],
    truncated: true,
  }))
  assert.deepEqual(value, {
    matches: [
      { bookId: 'b1', bookTitle: 'Book', chapterId: 'c1', chapterTitle: 'One', offset: 12, snippet: '片段' },
    ],
    truncated: true,
  })
  assert.equal(parseReaderSearchResult('{}'), null)
  assert.equal(parseReaderSearchResult('not json'), null)
})

test('reader_open_tool_result_parses', () => {
  const value = parseReaderOpenResult(JSON.stringify({
    bookId: 'b1',
    title: 'Book',
    author: 'Author',
    toc: [{ id: 'c1', title: 'One' }, { title: '' }],
    tocTruncated: true,
  }))
  assert.deepEqual(value, {
    bookId: 'b1',
    title: 'Book',
    author: 'Author',
    toc: [{ id: 'c1', title: 'One' }],
    tocTruncated: true,
  })
  assert.equal(parseReaderOpenResult('{}'), null)
  assert.equal(parseReaderOpenResult('not json'), null)
})
