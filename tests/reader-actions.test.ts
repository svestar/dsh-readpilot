import test from 'node:test'
import assert from 'node:assert/strict'
import { createReaderActionStore } from '../src/host/modules/actions/store.ts'

test('reader_actions_take_filters_and_removes', () => {
  const store = createReaderActionStore()
  const goto = store.push({ type: 'goto', bookId: 'a', chapterId: 'c1' })
  const notes = store.push({ type: 'notesRefresh', bookId: 'b' })
  const library = store.push({ type: 'libraryRefresh' })

  assert.equal(store.take({ types: ['goto'] }).map(action => action.id).join(), goto.id)
  assert.deepEqual(store.take({ types: ['notesRefresh'], bookId: 'a' }), [])
  assert.equal(store.take({ types: ['notesRefresh'], bookId: 'b' })[0].id, notes.id)
  assert.equal(store.take({ types: ['libraryRefresh'] })[0].id, library.id)
  assert.deepEqual(store.take(), [])
})

test('reader_actions_take_all_returns_every_type', () => {
  const store = createReaderActionStore()
  store.push({ type: 'open_panel', bookId: 'a', chapterId: 'c1' })
  store.push({ type: 'libraryRefresh' })
  assert.deepEqual(store.take().map(action => action.type), ['open_panel', 'libraryRefresh'])
})

test('reader_receipts_can_be_listed_and_marked_undone', () => {
  const store = createReaderActionStore()
  const receipt = store.addReceipt({
    type: 'annotation.add',
    bookId: 'a',
    bookTitle: '书',
    summary: '新增批注',
    undo: { kind: 'deleteNote', bookId: 'a', noteId: 'n1' },
  })
  assert.equal(receipt.undoable, true)
  const listed = store.listReceipts({ bookId: 'a' })
  assert.equal(listed.length, 1)
  assert.equal(listed[0].id, receipt.id)
  assert.equal(store.listReceipts({ bookId: 'b' }).length, 0)
  assert.equal(store.getReceipt(receipt.id)?.summary, '新增批注')
  assert.ok(store.markUndone(receipt.id)?.undoneAt)
  assert.equal(store.getReceipt(receipt.id)?.undoneAt !== undefined, true)
})
