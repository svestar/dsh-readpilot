import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createReaderApi } from '../src/api.ts'
import { losslessJson, registerTools } from '../src/tools.ts'

/** DSH only accepts tool results that survive a JSON round trip. */
function assertLossless(value: unknown) {
  assert.deepEqual(JSON.parse(JSON.stringify(value)), value)
}

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
  const root = await mkdtemp(join(tmpdir(), 'dsh-readpilot-tools-'))
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

  assert.deepEqual([...registered.keys()].sort(), ['reader_books', 'reader_context', 'reader_memory', 'reader_note', 'reader_notes', 'reader_open', 'reader_read', 'reader_search'])
  const notes = await registered.get('reader_notes')!.execute({ action: 'index', book: state.books[0].title })
  assert.deepEqual(notes.notes, [])
  const createdBook = await api.handleRpc('noteFiles', {
    action: 'create',
    bookId: state.books[0].id,
    kind: 'book',
    title: '整书',
    body: '开头',
  })
  assert.equal(createdBook.ok, true)
  const appended = await registered.get('reader_notes')!.execute({
    action: 'append',
    book: state.books[0].title,
    id: 'book',
    text: '后续',
  })
  assert.equal(appended.draft.noteId, 'book')
  assert.equal(appended.draft.action, 'append')
  assertLossless(appended)
  assert.equal('error' in appended, false)
  await api.setAutoApplyNotes({ enabled: true })
  const autoApplied = await registered.get('reader_notes')!.execute({
    action: 'append',
    book: state.books[0].title,
    id: 'book',
    text: '自动应用',
  })
  assert.equal(autoApplied.applied, true)
  assertLossless(autoApplied)
  await api.setAutoApplyNotes({ enabled: false })
  const memory = await registered.get('reader_memory')!.execute({ action: 'read', book: state.books[0].title })
  assert.equal(memory.effective, 'off')
  assert.equal(memory.bookCard, '')
  assertLossless(memory)
  const context = await registered.get('reader_context')!.execute({ book: state.books[0].title })
  assert.equal(context.title, 'long')
  assert.equal(context.format, 'txt')
  assert.ok(Array.isArray(context.toc))
  assert.match(context.toc[0].jumpUrl, /dsh-readpilot\.invalid\/jump\?book=/)
  assertLossless(context)
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
  assertLossless(added)
  const listed = await noteTool.execute({ action: 'list', book: state.books[0].title })
  assert.equal(listed.notes.length, 1)
  assert.equal(listed.notes[0].note, '我的想法')
  assertLossless(listed)

  const books = await registered.get('reader_books')!.execute({})
  assert.equal(books.books.length, 1)
  assertLossless(books)
  dispose()
  assert.equal(registered.size, 0)
})

test('tool_values_are_lossless_json', () => {
  assert.deepEqual(
    losslessJson({ kept: 1, dropped: undefined, nested: [1, undefined, Number.NaN], zero: -0 }),
    { kept: 1, nested: [1, null, null], zero: 0 },
  )
})
