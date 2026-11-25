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
