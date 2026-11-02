import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createReaderApi } from '../src/api.js'
import { registerTools } from '../src/tools.js'

function fakeContext(tools) {
  const workspaces = []
  return {
    tools,
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

test('tools_read_bounded', async t => {
  const root = await mkdtemp(join(tmpdir(), 'dsh-reader-tools-'))
  const library = join(root, 'books')
  const data = join(root, 'data')
  await mkdir(library, { recursive: true })
  await writeFile(join(library, 'long.txt'), `第一章 开始\n\n${'测试文字。'.repeat(400)}`, 'utf8')
  t.after(() => rm(root, { recursive: true, force: true }))

  const registered = new Map()
  const tools = {
    register(definition) {
      registered.set(definition.name, definition)
      return () => registered.delete(definition.name)
    },
  }
  const ctx = fakeContext(tools)
  const api = createReaderApi({ ctx, dataDir: data })
  const state = await api.configureLibrary({ path: library })
  const dispose = registerTools(ctx, api)

  assert.deepEqual([...registered.keys()].sort(), ['reader_books', 'reader_open', 'reader_read', 'reader_search'])
  const read = registered.get('reader_read')
  const value = await read.execute({ book: state.books[0].title, chapter: 'c001', limit: 300 })
  assert.equal(value.text.length, 300)
  assert.equal(value.hasMore, true)
  assert.match(value.locator, /:c001:0$/)

  const books = await registered.get('reader_books').execute({})
  assert.equal(books.books.length, 1)
  dispose()
  assert.equal(registered.size, 0)
})
