import test from 'node:test'
import assert from 'node:assert/strict'
import { writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { createReaderApi, normalizeReadingView } from '../src/host/app.ts'
import { fakeContext, makeLibrary } from './support/api-helpers.ts'
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

