import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createNoteFileStore } from '../src/note-files.ts'
import { createNoteDraftStore } from '../src/note-drafts.ts'

async function makeStores(t: any) {
  const root = await mkdtemp(join(tmpdir(), 'dsh-reader-drafts-'))
  const data = join(root, 'data')
  const books = join(root, 'books')
  t.after(() => rm(root, { recursive: true, force: true }))
  const notes = createNoteFileStore(join(books, 'notes'))
  const drafts = createNoteDraftStore(data, notes)
  const book = { id: 'abcdef1234567890', title: '三体', path: join(books, '三体.epub') }
  return { notes, drafts, book }
}

test('note_draft_append_apply_and_reject', async t => {
  const { notes, drafts, book } = await makeStores(t)
  const created = await notes.create(book, { title: '人物', body: '罗辑' })

  const draft = await drafts.create(book, { action: 'append', noteId: created.note.id, text: '章北海' })
  assert.match(draft.body, /罗辑/)
  assert.match(draft.body, /章北海/)
  assert.equal(draft.baseHash, created.hash)

  const applied = await drafts.apply(book, draft.id)
  assert.match(applied.body, /章北海/)
  assert.equal((await drafts.list(book)).length, 0)

  const second = await drafts.create(book, { action: 'append', noteId: created.note.id, text: '不要了' })
  assert.equal(await drafts.reject(book, second.id), true)
  assert.equal((await drafts.list(book)).length, 0)
  const read = await notes.read(book, created.note.id)
  assert.doesNotMatch(read.body, /不要了/)
})

test('note_draft_create_and_apply', async t => {
  const { notes, drafts, book } = await makeStores(t)
  const draft = await drafts.create(book, { action: 'create', title: '权力', kind: 'topic', body: '# 权力' })
  assert.equal(draft.action, 'create')
  assert.equal(draft.baseBody, '')

  const applied = await drafts.apply(book, draft.id)
  assert.equal(applied.note.title, '权力')
  assert.match(applied.body, /权力/)
  assert.equal((await notes.list(book)).length, 1)
})

test('note_draft_conflict_keeps_draft', async t => {
  const { notes, drafts, book } = await makeStores(t)
  const created = await notes.create(book, { title: '人物', body: '罗辑' })
  const draft = await drafts.create(book, { action: 'append', noteId: created.note.id, text: '章北海' })

  await notes.write(book, created.note.id, { body: '用户改了', baseHash: created.hash })

  await assert.rejects(
    () => drafts.apply(book, draft.id),
    (error: any) => error?.code === 'note-conflict',
  )
  assert.equal((await drafts.list(book)).length, 1)
  const current = await notes.read(book, created.note.id)
  assert.match(current.body, /用户改了/)
  assert.doesNotMatch(current.body, /章北海/)
})
