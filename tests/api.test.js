import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createReaderApi } from '../src/api.js'

function fakeContext() {
  const workspaces = []
  return {
    workspaces,
    get(name) {
      if (name !== 'workspaceRegistry') return undefined
      return {
        async resolveByPath(path) {
          return workspaces.find(workspace => workspace.path === path)
        },
        async create(path, title) {
          const workspace = { id: `ws-${workspaces.length + 1}`, path, title }
          workspaces.push(workspace)
          return workspace
        },
      }
    },
  }
}

async function makeLibrary(t) {
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

test('configure_creates_workspace', async t => {
  const { library, data } = await makeLibrary(t)
  const ctx = fakeContext()
  const api = createReaderApi({ ctx, dataDir: data })

  const first = await api.configureLibrary({ path: library })
  assert.ok(first.settings.workspaceId)
  assert.equal(ctx.workspaces.length, 1)
  assert.equal(first.books.length, 1)

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
  assert.equal(unknown.error.code, 'unknown-endpoint')
})
