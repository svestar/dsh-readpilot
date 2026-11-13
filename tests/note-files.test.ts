import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, readdir, readFile, rm, stat } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createNoteFileStore, NOTES_MARKER } from '../src/notes/files.ts'

async function makeRoot(t: any) {
  const root = await mkdtemp(join(tmpdir(), 'dsh-readpilot-notes-'))
  t.after(() => rm(root, { recursive: true, force: true }))
  return root
}

const book = { id: 'abcdef1234567890', title: '三体', path: 'E:/Books/三体.epub' }

test('note_file_create_and_list', async t => {
  const root = await makeRoot(t)
  const store = createNoteFileStore(root)

  const created = await store.create(book, { title: '权力结构', body: '# 权力\n\n黑暗森林。' })
  assert.equal(created.note.kind, 'topic')
  assert.equal(created.note.title, '权力结构')
  assert.match(created.body, /黑暗森林/)

  assert.ok((await stat(join(root, NOTES_MARKER))).isFile())
  const dirs = await readdir(root)
  const bookDir = dirs.find(name => name.startsWith('三体-abcdef12'))
  assert.ok(bookDir)
  const raw = await readFile(join(root, bookDir!, '权力结构.md'), 'utf8')
  assert.match(raw, /^---\n/)
  assert.match(raw, /kind: topic/)
  assert.match(raw, /bookId: abcdef1234567890/)

  const listed = await store.list(book)
  assert.equal(listed.length, 1)
  assert.equal(listed[0].id, created.note.id)
  assert.equal(listed[0].hash, created.hash)
})

test('note_file_write_conflict_and_history', async t => {
  const root = await makeRoot(t)
  const store = createNoteFileStore(root)
  const created = await store.create(book, { title: '人物', body: '罗辑' })

  const updated = await store.write(book, created.note.id, {
    title: '人物',
    body: '罗辑与章北海',
    baseHash: created.hash,
  })
  assert.match(updated.body, /章北海/)
  assert.notEqual(updated.hash, created.hash)

  await assert.rejects(
    () => store.write(book, created.note.id, { body: '覆盖', baseHash: created.hash }),
    (error: any) => error?.code === 'note-conflict',
  )

  const dirs = await readdir(root)
  const bookDir = dirs.find(name => name.startsWith('三体-abcdef12'))!
  const history = await readdir(join(root, bookDir, '.history', created.note.id))
  assert.ok(history.some(name => name.endsWith('.md')))

  const read = await store.read(book, created.note.id)
  assert.match(read.body, /章北海/)
  assert.equal(read.hash, updated.hash)
})

test('note_file_book_note_and_remove', async t => {
  const root = await makeRoot(t)
  const store = createNoteFileStore(root)

  const bookNote = await store.create(book, { kind: 'book', title: '整书笔记', body: '总览' })
  assert.equal(bookNote.note.kind, 'book')
  assert.equal(bookNote.note.fileName, 'book.md')

  await assert.rejects(
    () => store.create(book, { kind: 'book', title: '整书笔记', body: 'again' }),
    (error: any) => error?.code === 'note-exists',
  )

  const listed = await store.list(book)
  assert.equal(listed.length, 1)
  assert.equal(listed[0].kind, 'book')

  assert.equal(await store.remove(book, bookNote.note.id), true)
  assert.equal((await store.list(book)).length, 0)
})

test('note_file_title_sanitized', async t => {
  const root = await makeRoot(t)
  const store = createNoteFileStore(root)

  const created = await store.create(book, { title: '../evil:name', body: 'safe' })
  assert.equal(created.note.kind, 'topic')
  const dirs = await readdir(root)
  const bookDir = dirs.find(name => name.startsWith('三体-abcdef12'))!
  const files = await readdir(join(root, bookDir))
  assert.ok(files.includes('evil-name.md'), files.join(','))
  assert.equal(files.includes('..'), false)
})
