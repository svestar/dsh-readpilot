import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createReaderApi } from '../src/api.ts'

function fakeContext() {
  const workspaces: any[] = []
  return {
    workspaces,
    get(name: string) {
      if (name !== 'workspaceRegistry') return undefined
      return {
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
  const root = await mkdtemp(join(tmpdir(), 'dsh-reader-api-'))
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
  await api.saveReadingProgress({ bookId, chapterId: 'c002', chapterTitle: '第二章', percent: 42.5 })
  const progress = (await api.state()).progress[bookId]
  assert.equal(progress.chapterId, 'c002')
  assert.equal(progress.percent, 42.5)
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
  assert.match(promptFile, /dsh-reader:prompt:begin/)
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
  assert.match(result.matches[0].locator, /:c002:/)
  assert.equal(result.matches[0].chapterTitle, '第二章 继续')
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
