import test from 'node:test'
import assert from 'node:assert/strict'
import { messageOf } from '../src/client/lib/helpers.ts'
import { createRpc } from '../src/client/lib/rpc.ts'
import { enErrors, zhErrors } from '../src/client/locale/errors.ts'

/**
 * The browser caller is plain `fetch` plus the envelope, so stubbing `fetch` is
 * enough: no DOM, no React, no running DSH.
 */
test('client_rpc_unwraps_the_envelope_and_keeps_error_codes', async () => {
  const original = globalThis.fetch
  const requests: Array<{ url: string; body: any }> = []
  globalThis.fetch = (async (url: any, init: any) => {
    const body = JSON.parse(String(init?.body))
    requests.push({ url: String(url), body })
    if (body.endpoint === 'bad') {
      return new Response(JSON.stringify({ ok: false, error: { code: 'unknown-endpoint', message: '没有这个接口' } }), { status: 400 })
    }
    return new Response(JSON.stringify({ ok: true, value: { count: 3 } }), { status: 200 })
  }) as typeof fetch

  try {
    const call = createRpc('/api/dsh-readpilot')
    assert.deepEqual(await call('state'), { count: 3 })
    assert.equal(requests[0].url, '/api/dsh-readpilot')
    assert.deepEqual(requests[0].body, { endpoint: 'state', payload: null })

    await assert.rejects(call('bad'), (error: any) => {
      assert.equal(error.code, 'unknown-endpoint')
      assert.equal(error.message, '没有这个接口')
      return true
    })
  } finally {
    globalThis.fetch = original
  }
})

test('client_error_dictionaries_cover_the_same_codes', () => {
  assert.deepEqual(Object.keys(zhErrors).sort(), Object.keys(enErrors).sort())
  assert.ok(Object.keys(zhErrors).every(key => key.startsWith('error.')))
})

test('client_error_message_uses_the_current_ui_language', () => {
  const error = Object.assign(new Error('没有这个接口'), { code: 'unknown-endpoint' })
  const t = (key: string) => key === 'error.unknown-endpoint' ? 'Unknown endpoint' : key
  assert.equal(messageOf(error, t), 'Unknown endpoint')
  assert.equal(messageOf(new Error('plain'), t), 'plain')
  assert.equal(messageOf(error), '没有这个接口')
})
