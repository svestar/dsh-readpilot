import test from 'node:test'
import assert from 'node:assert/strict'
import { copyFile, mkdir, mkdtemp, readFile, rename, rm, stat, truncate, utimes, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createReaderApi, normalizeReadingView, noteFilePath } from '../src/api/index.ts'

function fakeContext(options: { fs?: any } = {}) {
  const workspaces: any[] = []
  const archivedSessionIds: string[] = []
  return {
    workspaces,
    archivedSessionIds,
    get(name: string) {
      if (name === 'fs') return options.fs
      if (name !== 'workspaceRegistry') return undefined
      return {
        archivedSessionIds,
        async resolveByPath(path: string) {
          return workspaces.find(workspace => workspace.path === path)
        },
        async create(path: string, title: string) {
          const workspace = { id: `ws-${workspaces.length + 1}`, path, title }
          workspaces.push(workspace)
          return workspace
        },
      }
    },
  }
}

async function makeLibrary(t: any) {
  const root = await mkdtemp(join(tmpdir(), 'dsh-readpilot-api-'))
  const library = join(root, 'books')
  const data = join(root, 'data')
  await mkdir(library, { recursive: true })
  await writeFile(
    join(library, 'demo.txt'),
    `第一章 开始\n\n${'这是第一章的测试文字。'.repeat(40)}\n\n第二章 继续\n\n再见。`,
    'utf8',
  )
  t.after(() => rm(root, { recursive: true, force: true }))
  return { root, library, data }
}


function buildBlankPdf(): Buffer {
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] >>',
  ]
  const chunks: Buffer[] = []
  let offset = 0
  const write = (value: string) => {
    const bytes = Buffer.from(value, 'latin1')
    chunks.push(bytes)
    offset += bytes.length
  }
  write('%PDF-1.4\n')
  const offsets = objects.map((body, index) => {
    const start = offset
    write(`${index + 1} 0 obj\n${body}\nendobj\n`)
    return start
  })
  const xrefOffset = offset
  write(`xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`)
  for (const start of offsets) write(`${String(start).padStart(10, '0')} 00000 n \n`)
  write(`trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`)
  return Buffer.concat(chunks)
}

test('book_tags_persist_and_validate', async t => {
  const { library, data } = await makeLibrary(t)
  const api = createReaderApi({ ctx: fakeContext(), dataDir: data })
  const state = await api.configureLibrary({ path: library })
  const bookId = state.books[0].id

  await api.setBookTags({ bookId, tags: ['技术', '技术', '待读'] })
  assert.deepEqual((await api.state()).tags[bookId], ['技术', '待读'])

  const reloaded = createReaderApi({ ctx: fakeContext(), dataDir: data })
  assert.deepEqual((await reloaded.state()).tags[bookId], ['技术', '待读'])

  await reloaded.setBookTags({ bookId, tags: [] })
  assert.equal((await reloaded.state()).tags[bookId], undefined)
  await assert.rejects(
    () => reloaded.setBookTags({ bookId, tags: ['x'.repeat(25)] }),
    /24/,
  )
})

test('progress_percent_persists', async t => {
  const { library, data } = await makeLibrary(t)
  const api = createReaderApi({ ctx: fakeContext(), dataDir: data })
  const state = await api.configureLibrary({ path: library })
  const bookId = state.books[0].id
  await api.saveReadingProgress({ bookId, chapterId: 'c002', chapterTitle: '第二章', chapterFraction: 0.25, percent: 42.5 })
  const progress = (await api.state()).progress[bookId]
  assert.equal(progress.chapterId, 'c002')
  assert.equal(progress.percent, 42.5)
  assert.equal(progress.chapterFraction, 0.25)
})

test('configure_creates_workspace', async t => {
  const { library, data } = await makeLibrary(t)
  const ctx = fakeContext()
  const api = createReaderApi({ ctx, dataDir: data })

  const first = await api.configureLibrary({ path: library })
  assert.ok(first.settings.workspaceId)
  assert.equal(ctx.workspaces.length, 1)
  assert.equal(first.books.length, 1)
  const promptFile = await readFile(join(library, 'AGENTS.md'), 'utf8')
  assert.match(promptFile, /dsh-readpilot:prompt:begin/)
  assert.equal((await api.state()).books.length, 1)

  const second = await api.configureLibrary({ path: library })
  assert.equal(ctx.workspaces.length, 1)
  assert.equal(second.settings.workspaceId, first.settings.workspaceId)
})

test('session_mapping_persists', async t => {
  const { library, data } = await makeLibrary(t)
  const api = createReaderApi({ ctx: fakeContext(), dataDir: data })
  const state = await api.configureLibrary({ path: library })
  const bookId = state.books[0].id
  await api.setCompanionSession({ bookId, sessionId: 'session-1' })

  const reloaded = createReaderApi({ ctx: fakeContext(), dataDir: data })
  const next = await reloaded.state()
  assert.equal(next.sessions[bookId].sessionId, 'session-1')
  await reloaded.setCompanionSession({ bookId, sessionId: null })
  assert.equal((await reloaded.state()).sessions[bookId], undefined)
})

test('search_returns_locator', async t => {
  const { library, data } = await makeLibrary(t)
  const api = createReaderApi({ ctx: fakeContext(), dataDir: data })
  const state = await api.configureLibrary({ path: library })
  const bookId = state.books[0].id
  const opened = await api.open({ bookId })
  assert.equal(opened.supported, true)
  assert.equal(opened.toc.length, 2)

  const result = await api.search({ bookId, query: '再见' })
  assert.equal(result.matches.length, 1)
  assert.equal(result.booksScanned, 1)
  assert.equal(result.booksTotal, 1)
  assert.equal(result.truncated, false)
  assert.match(result.matches[0].locator, /:c002:/)
  assert.match(result.matches[0].jumpUrl, /dsh-readpilot\.invalid\/jump\?book=/)
  assert.equal(result.matches[0].chapterTitle, '第二章 继续')
})

test('rename_preserves_book_id_and_notes', async t => {
  const { library, data } = await makeLibrary(t)
  const api = createReaderApi({ ctx: fakeContext(), dataDir: data })
  const state = await api.configureLibrary({ path: library })
  const bookId = state.books[0].id
  await api.handleRpc('notes', {
    action: 'add',
    bookId,
    chapterId: 'c001',
    blockIndex: 0,
    offset: 0,
    quote: '测试引用',
    note: '改名后仍在',
  })

  await rename(join(library, 'demo.txt'), join(library, 'renamed.txt'))
  const after = await api.rescan()
  assert.equal(after.books.length, 1)
  assert.equal(after.books[0].id, bookId)
  assert.equal(after.books[0].path, join(library, 'renamed.txt'))
  const notes = await api.handleRpc('notes', { action: 'list', bookId })
  assert.equal(notes.value.notes.length, 1)
})

test('duplicate_with_user_data_cannot_delete', async t => {
  const { library, data } = await makeLibrary(t)
  const api = createReaderApi({ ctx: fakeContext(), dataDir: data })
  await api.configureLibrary({ path: library })
  await copyFile(join(library, 'demo.txt'), join(library, 'demo-copy.txt'))
  const duplicated = await api.rescan()
  const duplicate = duplicated.books.find(book => book.duplicateOf)!
  await api.handleRpc('notes', {
    action: 'add',
    bookId: duplicate.id,
    chapterId: 'c001',
    blockIndex: 0,
    offset: 0,
    quote: '副本引用',
    note: '副本笔记',
  })
  await assert.rejects(
    () => api.deleteDuplicate({ bookId: duplicate.id }),
    /不能直接删除/,
  )
})

test('duplicate_copy_can_be_deleted', async t => {
  const { library, data } = await makeLibrary(t)
  const api = createReaderApi({ ctx: fakeContext(), dataDir: data })
  const state = await api.configureLibrary({ path: library })
  const canonicalId = state.books[0].id
  await copyFile(join(library, 'demo.txt'), join(library, 'demo-copy.txt'))

  const duplicated = await api.rescan()
  assert.equal(duplicated.books.length, 2)
  const duplicate = duplicated.books.find(book => book.duplicateOf)!
  assert.equal(duplicate.duplicateOf, canonicalId)

  const deleted = await api.deleteDuplicate({ bookId: duplicate.id })
  assert.deepEqual(deleted.books.map(book => book.id), [canonicalId])
  await assert.rejects(() => stat(join(library, 'demo-copy.txt')))
})

test('delete_primary_promotes_copy_and_keeps_notes', async t => {
  const { library, data } = await makeLibrary(t)
  const api = createReaderApi({ ctx: fakeContext(), dataDir: data })
  const state = await api.configureLibrary({ path: library })
  const canonicalId = state.books[0].id
  await api.handleRpc('notes', {
    action: 'add',
    bookId: canonicalId,
    chapterId: 'c001',
    blockIndex: 0,
    offset: 0,
    quote: '主记录引用',
    note: '主记录笔记',
  })
  await copyFile(join(library, 'demo.txt'), join(library, 'demo-copy.txt'))
  await api.rescan()

  const after = await api.deleteDuplicate({ bookId: canonicalId })
  assert.equal(after.books.length, 1)
  assert.equal(after.books[0].id, canonicalId)
  assert.equal(after.books[0].path, join(library, 'demo-copy.txt'))
  const notes = await api.handleRpc('notes', { action: 'list', bookId: canonicalId })
  assert.equal(notes.value.notes.length, 1)
})

test('library_search_reports_scan_scope', async t => {
  const root = await mkdtemp(join(tmpdir(), 'dsh-readpilot-api-'))
  const library = join(root, 'books')
  const data = join(root, 'data')
  await mkdir(library, { recursive: true })
  t.after(() => rm(root, { recursive: true, force: true }))
  for (let index = 1; index <= 21; index += 1) {
    await writeFile(
      join(library, `book-${String(index).padStart(2, '0')}.txt`),
      `第一章 开始\n\n唯一关键词 ${index}`,
      'utf8',
    )
  }
  const api = createReaderApi({ ctx: fakeContext(), dataDir: data })
  await api.configureLibrary({ path: library })

  const result = await api.search({ query: '唯一关键词', limit: 50 })
  assert.equal(result.booksTotal, 21)
  assert.equal(result.booksScanned, 20)
  assert.equal(result.matches.length, 20)
  assert.equal(result.truncated, true)
  assert.equal(result.unreadable, false)
})

test('library_search_stops_at_parse_budget', async t => {
  const root = await mkdtemp(join(tmpdir(), 'dsh-readpilot-api-'))
  const library = join(root, 'books')
  const data = join(root, 'data')
  await mkdir(library, { recursive: true })
  t.after(() => rm(root, { recursive: true, force: true }))
  const large = join(library, 'large.txt')
  await writeFile(large, 'large', 'utf8')
  await truncate(large, 129 * 1024 * 1024)
  await utimes(large, new Date(0), new Date(0))
  await writeFile(join(library, 'recent.txt'), '第一章 开始\n\n唯一关键词 预算', 'utf8')
  const api = createReaderApi({ ctx: fakeContext(), dataDir: data })
  await api.configureLibrary({ path: library })

  const result = await api.search({ query: '唯一关键词', limit: 50 })
  assert.equal(result.booksTotal, 2)
  assert.equal(result.booksScanned, 1)
  assert.equal(result.matches.length, 1)
  assert.equal(result.truncated, true)
  assert.equal(result.unreadable, false)
})

test('rpc_envelope_dispatches', async t => {
  const { library, data } = await makeLibrary(t)
  const api = createReaderApi({ ctx: fakeContext(), dataDir: data })
  const configured = await api.handleRpc('configure', { path: library })
  assert.equal(configured.ok, true)
  assert.equal(configured.value.books.length, 1)

  const state = await api.handleRpc('state', null)
  assert.equal(state.ok, true)
  assert.equal(state.value.settings.libraryDir, library)

  const unknown = await api.handleRpc('missing', null)
  assert.equal(unknown.ok, false)
  assert.equal(unknown.error?.code, 'unknown-endpoint')
})

test('companion_policy_sets_read_only_once', async t => {
  const { data } = await makeLibrary(t)
  const appended: Array<{ type: string; value: any }> = []
  let current: string | undefined
  const session = {
    append(type: string, value: any) {
      appended.push({ type, value })
      current = value.mode
    },
  }
  const ctx = {
    get(name: string) {
      if (name === 'sessions') return { get: (id: string) => id === 's1' ? session : undefined }
      if (name === 'sandboxPolicy') return { overrideOf: () => current }
      return undefined
    },
  }
  const api = createReaderApi({ ctx, dataDir: data })

  const first = await api.setCompanionPolicy({ sessionId: 's1' })
  assert.equal(first.applied, true)
  assert.deepEqual(appended, [{ type: 'sandbox/mode', value: { mode: 'read-only' } }])

  const second = await api.setCompanionPolicy({ sessionId: 's1' })
  assert.equal(second.applied, false)
  assert.equal(appended.length, 1)

  const missing = await api.setCompanionPolicy({ sessionId: 's2' })
  assert.equal(missing.mode, null)
})

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
test('library_scan_is_cached_until_rescan', async t => {
  const { library, data } = await makeLibrary(t)
  const api = createReaderApi({ ctx: fakeContext(), dataDir: data })
  const configured = await api.configureLibrary({ path: library })
  assert.equal(configured.books.length, 1)

  await writeFile(join(library, 'added.txt'), '第一章 新书\n\n新增内容', 'utf8')
  const cached = await api.state()
  assert.equal(cached.books.length, 1)

  const forced = await api.handleRpc('rescan', {})
  assert.equal(forced.ok, true)
  assert.equal((forced as any).value.books.length, 2)
})
test('library_scan_watch_invalidates_cache', async t => {
  const { library, data } = await makeLibrary(t)
  const callbacks: Array<() => void> = []
  let closed = false
  const fs = {
    async resolve(path: string) {
      return { targetKey: path, displayPath: path }
    },
    async watch(_target: any, changed: () => void) {
      callbacks.push(changed)
      return async () => { closed = true }
    },
  }
  const api = createReaderApi({ ctx: fakeContext({ fs }), dataDir: data })
  const configured = await api.configureLibrary({ path: library })
  assert.equal(configured.books.length, 1)
  assert.equal(callbacks.length, 1)

  await writeFile(join(library, 'watched.txt'), '第一章 新书\n\n内容', 'utf8')
  assert.equal((await api.state()).books.length, 1)
  callbacks[0]()
  assert.equal((await api.state()).books.length, 2)

  await api.dispose()
  assert.equal(closed, true)
})

test('archived_session_is_reported_and_filtered_from_state', async t => {
  const { library, data } = await makeLibrary(t)
  const ctx = fakeContext()
  const api = createReaderApi({ ctx, dataDir: data })
  const state = await api.configureLibrary({ path: library })
  const bookId = state.books[0].id
  await api.setCompanionSession({ bookId, sessionId: 's1' })
  assert.equal((await api.sessionAlive({ sessionId: 's1' })).alive, true)
  ctx.archivedSessionIds.push('s1')
  assert.equal((await api.sessionAlive({ sessionId: 's1' })).alive, false)
  const refreshed = await api.state()
  assert.equal(refreshed.sessions[bookId], undefined)
})
test('book_assets_serve_library_images_and_rewrite_chapter_urls', async t => {
  const { library, data } = await makeLibrary(t)
  const api = createReaderApi({ ctx: fakeContext(), dataDir: data })
  const state = await api.configureLibrary({ path: library })
  const bookId = state.books[0].id
  await writeFile(join(library, 'cover.png'), Buffer.from('png-bytes'), 'utf8')

  const asset = await api.bookAsset({ bookId, path: 'cover.png' })
  assert.equal(asset.contentType, 'image/png')
  assert.equal(asset.bytes.toString('utf8'), 'png-bytes')
  await assert.rejects(
    () => api.bookAsset({ bookId, path: '../outside.png' }),
    /越界|invalid-path/,
  )

  await writeFile(join(library, 'pic.md'), '![图](cover.png)\n\n正文。', 'utf8')
  const refreshed = await api.handleRpc('rescan', {})
  assert.equal(refreshed.ok, true)
  const markdown = (refreshed as any).value.books.find((book: any) => book.title === 'pic')
  assert.ok(markdown)
  const opened = await api.open({ bookId: markdown.id })
  const content = await api.chapter({ bookId: markdown.id, chapterId: opened.toc[0].id })
  assert.equal(content.blocks[0].type, 'image')
  assert.match(content.blocks[0].src!, /^\/api\/dsh-readpilot\/book-asset\?bookId=/)
})
test('session_book_reverses_companion_mapping', async t => {
  const { library, data } = await makeLibrary(t)
  const api = createReaderApi({ ctx: fakeContext(), dataDir: data })
  const state = await api.configureLibrary({ path: library })
  const bookId = state.books[0].id
  await api.setCompanionSession({ bookId, sessionId: 'sess-reader' })
  const found = await api.sessionBook({ sessionId: 'sess-reader' })
  assert.equal(found?.bookId, bookId)
  assert.equal(found?.format, 'txt')
  assert.equal(await api.sessionBook({ sessionId: 'sess-missing' }), null)
})
test('tool_context_prefers_session_reading_over_latest_progress', async t => {
  const { library, data } = await makeLibrary(t)
  await writeFile(join(library, 'other.txt'), `第一章 另一本\n\n另一本的正文。`, 'utf8')
  const api = createReaderApi({ ctx: fakeContext(), dataDir: data })
  const state = await api.configureLibrary({ path: library })
  const first = state.books.find(book => book.title === 'demo')
  const other = state.books.find(book => book.title === 'other')
  assert.ok(first)
  assert.ok(other)
  await api.saveReadingProgress({ bookId: other!.id, chapterId: 'c001', percent: 50 })
  await api.setCompanionContext({ sessionId: 'session-tool-context', bookId: first!.id, title: first!.title, chapter: '第一章 开始' })
  const context = await api.toolContext({ sessionId: 'session-tool-context' })
  assert.equal(context.bookId, first!.id)
})
test('tool_context_hydrates_session_mapping_without_opening_reader', async t => {
  const { library, data } = await makeLibrary(t)
  const api = createReaderApi({ ctx: fakeContext(), dataDir: data })
  const state = await api.configureLibrary({ path: library })
  const bookId = state.books[0].id
  await api.setCompanionSession({ bookId, sessionId: 'session-without-ui' })
  await api.saveReadingProgress({ bookId, chapterId: 'c002', chapterTitle: '第二章', chapterFraction: 0.2, percent: 50 })
  const context = await api.toolContext({ sessionId: 'session-without-ui' })
  assert.equal(context.bookId, bookId)
  assert.match(api.companionContextOf('session-without-ui'), /书名：demo|书名：/)
})
test('reading_view_is_normalized_and_available_from_tool_context', async t => {
  const { library, data } = await makeLibrary(t)
  const api = createReaderApi({ ctx: fakeContext(), dataDir: data })
  const state = await api.configureLibrary({ path: library })
  const bookId = state.books[0].id
  const selection = '选'.repeat(5000)
  await api.setCompanionContext({
    sessionId: 'session-view',
    bookId,
    title: 'demo',
    chapter: '第一章 开始',
    view: {
      mode: 'paged',
      pageStart: 2,
      pageEnd: 3,
      pageTotal: 8,
      chapterIndex: 0,
      chapterTotal: 2,
      selection,
      selectionBlockIndex: 4,
      selectionOffset: 12,
    },
  })
  const context = await api.toolContext({ sessionId: 'session-view' })
  assert.equal(context.view.pageStart, 2)
  assert.equal(context.view.pageEnd, 3)
  assert.equal(context.view.pageTotal, 8)
  assert.equal(context.view.selection.length, 4000)
  assert.equal(context.view.selectionBlockIndex, 4)
  assert.equal(normalizeReadingView({ pageStart: 0, pageEnd: 'x' }), undefined)
})

test('open_scanned_pdf_returns_visual_only', async t => {
  const root = await mkdtemp(join(tmpdir(), 'dsh-readpilot-api-'))
  const library = join(root, 'books')
  const data = join(root, 'data')
  await mkdir(library, { recursive: true })
  await writeFile(join(library, 'scan.pdf'), buildBlankPdf())
  t.after(() => rm(root, { recursive: true, force: true }))
  const api = createReaderApi({ ctx: fakeContext(), dataDir: data })
  const state = await api.configureLibrary({ path: library })
  const opened = await api.open({ bookId: state.books[0].id })
  assert.equal(opened.supported, true)
  assert.equal(opened.scanOnly, true)
  assert.equal(opened.pageCount, 1)
  assert.equal(opened.toc[0].id, 'scan')
})

test('search_all_returns_all_matches', async t => {
  const root = await mkdtemp(join(tmpdir(), 'dsh-readpilot-api-'))
  const library = join(root, 'books')
  const data = join(root, 'data')
  await mkdir(library, { recursive: true })
  const text = `第一章 开始\n\n${'目标词 '.repeat(60)}`
  await writeFile(join(library, 'many.txt'), text, 'utf8')
  t.after(() => rm(root, { recursive: true, force: true }))
  const api = createReaderApi({ ctx: fakeContext(), dataDir: data })
  const state = await api.configureLibrary({ path: library })
  const bookId = state.books[0].id
  const partial = await api.search({ bookId, query: '目标词', limit: 20 })
  assert.equal(partial.matches.length, 20)
  assert.equal(partial.truncated, true)
  const all = await api.search({ bookId, query: '目标词', limit: 0 })
  assert.equal(all.matches.length, 60)
  assert.equal(all.truncated, false)
})
