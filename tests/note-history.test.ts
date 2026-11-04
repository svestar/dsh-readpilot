import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createNoteFileStore } from '../src/note-files.ts'

async function makeRoot(t: any) {
  const root = await mkdtemp(join(tmpdir(), 'dsh-readpilot-note-history-'))
  t.after(() => rm(root, { recursive: true, force: true }))
  return root
}

const book = { id: 'abcdef1234567890', title: '三体', path: 'E:/Books/三体.epub' }

function pause(ms = 10): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

test('note_history_list_read_restore', async t => {
  const root = await makeRoot(t)
  const store = createNoteFileStore(root)

  const created = await store.create(book, { title: '人物', body: '第一版' })
  await pause()
  await store.write(book, created.note.id, { body: '第二版' })
  await pause()
  const latest = await store.write(book, created.note.id, { body: '第三版' })
  assert.match(latest.body, /第三版/)

  const history = await store.listHistory(book, created.note.id)
  assert.equal(history.length, 2)
  for (let index = 1; index < history.length; index += 1) {
    assert.ok(history[index - 1].createdAt >= history[index].createdAt)
  }

  const [newest, oldest] = history
  const newestEntry = await store.readHistory(book, created.note.id, newest.id)
  assert.match(newestEntry.body, /第二版/)
  await assert.rejects(
    () => store.readHistory(book, created.note.id, 'missing'),
    (error: any) => error?.code === 'invalid-history',
  )

  const oldestEntry = await store.readHistory(book, created.note.id, oldest.id)
  assert.equal(oldestEntry.id, oldest.id)
  assert.equal(oldestEntry.createdAt, oldest.createdAt)
  assert.match(oldestEntry.body, /第一版/)
  assert.match(oldestEntry.content, /^---\n/)
  assert.match(oldestEntry.content, /kind: topic/)
  assert.equal(oldestEntry.characters, oldestEntry.body.length)
  assert.equal(oldest.characters, oldestEntry.characters)

  await pause()
  const restored = await store.restoreHistory(book, created.note.id, oldest.id)
  assert.equal(restored.note.id, created.note.id)
  assert.match(restored.body, /第一版/)
  assert.equal(restored.hash, restored.note.hash)

  const current = await store.read(book, created.note.id)
  assert.match(current.body, /第一版/)
  assert.equal(current.hash, restored.hash)
  assert.equal(current.hash, created.hash)

  const after = await store.listHistory(book, created.note.id)
  assert.equal(after.length, 3)
  const added = after.find(entry => !history.some(old => old.id === entry.id))
  assert.ok(added)
  const snapshot = await store.readHistory(book, created.note.id, added.id)
  assert.match(snapshot.body, /第三版/)
})

test('note_history_rejects_invalid_id_and_missing_note', async t => {
  const root = await makeRoot(t)
  const store = createNoteFileStore(root)

  const created = await store.create(book, { title: '安全', body: '原始' })
  await store.write(book, created.note.id, { body: '更新' })
  const history = await store.listHistory(book, created.note.id)
  assert.equal(history.length, 1)

  const invalidIds = ['../book.md', '..\\book.md', '1234567890123-abcdef.md/..', '', 'book.md', '.history']
  for (const id of invalidIds) {
    await assert.rejects(
      () => store.readHistory(book, created.note.id, id),
      (error: any) => error?.code === 'invalid-history',
    )
    await assert.rejects(
      () => store.restoreHistory(book, created.note.id, id),
      (error: any) => error?.code === 'invalid-history',
    )
  }

  await assert.rejects(
    () => store.listHistory(book, '../bad'),
    (error: any) => error?.code === 'invalid-note',
  )

  await assert.rejects(
    () => store.listHistory(book, 'missing-note-id'),
    (error: any) => error?.code === 'note-not-found',
  )
  await assert.rejects(
    () => store.readHistory(book, 'missing-note-id', history[0].id),
    (error: any) => error?.code === 'note-not-found',
  )
  await assert.rejects(
    () => store.restoreHistory(book, 'missing-note-id', history[0].id),
    (error: any) => error?.code === 'note-not-found',
  )

  await assert.rejects(
    () => store.readHistory(book, created.note.id, '1234567890123-abcdef.md'),
    (error: any) => error?.code === 'history-not-found',
  )
  await assert.rejects(
    () => store.restoreHistory(book, created.note.id, '1234567890123-abcdef.md'),
    (error: any) => error?.code === 'history-not-found',
  )

  const current = await store.read(book, created.note.id)
  assert.match(current.body, /更新/)
  const remaining = await store.listHistory(book, created.note.id)
  assert.equal(remaining.length, 1)
  assert.equal(remaining[0].id, history[0].id)
})

test('note_history_respects_max_history', async t => {
  const root = await makeRoot(t)
  const store = createNoteFileStore(root, { maxHistory: 3 })

  const created = await store.create(book, { title: '上限', body: '版本 1' })
  for (let version = 2; version <= 5; version += 1) {
    await pause()
    await store.write(book, created.note.id, { body: `版本 ${version}` })
  }

  const history = await store.listHistory(book, created.note.id)
  assert.equal(history.length, 3)
  const newest = await store.readHistory(book, created.note.id, history[0].id)
  assert.match(newest.body, /版本 4/)
})

test('note_history_remove_and_clear', async t => {
  const root = await makeRoot(t)
  const store = createNoteFileStore(root)

  const created = await store.create(book, { title: '清理', body: '版本 1' })
  await pause()
  await store.write(book, created.note.id, { body: '版本 2' })
  await pause()
  await store.write(book, created.note.id, { body: '版本 3' })

  const history = await store.listHistory(book, created.note.id)
  assert.equal(history.length, 2)
  assert.equal(await store.removeHistory(book, created.note.id, history[0].id), true)
  assert.equal((await store.listHistory(book, created.note.id)).length, 1)
  assert.equal(await store.removeHistory(book, created.note.id, '1234567890123-abcdef.md'), false)
  assert.equal(await store.clearHistory(book, created.note.id), 1)
  assert.equal((await store.listHistory(book, created.note.id)).length, 0)
  assert.match((await store.read(book, created.note.id)).body, /版本 3/)
})
