import test from 'node:test'
import assert from 'node:assert/strict'
import { writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { createReaderApi } from '../src/host/app.ts'
import { fakeContext, makeLibrary } from './support/api-helpers.ts'

function sessionRecord(id: string, cwd: string, createdAt: number, extra: any = {}) {
  return { header: { id, cwd, createdAt, ...extra }, live: false, persisted: true }
}

function titled(id: string, title: string, updatedAt: number) {
  return {
    sessionId: id,
    status: 'fulfilled' as const,
    value: { session: { id }, title: { title, updatedAt, eventSeq: 1, messageSeqs: [], source: { kind: 'fallback' } } },
  }
}

test('companion_sessions_lists_workspace_sessions', async t => {
  const { library, data } = await makeLibrary(t)
  await writeFile(join(library, 'second.txt'), '第一章 第二本\n\n第二本书。', 'utf8')
  const ctx = fakeContext({
    sessionQuery: {
      async listSessions() {
        return [
          sessionRecord('s1', library, 100),
          sessionRecord('s2', library, 200),
          sessionRecord('s3', library, 300),
          sessionRecord('s4', library, 400, { origin: 'subagent' }),
          sessionRecord('s5', library, 500),
        ]
      },
      async readTitleSnapshots(ids: string[]) {
        return ids.map(id => id === 's5' ? {
          sessionId: id,
          status: 'fulfilled' as const,
          value: { session: { id } },
        } : titled(id, `对话 ${id}`, id === 's1' ? 110 : id === 's2' ? 210 : 310))
      },
    },
  })
  const api = createReaderApi({ ctx, dataDir: data })
  const state = await api.configureLibrary({ path: library })
  assert.equal(state.books.length, 2)
  const [first, second] = state.books
  ctx.workspaces[0].sessionIds.push('s1', 's2', 's3', 's4', 's5')
  ctx.archivedSessionIds.push('s3')

  await api.setCompanionSession({ bookId: first.id, sessionId: 's1' })
  await api.setCompanionSession({ bookId: second.id, sessionId: 's2' })

  const value = await api.companionSessions({ bookId: first.id })
  const rpc = await api.handleRpc('companionSessions', { bookId: first.id })
  assert.equal(rpc.ok, true)
  assert.equal(rpc.value.currentSessionId, 's1')
  assert.equal(value.currentSessionId, 's1')
  assert.deepEqual(value.sessions.map((session: any) => session.sessionId), ['s2', 's1'])
  assert.deepEqual(value.sessions[0], {
    sessionId: 's2',
    title: '对话 s2',
    updatedAt: 210,
    boundBookId: second.id,
    boundBookTitle: second.title,
  })
  assert.equal(value.sessions[1].boundBookId, first.id)
  assert.equal(value.sessions[1].title, '对话 s1')
})

test('companion_session_bind_moves_previous_book', async t => {
  const { library, data } = await makeLibrary(t)
  await writeFile(join(library, 'second.txt'), '第一章 第二本\n\n第二本书。', 'utf8')
  const api = createReaderApi({ ctx: fakeContext(), dataDir: data })
  const state = await api.configureLibrary({ path: library })
  const [first, second] = state.books

  const firstBind = await api.setCompanionSession({ bookId: first.id, sessionId: 'shared' })
  assert.deepEqual(firstBind.unboundBookIds, [])
  const secondBind = await api.setCompanionSession({ bookId: second.id, sessionId: 'shared' })
  assert.deepEqual(secondBind.unboundBookIds, [first.id])

  const after = await api.state()
  assert.equal(after.sessions[first.id], undefined)
  assert.equal(after.sessions[second.id]?.sessionId, 'shared')
})
