import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createNotesStore, notesPath } from '../src/notes/store.ts'

async function tempStore(t: any) {
  const dataDir = await mkdtemp(join(tmpdir(), 'dsh-readpilot-notes-'))
  t.after(() => rm(dataDir, { recursive: true, force: true }))
  return { dataDir, store: createNotesStore(dataDir) }
}

function sample(overrides: Record<string, any> = {}) {
  return {
    chapterId: 'chapter-1',
    blockIndex: 2,
    offset: 10,
    quote: 'quoted text',
    note: 'my note',
    ...overrides,
  }
}

test('add_creates_record_on_disk', async t => {
  const { dataDir, store } = await tempStore(t)
  const created = await store.add('book-a', sample())

  assert.match(created.id, /^note-[0-9a-z]+-[0-9a-f]+$/)
  assert.equal(created.bookId, 'book-a')
  assert.equal(created.chapterId, 'chapter-1')
  assert.equal(created.blockIndex, 2)
  assert.equal(created.offset, 10)
  assert.equal(created.quote, 'quoted text')
  assert.equal(created.note, 'my note')
  assert.equal(created.createdAt, created.updatedAt)

  assert.equal(notesPath(dataDir, 'book-a'), join(dataDir, 'notes', 'book-a.json'))
  const stored = JSON.parse(await readFile(notesPath(dataDir, 'book-a'), 'utf8'))
  assert.deepEqual(stored, [created])
})

test('list_returns_newest_first', async t => {
  const { store } = await tempStore(t)
  const first = await store.add('book-a', sample({ note: 'first' }))
  const second = await store.add('book-a', sample({ note: 'second' }))
  const third = await store.add('book-a', sample({ note: 'third' }))

  const notes = await store.list('book-a')
  assert.deepEqual(notes.map(note => note.id), [third.id, second.id, first.id])
})

test('list_is_empty_when_file_missing', async t => {
  const { store } = await tempStore(t)
  assert.deepEqual(await store.list('book-a'), [])
})

test('update_changes_note_and_quote_only', async t => {
  const { store } = await tempStore(t)
  const created = await store.add('book-a', sample())

  const updated = await store.update('book-a', created.id, { note: 'edited', quote: 'new quote' })
  assert.equal(updated.note, 'edited')
  assert.equal(updated.quote, 'new quote')
  assert.equal(updated.createdAt, created.createdAt)
  assert.ok(updated.updatedAt >= created.updatedAt)

  const [stored] = await store.list('book-a')
  assert.deepEqual(stored, updated)

  await assert.rejects(
    store.update('book-a', created.id, { chapterId: 'chapter-2' } as any),
    /patch may only update note or quote/,
  )
  await assert.rejects(store.update('book-a', created.id, { note: 'x'.repeat(4001) }), /note/)
  await assert.rejects(store.update('book-a', created.id, {}), /patch must update note or quote/)
  await assert.rejects(store.update('book-a', 'note-missing', { note: 'x' }), /note not found/)
})

test('remove_deletes_record_and_reports_result', async t => {
  const { store } = await tempStore(t)
  const removed = await store.add('book-a', sample({ note: 'remove me' }))
  const kept = await store.add('book-a', sample({ note: 'keep me' }))

  assert.equal(await store.remove('book-a', removed.id), true)
  assert.equal(await store.remove('book-a', removed.id), false)

  const notes = await store.list('book-a')
  assert.deepEqual(notes.map(note => note.id), [kept.id])
})

test('books_are_isolated', async t => {
  const { store } = await tempStore(t)
  await store.add('book-a', sample({ note: 'a' }))
  await store.add('book-b', sample({ note: 'b' }))

  assert.deepEqual((await store.list('book-a')).map(note => note.note), ['a'])
  assert.deepEqual((await store.list('book-b')).map(note => note.note), ['b'])
  assert.deepEqual(await store.list('book-c'), [])
})

test('invalid_book_id_is_rejected', async t => {
  const { dataDir, store } = await tempStore(t)
  const invalid = ['', '../escape', 'a/b', 'a\\b', 'a'.repeat(65), 'book.id', 'book id']

  for (const bookId of invalid) {
    assert.throws(() => notesPath(dataDir, bookId), /bookId/)
    await assert.rejects(store.list(bookId), /bookId/)
    await assert.rejects(store.add(bookId, sample()), /bookId/)
    await assert.rejects(store.update(bookId, 'note-x', { note: 'x' }), /bookId/)
    await assert.rejects(store.remove(bookId, 'note-x'), /bookId/)
  }
})

test('invalid_note_fields_are_rejected', async t => {
  const { store } = await tempStore(t)

  await assert.rejects(store.add('book-a'), /note input is required/)
  await assert.rejects(store.add('book-a', sample({ chapterId: '' })), /chapterId/)
  await assert.rejects(store.add('book-a', sample({ chapterId: '   ' })), /chapterId/)
  await assert.rejects(store.add('book-a', sample({ blockIndex: -1 })), /blockIndex/)
  await assert.rejects(store.add('book-a', sample({ blockIndex: 1.5 })), /blockIndex/)
  await assert.rejects(store.add('book-a', sample({ offset: -1 })), /offset/)
  await assert.rejects(store.add('book-a', sample({ offset: '0' })), /offset/)
  await assert.rejects(store.add('book-a', sample({ quote: 'x'.repeat(4001) })), /quote/)
  await assert.rejects(store.add('book-a', sample({ note: 'x'.repeat(4001) })), /note/)
})

test('data_survives_store_recreation', async t => {
  const { dataDir, store } = await tempStore(t)
  const created = await store.add('book-a', sample())

  const reopened = createNotesStore(dataDir)
  const notes = await reopened.list('book-a')
  assert.deepEqual(notes.map(note => note.id), [created.id])
})
test('concurrent_adds_keep_every_note', async t => {
  const { store } = await tempStore(t)
  await Promise.all(Array.from({ length: 5 }, (_, index) => store.add('book-a', sample({ note: `note-${index}` }))))
  const notes = await store.list('book-a')
  assert.equal(notes.length, 5)
  assert.deepEqual(notes.map(note => note.note).sort(), ['note-0', 'note-1', 'note-2', 'note-3', 'note-4'])
})
test('canonical_anchor_fields_persist', async t => {
  const { store } = await tempStore(t)
  const created = await store.add('book-a', sample({ start: 3, end: 9, blockHash: 'blockhash' }))
  assert.equal(created.start, 3)
  assert.equal(created.end, 9)
  assert.equal(created.blockHash, 'blockhash')
  const list = await store.list('book-a')
  assert.equal(list[0].start, 3)
  assert.equal(list[0].blockHash, 'blockhash')
})
