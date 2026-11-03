import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createMemoryProposalStore } from '../src/memory-proposals.ts'

async function makeStore(t: any) {
  const root = await mkdtemp(join(tmpdir(), 'dsh-reader-memory-proposals-'))
  t.after(() => rm(root, { recursive: true, force: true }))
  return createMemoryProposalStore(join(root, 'data'))
}

const bookId = 'abcdef1234567890'

test('memory_proposal_create_list_take_reject', async t => {
  const store = await makeStore(t)
  const first = await store.create(bookId, {
    scope: 'book',
    mode: 'append',
    text: '读者偏好简洁回答',
    preview: '读者偏好简洁回答',
  })
  assert.equal((await store.list(bookId)).length, 1)

  const taken = await store.take(bookId, first.id)
  assert.equal(taken.text, '读者偏好简洁回答')
  assert.equal((await store.list(bookId)).length, 0)

  const second = await store.create(bookId, {
    scope: 'reader',
    mode: 'replace',
    text: '读者是工程师',
    preview: '读者是工程师',
  })
  assert.equal(await store.reject(bookId, second.id), true)
  assert.equal((await store.list(bookId)).length, 0)
})

test('memory_proposal_validates_scope_and_path', async t => {
  const store = await makeStore(t)
  await assert.rejects(
    () => store.create('../evil', { scope: 'book', mode: 'append', text: 'x', preview: 'x' }),
    (error: any) => error?.code === 'invalid-book',
  )
  await assert.rejects(
    () => store.create(bookId, { scope: 'other', mode: 'append', text: 'x', preview: 'x' }),
    (error: any) => error?.code === 'invalid-proposal',
  )
  await assert.rejects(
    () => store.take(bookId, '../evil'),
    (error: any) => error?.code === 'invalid-proposal',
  )
})
