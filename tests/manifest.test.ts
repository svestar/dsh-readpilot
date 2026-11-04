import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const TESTED_DSH_VERSION = '0.2.2-rc.1'

test('dsh_engine_declares_tested_runtime', async () => {
  const raw = await readFile(new URL('../package.json', import.meta.url), 'utf8')
  const pkg = JSON.parse(raw)
  assert.equal(pkg.engines.node, '>=22.18')
  assert.equal(pkg.engines.dsh, '>=0.2.2-rc.1 <0.3.0')
  assert.ok(pkg.engines.dsh.includes(TESTED_DSH_VERSION))
})
