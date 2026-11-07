import test from 'node:test'
import assert from 'node:assert/strict'
import { bindRuntime } from '../src/client/runtime.ts'
import { dismissesSelection, useSelectionDismiss } from '../src/client/hooks/use-selection-dismiss.ts'

function setup() {
  const listeners: Array<(event: any) => void> = []
  ;(globalThis as any).document = {
    addEventListener(type: string, listener: (event: any) => void) {
      if (type === 'pointerdown') listeners.push(listener)
    },
    removeEventListener(type: string, listener: (event: any) => void) {
      if (type !== 'pointerdown') return
      const index = listeners.indexOf(listener)
      if (index >= 0) listeners.splice(index, 1)
    },
  }
  const effects: Array<() => void | (() => void)> = []
  bindRuntime((name: string) => {
    if (name === 'react') return { createElement() {}, useEffect(effect: () => void | (() => void)) { effects.push(effect) } }
    if (name === 'react-dom') return { createPortal() {} }
    if (name === '@deepseek-ai/dsh-client-ui-primitives') return { Modal: 'Modal' }
    throw new Error(`unexpected require: ${name}`)
  })
  return { listeners, effects }
}

function targetInsideToolbar(inside: boolean) {
  return {
    closest: (selector: string) => inside && selector === '.dsh-readpilot-selection' ? {} : null,
  } as unknown as EventTarget
}

test('selection_dismiss_ignores_pointerdown_inside_the_toolbar', () => {
  assert.equal(dismissesSelection(targetInsideToolbar(true)), false)
})

test('selection_dismiss_targets_pointerdown_outside_or_without_an_element', () => {
  assert.equal(dismissesSelection(targetInsideToolbar(false)), true)
  assert.equal(dismissesSelection(null), true)
  assert.equal(dismissesSelection({} as EventTarget), true)
})

test('selection_dismiss_clears_on_outside_pointerdown_and_detaches_on_cleanup', () => {
  const { listeners, effects } = setup()
  const cleared: Array<unknown> = []
  useSelectionDismiss(
    { text: 'quote', blockIndex: 0, offset: 0, x: 10, y: 20 },
    value => cleared.push(value),
    { current: null },
  )
  assert.equal(effects.length, 1)
  const cleanup = effects[0]() as () => void
  assert.equal(listeners.length, 1)

  listeners[0]({ target: targetInsideToolbar(true) })
  assert.deepEqual(cleared, [])

  listeners[0]({ target: targetInsideToolbar(false) })
  assert.deepEqual(cleared, [null])

  cleanup()
  assert.equal(listeners.length, 0)
})

test('selection_dismiss_registers_no_listener_without_a_selection', () => {
  const { listeners, effects } = setup()
  useSelectionDismiss(null, () => {}, { current: null })
  assert.equal(effects.length, 1)
  effects[0]()
  assert.equal(listeners.length, 0)
})
