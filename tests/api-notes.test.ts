import test from 'node:test'
import assert from 'node:assert/strict'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createReaderApi, noteFilePath } from '../src/host/app.ts'
import { fakeContext, makeLibrary } from './support/api-helpers.ts'
test('note_files_rpc_roundtrip', async t => {
  const { library, data } = await makeLibrary(t)
  const api = createReaderApi({ ctx: fakeContext(), dataDir: data })
  const state = await api.configureLibrary({ path: library })
  const bookId = state.books[0].id

  const created = await api.handleRpc('noteFiles', { action: 'create', bookId, title: '权力', body: '# 权力' })
  assert.equal(created.ok, true)
  const id = created.value.note.id

  const listed = await api.handleRpc('noteFiles', { action: 'list', bookId })
  assert.equal(listed.value.notes.length, 1)

  const read = await api.handleRpc('noteFiles', { action: 'read', bookId, id })
  assert.match(read.value.body, /权力/)

  const written = await api.handleRpc('noteFiles', {
    action: 'write',
    bookId,
    id,
    title: '权力结构',
    body: '更新',
    baseHash: read.value.hash,
  })
  assert.equal(written.ok, true)
  assert.match(written.value.body, /更新/)

  const conflict = await api.handleRpc('noteFiles', {
    action: 'write',
    bookId,
    id,
    body: '冲突',
    baseHash: read.value.hash,
  })
  assert.equal(conflict.ok, false)
  assert.equal(conflict.error?.code, 'note-conflict')

  const removed = await api.handleRpc('noteFiles', { action: 'remove', bookId, id })
  assert.equal(removed.value.deleted, true)
})

test('note_context_toggle_and_injection', async t => {
  const { library, data } = await makeLibrary(t)
  const api = createReaderApi({ ctx: fakeContext(), dataDir: data })
  const state = await api.configureLibrary({ path: library })
  const bookId = state.books[0].id

  const created = await api.handleRpc('noteFiles', {
    action: 'create',
    bookId,
    title: '权力',
    body: '黑暗森林',
  })
  assert.equal(created.ok, true)

  await api.setCompanionContext({ sessionId: 's1', bookId, title: 'demo', chapter: '第一章' })
  const enabled = await api.handleRpc('setNoteContext', { bookId, enabled: true })
  assert.equal(enabled.ok, true)
  assert.equal(enabled.value.enabled, true)
  assert.ok(enabled.value.characters > 0)
  assert.match(api.notesContextFor('s1'), /黑暗森林/)
  assert.equal(api.notesContextFor('s2'), '')
  assert.equal((await api.state()).companion.notes[bookId], true)

  const disabled = await api.handleRpc('setNoteContext', { bookId, enabled: false })
  assert.equal(disabled.ok, true)
  assert.equal(disabled.value.characters, 0)
  assert.equal(api.notesContextFor('s1'), '')
  assert.equal((await api.state()).companion.notes[bookId], undefined)
})

test('note_drafts_rpc_and_tool', async t => {
  const { library, data } = await makeLibrary(t)
  const api = createReaderApi({ ctx: fakeContext(), dataDir: data })
  const state = await api.configureLibrary({ path: library })
  const bookId = state.books[0].id

  const created = await api.handleRpc('noteFiles', {
    action: 'create',
    bookId,
    title: '人物',
    body: '罗辑',
  })
  const noteId = created.value.note.id

  const draft = await api.noteDraftCreate({
    book: bookId,
    action: 'append',
    noteId,
    text: '章北海',
  })
  assert.match(draft.draft.body, /章北海/)

  const listed = await api.handleRpc('noteDrafts', { action: 'list', bookId })
  assert.equal(listed.ok, true)
  assert.equal(listed.value.drafts.length, 1)

  const index = await api.toolNoteFiles({ book: bookId, action: 'index' })
  assert.equal(index.notes.length, 1)
  const read = await api.toolNoteFiles({ book: bookId, action: 'read', id: noteId })
  assert.match(read.body, /罗辑/)

  const applied = await api.handleRpc('noteDrafts', { action: 'apply', bookId, draftId: draft.draft.id })
  assert.equal(applied.ok, true)
  assert.match(applied.value.body, /章北海/)
  assert.equal((await api.handleRpc('noteDrafts', { action: 'list', bookId })).value.drafts.length, 0)

  const second = await api.noteDraftCreate({ book: bookId, action: 'append', noteId, text: '不要了' })
  const rejected = await api.handleRpc('noteDrafts', { action: 'reject', bookId, draftId: second.draft.id })
  assert.equal(rejected.value.rejected, true)
})

test('notes_rpc_roundtrip', async t => {
  const { library, data } = await makeLibrary(t)
  const api = createReaderApi({ ctx: fakeContext(), dataDir: data })
  const configured = await api.handleRpc('configure', { path: library })
  const bookId = configured.value.books[0].id

  const added = await api.handleRpc('notes', {
    action: 'add',
    bookId,
    chapterId: 'c001',
    blockIndex: 0,
    offset: 0,
    quote: '测试引用',
    note: '测试笔记',
  })
  assert.equal(added.ok, true)
  assert.match(added.value.note.id, /^note-/)

  const listed = await api.handleRpc('notes', { action: 'list', bookId })
  assert.equal(listed.ok, true)
  assert.equal(listed.value.notes.length, 1)

  const removed = await api.handleRpc('notes', {
    action: 'delete',
    bookId,
    noteId: added.value.note.id,
  })
  assert.equal(removed.ok, true)
  assert.equal(removed.value.deleted, true)

  const empty = await api.handleRpc('notes', { action: 'list', bookId })
  assert.equal(empty.value.notes.length, 0)
})

test('memory_rpc_requires_opt_in', async t => {
  const { library, data } = await makeLibrary(t)
  const api = createReaderApi({ ctx: fakeContext(), dataDir: data })
  const state = await api.configureLibrary({ path: library })
  const bookId = state.books[0].id

  await api.setCompanionContext({ sessionId: 's1', bookId, title: 'demo', chapter: 'c001' })
  const read = await api.memoryTool({ book: bookId, action: 'read' })
  assert.equal(read.effective, 'off')
  await assert.rejects(
    () => api.memoryTool({ book: bookId, action: 'update', scope: 'book', text: '读者偏好简洁回答' }),
    (error: any) => error?.code === 'memory-off',
  )

  await api.memory({ action: 'setMode', bookId, mode: 'on' })
  await api.memoryTool({ book: bookId, action: 'update', scope: 'book', text: '读者偏好简洁回答' })
  assert.match(api.memoryContextFor('s1'), /读者偏好简洁回答/)

  await assert.rejects(
    () => api.memoryTool({ book: bookId, action: 'update', scope: 'book', mode: 'replace', text: 'a'.repeat(601) }),
    (error: any) => error?.code === 'memory-too-large',
  )

  await api.memory({ action: 'setBook', bookId, state: 'off' })
  assert.equal(api.memoryContextFor('s1'), '')
})

test('note_history_rpc_roundtrip', async t => {
  const { library, data } = await makeLibrary(t)
  const api = createReaderApi({ ctx: fakeContext(), dataDir: data })
  const state = await api.configureLibrary({ path: library })
  const bookId = state.books[0].id

  const created = await api.handleRpc('noteFiles', { action: 'create', bookId, title: '历史', body: 'v1' })
  const id = created.value.note.id
  await api.handleRpc('noteFiles', {
    action: 'write',
    bookId,
    id,
    body: 'v2',
    baseHash: created.value.hash,
  })

  const history = await api.handleRpc('noteFiles', { action: 'history', bookId, id })
  assert.equal(history.ok, true)
  assert.equal(history.value.history.length, 1)

  const restored = await api.handleRpc('noteFiles', {
    action: 'restore',
    bookId,
    id,
    historyId: history.value.history[0].id,
  })
  assert.equal(restored.ok, true)
  assert.match(restored.value.body, /v1/)
})

test('export_notes_rpc', async t => {
  const { library, data } = await makeLibrary(t)
  const api = createReaderApi({ ctx: fakeContext(), dataDir: data })
  const state = await api.configureLibrary({ path: library })
  const bookId = state.books[0].id

  await api.handleRpc('noteFiles', { action: 'create', bookId, title: '权力', body: '黑暗森林' })
  await api.handleRpc('notes', {
    action: 'add',
    bookId,
    chapterId: 'c001',
    blockIndex: 0,
    offset: 0,
    quote: '测试引用',
    note: '测试笔记',
  })

  const exported = await api.handleRpc('exportNotes', { bookId })
  assert.equal(exported.ok, true)
  assert.match(exported.value.markdown, /黑暗森林/)
  assert.match(exported.value.markdown, /测试引用/)
  assert.match(exported.value.fileName, /阅读笔记\.md$/)
})

test('note_auto_apply_rpc', async t => {
  const { library, data } = await makeLibrary(t)
  const api = createReaderApi({ ctx: fakeContext(), dataDir: data })
  const state = await api.configureLibrary({ path: library })
  const bookId = state.books[0].id
  assert.equal((await api.state()).companion?.autoApplyNotes, false)

  const enabled = await api.setAutoApplyNotes({ enabled: true })
  assert.equal(enabled.enabled, true)
  await api.handleRpc('noteFiles', { action: 'create', bookId, kind: 'book', title: '整书', body: '开头' })
  const result = await api.noteDraftCreate({ book: bookId, action: 'append', id: 'book', text: '追加' })
  assert.equal(result.autoApplied, true)
  assert.equal(result.note?.id, 'book')
  const read = await api.handleRpc('noteFiles', { action: 'read', bookId, id: 'book' })
  assert.match(read.value.body, /追加/)
})

test('open_note_file_rejects_invalid_note', async t => {
  const { library, data } = await makeLibrary(t)
  const api = createReaderApi({ ctx: fakeContext(), dataDir: data })
  const state = await api.configureLibrary({ path: library })
  const bookId = state.books[0].id

  const opened = await api.handleRpc('openNoteFile', { bookId, id: '../bad' })
  assert.equal(opened.ok, false)
})

test('note_file_path_is_relative_to_library', () => {
  const root = join(tmpdir(), 'book-store')
  const notePath = join('notes', 'book-id', 'chapter.md')
  assert.equal(noteFilePath(root, notePath), join(root, notePath))
  assert.throws(
    () => noteFilePath(root, join('notes', '..', 'outside.md')),
    (error: any) => error?.code === 'invalid-note',
  )
  assert.throws(
    () => noteFilePath(root, join('other', 'outside.md')),
    (error: any) => error?.code === 'invalid-note',
  )
})
