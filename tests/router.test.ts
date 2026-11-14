import test from 'node:test'
import assert from 'node:assert/strict'
import { createRouter } from '../src/host/router.ts'
import type { HostModule } from '../src/host/types.ts'

function moduleOf(id: string, endpoint: string): HostModule {
  return {
    id,
    handlers: { [endpoint]: async payload => ({ id, payload }) },
    tools: [],
  }
}

test('router_dispatches_by_endpoint_and_rejects_unknown', async () => {
  const router = createRouter([moduleOf('ping', 'ping')])
  assert.deepEqual(await router.handle('ping', { n: 1 }), { id: 'ping', payload: { n: 1 } })
  await assert.rejects(() => router.handle('missing', {}), /未知接口/)
  await assert.rejects(() => router.handle(null, {}), /must be a string/)
})

test('router_rejects_duplicate_endpoints', () => {
  assert.throws(
    () => createRouter([moduleOf('a', 'same'), moduleOf('b', 'same')]),
    /Duplicate RPC endpoint/,
  )
})
