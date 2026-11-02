import test from 'node:test'
import assert from 'node:assert/strict'

globalThis.window = {
  __ModuleLoader__: {
    load(registration) {
      globalThis.__readerRegistration = registration
    },
  },
}
globalThis.document = {
  createElement() {
    return { dataset: {}, style: {}, textContent: '' }
  },
  head: { appendChild() {} },
}

await import('../client.js')

const plugin = globalThis.__readerRegistration.factory(() => ({ createElement: () => null }))

test('resolve_reader_palette_defaults', () => {
  assert.deepEqual(plugin.READER_PALETTE_IDS, ['auto', 'light', 'dark', 'sepia', 'green', 'night'])
  const auto = plugin.resolveReaderPalette('auto')
  assert.equal(auto.id, 'auto')
  assert.equal(auto.bg, 'var(--dsw-alias-bg-base)')
  assert.equal(auto.fg, 'var(--dsw-alias-label-primary)')

  const seen = new Set()
  for (const id of plugin.READER_PALETTE_IDS) {
    const palette = plugin.resolveReaderPalette(id)
    assert.equal(palette.id, id)
    assert.ok(palette.bg)
    assert.ok(palette.fg)
    seen.add(`${palette.bg}|${palette.fg}`)
  }
  assert.equal(seen.size, plugin.READER_PALETTE_IDS.length)
})

test('resolve_reader_palette_fallback', () => {
  const fallback = plugin.resolveReaderPalette('not-a-palette')
  assert.equal(fallback.id, 'auto')
  assert.equal(fallback, plugin.READER_PALETTES.auto)
})
