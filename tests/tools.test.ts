import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createReaderApi } from '../src/api.ts'
import { registerTools } from '../src/tools.ts'

function fakeContext(tools: any) {
  const workspaces: any[] = []
  return {
    tools,
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

test('tools_read_bounded', async t => {
  const root = await mkdtemp(join(tmpdir(), 'dsh-reader-tools-'))
  const library = join(root, 'books')
  const data = join(root, 'data')
  await mkdir(library, { recursive: true })
  await writeFile(join(library, 'long.txt'), `第一章 开始\n\n${'测试文字。'.repeat(400)}`, 'utf8')
  t.after(() => rm(root, { recursive: true, force: true }))

  const registered = new Map<string, any>()
  const tools = {
    register(definition: any) {
      registered.set(definition.name, definition)
      return () => registered.delete(definition.name)
    },
  }
  const ctx = fakeContext(tools)
  const api = createReaderApi({ ctx, dataDir: data })
  const state = await api.configureLibrary({ path: library })
  const dispose = registerTools(ctx, api)

  assert.deepEqual([...registered.keys()].sort(), ['reader_books', 'reader_context', 'reader_note', 'reader_open', 'reader_read', 'reader_search'])
  const context = await registered.get('reader_context')!.execute({ book: state.books[0].title })
  assert.equal(context.title, 'long')
  assert.equal(context.format, 'txt')
  assert.ok(Array.isArray(context.toc))
  const read = registered.get('reader_read')!
  const value = await read.execute({ book: state.books[0].title, chapter: 'c001', limit: 300 })
  assert.equal(value.text.length, 300)
  assert.equal(value.hasMore, true)
  assert.match(value.locator, /:c001:0$/)

  const noteTool = registered.get('reader_note')!
  const added = await noteTool.execute({
    action: 'add',
    book: state.books[0].title,
    chapter: 'c001',
    quote: '测试文字',
    note: '我的想法',
  })
  assert.match(added.note.id, /^note-/)
  const listed = await noteTool.execute({ action: 'list', book: state.books[0].title })
  assert.equal(listed.notes.length, 1)
  assert.equal(listed.notes[0].note, '我的想法')

  const books = await registered.get('reader_books')!.execute({})
  assert.equal(books.books.length, 1)
  dispose()
  assert.equal(registered.size, 0)
})
