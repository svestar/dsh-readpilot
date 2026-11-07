import test from 'node:test'
import assert from 'node:assert/strict'
import { companionSessionTitle } from '../src/client/session-title.ts'

test('companion_session_title_is_stable_and_identifies_book', () => {
  assert.equal(companionSessionTitle('三体'), '《三体》· 伴读')
  assert.equal(companionSessionTitle('  三体  '), '《三体》· 伴读')
  assert.equal(companionSessionTitle(''), '《未命名书籍》· 伴读')
  assert.equal(companionSessionTitle(null), '《未命名书籍》· 伴读')
})
