import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createNotesStore } from '../src/notes.js'
import { bookmarkContext } from '../src/client/bookmark-label.js'

test('highlight_and_bookmark_lifecycle', async t => {
  const root = await mkdtemp(join(tmpdir(), 'dsh-reader-marks-'))
  t.after(() => rm(root, { recursive: true, force: true }))
  const store = createNotesStore(root)
  const highlight = await store.add('book-a', {
    kind: 'highlight',
    color: 'green',
    chapterId: 'c001',
    blockIndex: 0,
    offset: 3,
    quote: '重点',
    note: '',
    annotation: '这里要回看',
  })
  assert.equal(highlight.kind, 'highlight')
  assert.equal(highlight.color, 'green')
  assert.equal(highlight.annotation, '这里要回看')

  const updated = await store.update('book-a', highlight.id, { color: 'blue', annotation: '改过的批注' })
  assert.equal(updated.color, 'blue')
  assert.equal(updated.annotation, '改过的批注')

  const bookmark = await store.add('book-a', {
    kind: 'bookmark',
    chapterId: 'c002',
    blockIndex: 0,
    offset: 0,
    quote: '',
    note: '第二章',
  })
  assert.equal(bookmark.kind, 'bookmark')
  assert.equal(bookmark.note, '第二章')

  const list = await store.list('book-a')
  assert.deepEqual(list.map(item => item.kind).sort(), ['bookmark', 'highlight'])
  await assert.rejects(() => store.add('book-a', {
    kind: 'highlight', color: 'orange', chapterId: 'c001', blockIndex: 0, offset: 0, quote: 'x', note: '',
  }), /unknown highlight color/)
})

test('bookmark_uses_pdf_outline_chapter', () => {
  const screen = {
    kind: 'book',
    detail: {
      book: { format: 'pdf' },
      toc: [{ id: 'c010', title: '第 10 页', page: 10 }],
      outline: [
        { title: '第一章', page: 1 },
        { title: '第二章', page: 8 },
      ],
    },
    content: { title: '第 10 页' },
  }
  assert.deepEqual(bookmarkContext(screen, 'c010'), {
    chapterTitle: '第二章',
    pageLabel: '第 10 页',
  })
})