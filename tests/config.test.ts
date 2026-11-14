import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { Config, apply } from '../index.ts'
import { createFakeHost } from './support/fake-host.ts'

/** Run `body` with `DSH_HOME` pointed at a throwaway directory. */
async function withHome(body: () => void | Promise<void>): Promise<void> {
  const home = mkdtempSync(join(tmpdir(), 'dsh-plugin-config-'))
  const previous = process.env.DSH_HOME
  process.env.DSH_HOME = home
  try {
    await body()
  } finally {
    if (previous === undefined) delete process.env.DSH_HOME
    else process.env.DSH_HOME = previous
    rmSync(home, { recursive: true, force: true })
  }
}

test('config_schema_supplies_defaults', () => {
  assert.deepEqual(Config({}), { enabled: true })
  assert.deepEqual(Config({ enabled: false }), { enabled: false })
})

test('config_can_disable_registration', async () => {
  await withHome(() => {
    const host = createFakeHost()
    try {
      apply(host.ctx, { enabled: false })
      assert.equal(host.routes.length, 0)
      assert.equal(host.tools.length, 0)
    } finally {
      host.dispose()
    }
  })
})

test('config_enabled_registers_route_and_tool', async () => {
  await withHome(() => {
    const host = createFakeHost()
    try {
      apply(host.ctx, { enabled: true })
      assert.equal(host.routes.length, 7)
      assert.equal(host.tools.length, 14)
    } finally {
      host.dispose()
    }
  })
})
