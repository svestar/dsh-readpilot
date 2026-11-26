import test from 'node:test'
import assert from 'node:assert/strict'
import { createReaderApi } from '../src/host/app.ts'
import { fakeContext, makeLibrary } from './support/api-helpers.ts'

test('memory_role_rpc_roundtrip', async t => {
  const { library, data } = await makeLibrary(t)
  const api = createReaderApi({ ctx: fakeContext(), dataDir: data })
  const state = await api.configureLibrary({ path: library })
  const bookId = state.books[0].id
  await api.setCompanionContext({ sessionId: 's1', bookId, title: 'demo', chapter: 'c001' })
  await api.memory({ action: 'setMode', bookId, mode: 'on' })

  const written = await api.memory({ action: 'write', bookId, scope: 'role', text: '严谨的文学导师' })
  assert.equal(written.roleText, '严谨的文学导师')
  assert.equal(written.roleHistory.length, 0)

  const updated = await api.memory({ action: 'write', bookId, scope: 'role', text: '温和的文学导师' })
  assert.equal(updated.roleText, '温和的文学导师')
  assert.equal(updated.roleHistory.length, 1)
  assert.equal(updated.roleHistory[0].text, '严谨的文学导师')

  const read = await api.memoryTool({ book: bookId, action: 'read' })
  assert.equal(read.roleCard, '温和的文学导师')
  const saved = await api.memoryTool({ book: bookId, action: 'update', scope: 'role', text: '关注叙事结构', mode: 'append' })
  assert.equal(saved.saved, true)
  assert.match(api.memoryContextFor('s1'), /温和的文学导师\n\n关注叙事结构/)
})

test('memory_role_follows_global_mode_not_book', async t => {
  const { library, data } = await makeLibrary(t)
  const api = createReaderApi({ ctx: fakeContext(), dataDir: data })
  const state = await api.configureLibrary({ path: library })
  const bookId = state.books[0].id
  await api.setCompanionContext({ sessionId: 's1', bookId, title: 'demo', chapter: 'c001' })
  await api.memory({ action: 'setMode', bookId, mode: 'on' })
  await api.memory({ action: 'write', bookId, scope: 'role', text: '严谨的文学导师' })
  await api.memory({ action: 'write', bookId, scope: 'book', text: '本书事实' })
  assert.match(api.memoryContextFor('s1'), /严谨的文学导师/)
  assert.match(api.memoryContextFor('s1'), /本书事实/)

  await api.memory({ action: 'setBook', bookId, state: 'off' })
  const context = api.memoryContextFor('s1')
  assert.match(context, /严谨的文学导师/)
  assert.doesNotMatch(context, /本书事实/)
  await assert.rejects(
    () => api.memory({ action: 'write', bookId, scope: 'book', text: '另一条事实' }),
    (error: any) => error?.code === 'memory-off',
  )
})

test('memory_history_restore_requires_active_scope', async t => {
  const { library, data } = await makeLibrary(t)
  const api = createReaderApi({ ctx: fakeContext(), dataDir: data })
  const state = await api.configureLibrary({ path: library })
  const bookId = state.books[0].id
  await api.memory({ action: 'setMode', bookId, mode: 'on' })
  await api.memory({ action: 'write', bookId, scope: 'role', text: '第一版' })
  await api.memory({ action: 'write', bookId, scope: 'role', text: '第二版' })
  const status = await api.memory({ action: 'status', bookId })
  const id = status.roleHistory[0].id

  await api.memory({ action: 'setMode', bookId, mode: 'off' })
  await assert.rejects(
    () => api.memory({ action: 'historyRestore', bookId, scope: 'role', id }),
    (error: any) => error?.code === 'memory-off',
  )
  const removed = await api.memory({ action: 'historyRemove', bookId, scope: 'role', id })
  assert.equal(removed.roleHistory.length, 0)
})

test('memory_role_writes_require_global_mode', async t => {
  const { library, data } = await makeLibrary(t)
  const api = createReaderApi({ ctx: fakeContext(), dataDir: data })
  const state = await api.configureLibrary({ path: library })
  const bookId = state.books[0].id
  await api.memory({ action: 'setMode', bookId, mode: 'off' })

  for (const scope of ['role', 'reader']) {
    await assert.rejects(
      () => api.memory({ action: 'write', bookId, scope, text: '偏好' }),
      (error: any) => error?.code === 'memory-off',
      scope,
    )
    await assert.rejects(
      () => api.memoryTool({ book: bookId, action: 'update', scope, text: '偏好' }),
      (error: any) => error?.code === 'memory-off',
      scope,
    )
  }
})
