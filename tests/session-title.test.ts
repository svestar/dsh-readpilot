import test from 'node:test'
import assert from 'node:assert/strict'
import { companionSessionTitle, syncCompanionSessionTitles } from '../src/client/modules/companion/session-title.ts'

test('companion_session_title_is_stable_and_identifies_book', () => {
  assert.equal(companionSessionTitle('三体'), '《三体》· 伴读')
  assert.equal(companionSessionTitle('  三体  '), '《三体》· 伴读')
  assert.equal(companionSessionTitle(''), '《未命名书籍》· 伴读')
  assert.equal(companionSessionTitle(null), '《未命名书籍》· 伴读')
})
test('sync_companion_session_titles_renames_linked_sessions', async () => {
  const titles = new Map<string, string>()
  const runtime = {
    sessions: {
      using: async (sessionId: string, _options: any, run: any) => run({
        binding: {
          session: {
            rename: async (title: string) => {
              titles.set(sessionId, title)
              return { ok: true }
            },
          },
        },
      }),
    },
  }
  await syncCompanionSessionTitles(runtime, [
    { id: 'b1', title: '三体' },
    { id: 'b2', title: '黑暗森林' },
  ], {
    b1: { sessionId: 's1' },
    b2: { sessionId: 's2' },
    b3: { sessionId: 's3' },
  })
  assert.equal(titles.get('s1'), '《三体》· 伴读')
  assert.equal(titles.get('s2'), '《黑暗森林》· 伴读')
  assert.equal(titles.has('s3'), false)
})
