import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import JSZip from 'jszip'
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
  await api.setNotesGlobal({ enabled: true })
  const enabled = await api.handleRpc('setNoteContext', { bookId, enabled: true })
  assert.equal(enabled.ok, true)
  assert.equal(enabled.value.enabled, true)
  assert.ok(enabled.value.characters > 0)
  const injected = api.notesContextFor('s1')
  assert.match(injected, /权力/)
  assert.doesNotMatch(injected, /黑暗森林/)
  assert.match(injected, /reader_notes/)
  assert.equal(api.notesContextFor('s2'), '')
  assert.equal((await api.state()).companion.notes[bookId], true)

  const disabled = await api.handleRpc('setNoteContext', { bookId, enabled: false })
  assert.equal(disabled.ok, true)
  assert.equal(disabled.value.characters, 0)
  assert.equal(api.notesContextFor('s1'), '')
  assert.equal((await api.state()).companion.notes[bookId], false)
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

test('memory_history_rpc_roundtrip', async t => {
  const { library, data } = await makeLibrary(t)
  const api = createReaderApi({ ctx: fakeContext(), dataDir: data })
  const state = await api.configureLibrary({ path: library })
  const bookId = state.books[0].id
  await api.setCompanionContext({ sessionId: 's1', bookId, title: 'demo', chapter: 'c001' })
  await api.memory({ action: 'setMode', bookId, mode: 'on' })

  await api.memory({ action: 'write', bookId, scope: 'book', text: 'B1' })
  const book = await api.memory({ action: 'write', bookId, scope: 'book', text: 'B2' })
  assert.equal(book.bookHistory.length, 1)
  const restored = await api.memory({ action: 'historyRestore', bookId, scope: 'book', id: book.bookHistory[0].id })
  assert.equal(restored.bookText, 'B1')
  assert.match(api.memoryContextFor('s1'), /B1/)

  await api.memory({ action: 'write', bookId, scope: 'reader', text: 'R1' })
  const reader = await api.memory({ action: 'write', bookId, scope: 'reader', text: 'R2' })
  const removed = await api.memory({ action: 'historyRemove', bookId, scope: 'reader', id: reader.readerHistory[0].id })
  assert.equal(removed.readerHistory.length, 0)
  assert.equal(removed.readerText, 'R2')
  const beforeClear = await api.memory({ action: 'write', bookId, scope: 'reader', text: 'R3' })
  assert.equal(beforeClear.readerHistory.length, 1)
  const cleared = await api.memory({ action: 'historyClear', bookId, scope: 'reader' })
  assert.equal(cleared.readerHistory.length, 0)
  assert.equal(cleared.readerText, 'R3')
  await assert.rejects(
    () => api.memory({ action: 'historyRestore', bookId, scope: 'book', id: '../evil' }),
    (error: any) => error?.code === 'invalid-history',
  )
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
  assert.equal(exported.value.path, undefined)
  assert.equal(existsSync(join(library, 'notes', '.exports')), false)
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

test('export_notes_archive_rpc', async t => {
  const { library, data } = await makeLibrary(t)
  const api = createReaderApi({ ctx: fakeContext(), dataDir: data })
  const state = await api.configureLibrary({ path: library })
  const bookId = state.books[0].id

  await api.handleRpc('noteFiles', { action: 'create', bookId, kind: 'book', title: '整书笔记', body: '整书正文' })
  await api.handleRpc('noteFiles', { action: 'create', bookId, title: '章节笔记', body: '章节正文' })

  const exported = await api.handleRpc('exportNotesArchive', { bookId })
  assert.equal(exported.ok, true)
  assert.match(exported.value.fileName, /长笔记\.zip$/)
  assert.equal(exported.value.count, 2)
  const zip = await JSZip.loadAsync(Buffer.from(exported.value.base64, 'base64'))
  const manifest = JSON.parse(await zip.file('manifest.json')!.async('string'))
  assert.equal(manifest.bookId, bookId)
  assert.equal(manifest.notes.length, 2)
  const notes = Object.keys(zip.files).filter(name => name.endsWith('.md'))
  assert.equal(notes.length, 2)
  const bodies = await Promise.all(notes.map(name => zip.file(name)!.async('string')))
  assert.ok(bodies.some(body => body.includes('整书正文')))
  assert.ok(bodies.some(body => body.includes('章节正文')))
  assert.equal(existsSync(join(library, 'notes', '.exports')), false)
})

test('notes_context_global_toggle', async t => {
  const { library, data } = await makeLibrary(t)
  const api = createReaderApi({ ctx: fakeContext(), dataDir: data })
  const state = await api.configureLibrary({ path: library })
  const bookId = state.books[0].id

  await api.handleRpc('noteFiles', { action: 'create', bookId, title: '权力', body: '黑暗森林' })
  await api.setCompanionContext({ sessionId: 's1', bookId, title: 'demo', chapter: '第一章' })

  const perBookOnly = await api.handleRpc('setNoteContext', { bookId, enabled: true })
  assert.equal(perBookOnly.ok, true)
  assert.equal(perBookOnly.value.characters, 0)
  assert.equal(api.notesContextFor('s1'), '')

  const enabled = await api.handleRpc('setNotesGlobal', { enabled: true })
  assert.equal(enabled.ok, true)
  assert.equal(enabled.value.enabled, true)
  assert.equal((await api.state()).companion.notesGlobal, true)
  assert.match(api.notesContextFor('s1'), /权力/)

  const perBookOff = await api.handleRpc('setNoteContext', { bookId, enabled: false })
  assert.equal(perBookOff.ok, true)
  assert.equal(api.notesContextFor('s1'), '')
  const perBookOn = await api.handleRpc('setNoteContext', { bookId, enabled: true })
  assert.equal(perBookOn.ok, true)
  assert.match(api.notesContextFor('s1'), /权力/)

  const disabled = await api.handleRpc('setNotesGlobal', { enabled: false })
  assert.equal(disabled.ok, true)
  assert.equal(disabled.value.enabled, false)
  assert.equal((await api.state()).companion.notesGlobal, false)
  assert.equal(api.notesContextFor('s1'), '')
})

test('notes_context_book_state_inherit', async t => {
  const { library, data } = await makeLibrary(t)
  const api = createReaderApi({ ctx: fakeContext(), dataDir: data })
  const state = await api.configureLibrary({ path: library })
  const bookId = state.books[0].id

  await api.handleRpc('noteFiles', { action: 'create', bookId, title: '权力', body: '黑暗森林' })
  await api.setCompanionContext({ sessionId: 's1', bookId, title: 'demo', chapter: '第一章' })

  const onWithoutGlobal = await api.handleRpc('setNoteContextState', { bookId, state: 'on' })
  assert.equal(onWithoutGlobal.ok, true)
  assert.equal(onWithoutGlobal.value.effective, false)
  assert.equal(api.notesContextFor('s1'), '')

  await api.setNotesGlobal({ enabled: true })
  assert.match(api.notesContextFor('s1'), /权力/)

  const off = await api.handleRpc('setNoteContextState', { bookId, state: 'off' })
  assert.equal(off.value.effective, false)
  assert.equal(api.notesContextFor('s1'), '')

  const inherit = await api.handleRpc('setNoteContextState', { bookId, state: 'inherit' })
  assert.equal(inherit.value.effective, true)
  assert.match(api.notesContextFor('s1'), /权力/)
})
