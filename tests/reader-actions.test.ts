import test from 'node:test'
import assert from 'node:assert/strict'
import { createReaderActionStore } from '../src/reader-actions.ts'

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
