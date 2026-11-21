import test from 'node:test'
import assert from 'node:assert/strict'
import { bindRuntime } from '../src/client/runtime.ts'
import { SelectionToolbar, quoteDraft } from '../src/client/modules/reader/SelectionNote.ts'

function setup() {
  const body = { id: 'document-body' }
  ;(globalThis as any).document = { body }
  const React = {
    createElement(type: any, props: any, ...children: any[]) {
      return { type, props: { ...(props ?? {}), children }, children }
    },
    useRef(initial: any) { return { current: initial } },
    useState(initial: any) { return [initial, () => {}] },
    useEffect() {},
    Component: class {},
  }
  const portals: Array<{ node: any; container: any }> = []
  bindRuntime((name: string) => {
    if (name === 'react') return React
    if (name === 'react-dom') {
      return {
        createPortal(node: any, container: any) {
          portals.push({ node, container })
          return node
        },
      }
    }
    if (name === '@deepseek-ai/dsh-client-ui-primitives') return { Modal: 'Modal', Tooltip: 'Tooltip', Toast: 'Toast' }
    throw new Error(`unexpected require: ${name}`)
  })
  return { body, portals }
}

test('selection_toolbar_portals_menu_to_document_body', () => {
  const { body, portals } = setup()
  const element = SelectionToolbar({
    t: (key: string) => key,
    selection: { text: 'quote', blockIndex: 0, offset: 0, x: 100, y: 120 },
    onNote() {},
    onHighlight() {},
  })
  assert.equal(portals.length, 1)
  assert.equal(portals[0].container, body)
  assert.equal(portals[0].node, element)
  assert.equal(element.props.className, 'dsh-readpilot-selection')
})

test('selection_toolbar_renders_nothing_without_selection', () => {
  const { portals } = setup()
  const element = SelectionToolbar({
    t: (key: string) => key,
    selection: null,
    onNote() {},
    onHighlight() {},
  })
  assert.equal(element, null)
  assert.equal(portals.length, 0)
})

function collectText(node: any, result: string[] = []): string[] {
  if (node == null) return result
  if (typeof node === 'string' || typeof node === 'number') {
    result.push(String(node))
    return result
  }
  if (Array.isArray(node)) {
    for (const child of node) collectText(child, result)
    return result
  }
  if (typeof node === 'object') collectText(node.children, result)
  return result
}

function hasClass(node: any, className: string): boolean {
  if (node == null || typeof node !== 'object') return false
  if (Array.isArray(node)) return node.some(child => hasClass(child, className))
  if (node.props?.className === className) return true
  return hasClass(node.children, className)
}

test('selection_toolbar_hides_note_and_highlight_for_translation', () => {
  setup()
  const element = SelectionToolbar({
    t: (key: string) => key,
    selection: { text: '译文', blockIndex: 0, offset: 0, x: 100, y: 120, translated: true },
    onAsk() {},
    onTranslate() {},
    onNote() {},
    onHighlight() {},
  })
  const content = collectText(element)
  assert.ok(content.includes('askCompanion'))
  assert.ok(content.includes('translateAction'))
  assert.ok(!content.includes('noteAction'))
  assert.ok(!hasClass(element, 'dsh-readpilot-selection-colors'))
})

test('selection_toolbar_keeps_note_and_highlight_for_source_text', () => {
  setup()
  const element = SelectionToolbar({
    t: (key: string) => key,
    selection: { text: 'source', blockIndex: 0, offset: 0, x: 100, y: 120 },
    onAsk() {},
    onTranslate() {},
    onNote() {},
    onHighlight() {},
  })
  const content = collectText(element)
  assert.ok(content.includes('noteAction'))
  assert.ok(hasClass(element, 'dsh-readpilot-selection-colors'))
})

test('quote_draft_prefixes_every_line_and_ends_with_a_blank_line', () => {
  assert.equal(quoteDraft('a\nb'), '> a\n> b\n\n')
  assert.equal(quoteDraft('single'), '> single\n\n')
})



