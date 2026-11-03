import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

test('root_entry_reexports_host_build', async () => {
  const source = await readFile(new URL('../index.js', import.meta.url), 'utf8')
  assert.match(source, /export\s+\*\s+from\s+['"]\.\/dist\/index\.js['"]/)
})
