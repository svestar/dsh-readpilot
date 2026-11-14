import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { PluginError, errorCode } from '../src/host/lib/errors.ts'
import { readJson, writeJson } from '../src/host/lib/fs-json.ts'
import { limitText } from '../src/host/lib/limit.ts'
import { enqueueWrite, waitForWrites } from '../src/host/lib/write-queue.ts'

test('lib_limit_text_trims_and_caps', () => {
  assert.equal(limitText('  hello  ', 10), 'hello')
  assert.equal(limitText('abcdef', 3), 'abc')
  assert.equal(limitText(null, 3), '')
  assert.equal(limitText('x', -1), '')
})

test('lib_fs_json_round_trips_and_falls_back', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'dsh-plugin-test-'))
  try {
    const path = join(dir, 'nested', 'state.json')
    assert.deepEqual(await readJson(path, { fallback: true }), { fallback: true })

    await writeJson(path, { count: 2 })
    assert.deepEqual(await readJson(path, {}), { count: 2 })

    writeFileSync(path, '{not json')
    assert.deepEqual(await readJson(path, { fallback: true }), { fallback: true })
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

test('lib_write_queue_serializes_and_survives_failure', async () => {
  const order: string[] = []
  const first = enqueueWrite('lib-test', async () => {
    await new Promise(resolve => setTimeout(resolve, 10))
    order.push('first')
  })
  const failing = enqueueWrite('lib-test', async () => {
    order.push('failing')
    throw new Error('boom')
  })
  const failingCheck = assert.rejects(failing, /boom/)
  const last = enqueueWrite('lib-test', async () => {
    order.push('last')
  })

  await first
  await failingCheck
  await last
  await waitForWrites()
  assert.deepEqual(order, ['first', 'failing', 'last'])
})

test('lib_plugin_error_keeps_its_code', () => {
  assert.equal(errorCode(new PluginError('unknown-endpoint', 'x'), 'fallback'), 'unknown-endpoint')
  assert.equal(errorCode(new Error('x'), 'fallback'), 'fallback')
  assert.equal(errorCode({ code: '' }, 'fallback'), 'fallback')
})
