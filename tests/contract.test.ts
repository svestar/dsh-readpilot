import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createApp } from '../src/host/app.ts'
import { OPERATIONS, READER_STATE_KEYS } from '../src/shared/contracts/index.ts'

/**
 * The two halves talk over plain JSON, so the shared interfaces are the only
 * contract — and interfaces vanish at compile time. These tests pin the parts a
 * type cannot: which endpoints exist, and which keys the wire actually carries.
 */
test('contract_declares_every_registered_endpoint', async () => {
  const dataDir = mkdtempSync(join(tmpdir(), 'dsh-readpilot-contract-'))
  const app = createApp({ dataDir })
  try {
    const registered = app.modules.flatMap(module => Object.keys(module.handlers))
    const declared = OPERATIONS.map(operation => operation.endpoint)
    assert.deepEqual([...registered].sort(), [...declared].sort())
    assert.deepEqual(app.modules.map(module => module.id).sort(), [
      'actions',
      'backup',
      'companion',
      'library',
      'media',
      'memory',
      'notes',
      'prompts',
      'reading',
      'search',
    ])
  } finally {
    await app.dispose()
    rmSync(dataDir, { recursive: true, force: true })
  }
})

test('contract_wire_shapes_match_declared_keys', async () => {
  const dataDir = mkdtempSync(join(tmpdir(), 'dsh-readpilot-contract-'))
  const app = createApp({ dataDir })
  try {
    const state = (await app.router.handle('state', {})) as Record<string, unknown>
    assert.deepEqual(Object.keys(state).sort(), [...READER_STATE_KEYS].sort())
  } finally {
    await app.dispose()
    rmSync(dataDir, { recursive: true, force: true })
  }
})
