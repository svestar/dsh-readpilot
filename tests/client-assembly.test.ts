import test from 'node:test'
import assert from 'node:assert/strict'

function createHarness() {
  const state: { snapshot: any; screen: any } = { snapshot: null, screen: { kind: 'library' } }
  let count = 0
  const React = {
    createElement(type: any, props: any, ...children: any[]) {
      return { type, props: { ...(props ?? {}), children }, children }
    },
    useState(initial: any) {
      count += 1
      if (count === 1) return [state.snapshot, () => {}]
      if (count === 2) return [state.screen, () => {}]
      return [typeof initial === 'function' ? initial() : initial, () => {}]
    },
    useRef(initial: any) { return { current: initial } },
    useCallback(fn: any) { return fn },
    useMemo(fn: any) { return fn() },
    useEffect() {},
    useLayoutEffect() {},
    useSyncExternalStore(getSnapshot: any) { return getSnapshot() },
  }
  return { React, state, reset() { count = 0 } }
}

const globalAny = globalThis as any

async function loadClient(harness: ReturnType<typeof createHarness>) {
  globalAny.window = {
    __ModuleLoader__: {
      load(registration: any) { globalAny.__readerRegistration = registration },
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
  globalAny.document = {
    createElement() { return { dataset: {}, style: {}, textContent: '' } },
    head: { appendChild() {} },
    querySelector() { return null },
  }
  // @ts-expect-error client.js is a build artifact without type declarations.
  await import('../client.js')
  const plugin = globalAny.__readerRegistration.factory((name: string) => {
    if (name === 'react') return harness.React
    if (name === 'react-dom') return { createPortal: (node: any) => node }
    if (name === '@deepseek-ai/dsh-client-ui-primitives') return { Modal: 'Modal', Tooltip: 'Tooltip', Toast: 'Toast' }
    throw new Error(`unexpected require: ${name}`)
  })
  let main: any
  let mainSpec: any
  let companion: any
  let sidebarTab: any
  let sidebarBodySpec: any
  const disposers: Array<() => void> = []
  plugin.apply({
    slots: {
      inject(name: any, fn: any) { fn() },
      register(spec: any, component: any) {
        if (spec.name === 'main') {
          main = component
          mainSpec = spec
        }
        if (spec.name === 'dsh-readpilot.companion') companion = component
        if (spec.name === 'sidebar.right.pane.tab') sidebarBodySpec = spec
        return () => {}
      },
    },
    locale: { bind() { return (key: string) => key }, register() { return () => {} } },
    effect(fn: any) { const dispose = fn(); if (typeof dispose === 'function') disposers.push(dispose); return () => {} },
    connection: {},
    sessions: {},
    layout: {},
    uiWorkspace: {},
    sidebarRightTabs: {
      register(spec: any) { sidebarTab = spec; return () => {} },
    },
  })
  assert.equal(typeof main, 'function')
  return { plugin, main, mainSpec, companion, sidebarTab, sidebarBodySpec, disposers }
}

function collectClasses(element: any, output: any[] = []) {
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
  const classes = collectClasses(main({ t: (key: string) => key }))
  assert.ok(classes.includes('dsh-readpilot-panel'))
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
  const libraryClasses = collectClasses(main({ t: (key: string) => key }))
  assert.ok(libraryClasses.includes('dsh-readpilot-library'))
  assert.ok(libraryClasses.includes('dsh-readpilot-library-side'))

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
  const readerClasses = collectClasses(main({ t: (key: string) => key }))
  assert.ok(readerClasses.includes('dsh-readpilot-reader'), readerClasses.join(','))
  assert.ok(readerClasses.some(value => value.includes('dsh-readpilot-reader-inner')))
  assert.ok(readerClasses.some(value => value.includes('dsh-readpilot-paged-inner')))
})

test('client_assembly_renders_reader_bar_for_default_paged_text', async () => {
  const harness = createHarness()
  harness.state.snapshot = {
    settings: { libraryDir: 'E:/Books', workspaceId: 'w1' },
    books: [],
    sessions: {},
    tags: {},
  }
  harness.state.screen = {
    kind: 'book',
    detail: {
      book: { id: 'b1', title: 'Book', format: 'txt' },
      toc: [{ id: 'c001', title: 'One', page: 1 }],
      progress: null,
    },
    content: { chapterId: 'c001', title: 'One', blocks: [{ type: 'p', text: 'Hello' }] },
  }
  const { main } = await loadClient(harness)
  harness.reset()
  const classes = collectClasses(main({ t: (key: string) => key }))
  assert.ok(classes.includes('dsh-readpilot-main'), classes.join(','))
  assert.ok(classes.includes('dsh-readpilot-bar'), classes.join(','))
  assert.ok(classes.includes('dsh-readpilot-reader'), classes.join(','))
  assert.ok(classes.some(value => value.includes('dsh-readpilot-reader-inner')), classes.join(','))
  assert.ok(classes.some(value => value.includes('dsh-readpilot-paged-inner')), classes.join(','))
})

test('client_assembly_declares_session_companion_slot', async () => {
  const harness = createHarness()
  const { mainSpec, companion, disposers } = await loadClient(harness)
  assert.deepEqual(mainSpec.children, {
    'dsh-readpilot.companion': { kind: 'single', scope: 'session' },
  })
  assert.equal(typeof companion, 'function')
  for (const dispose of disposers.reverse()) dispose()
})
test('client_assembly_registers_sidebar_reader_tab', async () => {
  const harness = createHarness()
  const { sidebarTab, sidebarBodySpec } = await loadClient(harness)
  assert.equal(sidebarTab.id, 'dsh-readpilot.sidebar')
  assert.equal(sidebarTab.kind, 'dsh-readpilot')
  assert.equal(sidebarTab.guide[0].id, 'reader')
  assert.equal(sidebarBodySpec.key, 'dsh-readpilot.sidebar')
})



