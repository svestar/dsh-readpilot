import test from 'node:test'
import assert from 'node:assert/strict'

function createHarness() {
  const state = { snapshot: null, screen: { kind: 'library' } }
  let count = 0
  const React = {
    createElement(type, props, ...children) {
      return { type, props: { ...(props ?? {}), children }, children }
    },
    useState(initial) {
      count += 1
      if (count === 1) return [state.snapshot, () => {}]
      if (count === 2) return [state.screen, () => {}]
      return [typeof initial === 'function' ? initial() : initial, () => {}]
    },
    useRef(initial) { return { current: initial } },
    useCallback(fn) { return fn },
    useMemo(fn) { return fn() },
    useEffect() {},
    useLayoutEffect() {},
    useSyncExternalStore(getSnapshot) { return getSnapshot() },
  }
  return { React, state, reset() { count = 0 } }
}

async function loadClient(harness) {
  globalThis.window = {
    __ModuleLoader__: {
      load(registration) { globalThis.__readerRegistration = registration },
    },
    innerWidth: 1400,
    localStorage: { getItem() { return null }, setItem() {} },
    addEventListener() {},
    removeEventListener() {},
    matchMedia() { return { matches: false } },
    setTimeout() { return 0 },
    requestAnimationFrame() { return 0 },
    getSelection() { return null },
  }
  globalThis.document = {
    createElement() { return { dataset: {}, style: {}, textContent: '' } },
    head: { appendChild() {} },
    querySelector() { return null },
  }
  await import('../client.js')
  const plugin = globalThis.__readerRegistration.factory(name => {
    if (name === 'react') return harness.React
    throw new Error(`unexpected require: ${name}`)
  })
  let main
  const disposers = []
  plugin.apply({
    slots: {
      inject(name, fn) { fn() },
      register(spec, component) {
        if (spec.name === 'main') main = component
        return () => {}
      },
    },
    locale: { bind() { return key => key }, register() { return () => {} } },
    effect(fn) { const dispose = fn(); if (typeof dispose === 'function') disposers.push(dispose); return () => {} },
    connection: {},
    sessions: {},
    layout: {},
    uiWorkspace: {},
  })
  assert.equal(typeof main, 'function')
  return { plugin, main, disposers }
}

function collectClasses(element, output = []) {
  if (!element || typeof element !== 'object') return output
  if (Array.isArray(element)) {
    for (const child of element) collectClasses(child, output)
    return output
  }
  if (typeof element.type === 'function') {
    collectClasses(element.type(element.props), output)
    return output
  }
  if (element.props?.className) output.push(element.props.className)
  for (const child of element.children ?? []) collectClasses(child, output)
  return output
}

test('client_assembly_registers_main_panel', async () => {
  const harness = createHarness()
  const { main, disposers } = await loadClient(harness)
  const classes = collectClasses(main({ t: key => key }))
  assert.ok(classes.includes('dsh-reader-panel'))
  for (const dispose of disposers.reverse()) dispose()
})

test('client_assembly_renders_library_and_text_reader', async () => {
  const harness = createHarness()
  harness.state.snapshot = {
    settings: { libraryDir: 'E:/Books', workspaceId: 'w1' },
    books: [],
    sessions: {},
    tags: {},
  }
  harness.state.screen = { kind: 'library' }
  const { main } = await loadClient(harness)
  harness.reset()
  const libraryClasses = collectClasses(main({ t: key => key }))
  assert.ok(libraryClasses.includes('dsh-reader-library'))
  assert.ok(libraryClasses.includes('dsh-reader-library-side'))

  harness.state.screen = {
    kind: 'book',
    detail: {
      book: { id: 'b1', title: 'Book', format: 'txt' },
      toc: [{ id: 'c001', title: 'One', page: 1 }],
      progress: null,
    },
    content: { chapterId: 'c001', title: 'One', blocks: [{ type: 'p', text: 'Hello' }] },
  }
  harness.reset()
  const readerClasses = collectClasses(main({ t: key => key }))
  assert.ok(readerClasses.includes('dsh-reader-reader'), readerClasses.join(','))
  assert.ok(readerClasses.includes('dsh-reader-reader-inner'))
})
