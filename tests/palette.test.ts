import test from 'node:test'
import assert from 'node:assert/strict'

const globalAny = globalThis as any

globalAny.window = {
  __ModuleLoader__: {
    load(registration: any) {
      globalAny.__readerRegistration = registration
    },
  },
}
globalAny.document = {
  createElement() {
    return { dataset: {}, style: {}, textContent: '' }
  },
  head: { appendChild() {} },
}

// @ts-expect-error client.js is a build artifact without type declarations.
await import('../client.js')

const plugin = globalAny.__readerRegistration.factory(() => ({ createElement: () => null }))

test('resolve_reader_palette_defaults', () => {
  assert.deepEqual(plugin.READER_PALETTE_IDS, ['auto', 'light', 'dark', 'sepia', 'green', 'night', 'glass'])
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
test('glass_blur_is_clamped', () => {
  assert.equal(plugin.normalizeGlassBlur(undefined), plugin.DEFAULT_GLASS_BLUR)
  assert.equal(plugin.normalizeGlassBlur(null), plugin.DEFAULT_GLASS_BLUR)
  assert.equal(plugin.normalizeGlassBlur(''), plugin.DEFAULT_GLASS_BLUR)
  assert.equal(plugin.normalizeGlassBlur('36'), 36)
  assert.equal(plugin.normalizeGlassBlur(12.6), 13)
  assert.equal(plugin.normalizeGlassBlur(200), 80)
  assert.equal(plugin.normalizeGlassBlur(-5), 0)
  assert.equal(plugin.normalizeGlassBlur('abc'), plugin.DEFAULT_GLASS_BLUR)
})
