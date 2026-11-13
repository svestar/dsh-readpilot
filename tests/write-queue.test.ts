import test from 'node:test'
import assert from 'node:assert/strict'
import { enqueueWrite } from '../src/storage/write-queue.ts'

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

test('writes_with_same_key_are_serialized', async () => {
  const events: string[] = []
  const first = enqueueWrite('key', async () => {
    events.push('first:start')
    await sleep(20)
    events.push('first:end')
  })
  const second = enqueueWrite('key', async () => {
    events.push('second:start')
    await sleep(1)
    events.push('second:end')
  })
  await Promise.all([first, second])
  assert.deepEqual(events, ['first:start', 'first:end', 'second:start', 'second:end'])
})

test('writes_with_different_keys_run_concurrently', async () => {
  const events: string[] = []
  const slow = enqueueWrite('a', async () => {
    events.push('a:start')
    await sleep(20)
    events.push('a:end')
  })
  const fast = enqueueWrite('b', async () => {
    events.push('b:start')
    await sleep(1)
    events.push('b:end')
  })
  await Promise.all([slow, fast])
  assert.deepEqual(events, ['a:start', 'b:start', 'b:end', 'a:end'])
})

test('failed_write_does_not_block_next_one', async () => {
  await assert.rejects(() => enqueueWrite('k', async () => { throw new Error('boom') }), /boom/)
  assert.equal(await enqueueWrite('k', async () => 'ok'), 'ok')
})
