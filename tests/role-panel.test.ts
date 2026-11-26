import test from 'node:test'
import assert from 'node:assert/strict'
import { bindRuntime } from '../src/client/runtime.ts'
import { RolePanel } from '../src/client/modules/companion/RolePanel.ts'
import { ConfirmDialog } from '../src/client/modules/common/ConfirmDialog.ts'
import type { RoleState } from '../src/shared/contracts/role.ts'

function collectText(node: any): string {
  if (node == null) return ''
  if (typeof node === 'string' || typeof node === 'number') return String(node)
  if (Array.isArray(node)) return node.map(collectText).join('')
  return collectText(node.children)
}

function findAll(node: any, predicate: (node: any) => boolean, found: any[] = []): any[] {
  if (node == null || typeof node !== 'object') return found
  if (Array.isArray(node)) {
    for (const child of node) findAll(child, predicate, found)
    return found
  }
  if (predicate(node)) found.push(node)
  return findAll(node.children, predicate, found)
}

const status: RoleState = {
  enabled: true,
  bookEnabled: false,
  bookId: 'book1',
  globalText: '全局角色',
  bookText: '',
  defaultText: '默认角色',
  effectiveText: '全局角色',
  effectiveSource: 'global',
  globalHistory: [{ id: '1-a', text: '旧全局', createdAt: 1, characters: 3 }],
  bookHistory: [],
}

function renderPanel(calls: any, state: RoleState = status) {
  const slots: any[] = []
  let cursor = 0
  let view: any = null
  const React = {
    createElement(type: any, attrs: any, ...children: any[]) {
      return { type, props: attrs ?? {}, children }
    },
    useState(initial: any) {
      const slot = cursor++
      if (slot >= slots.length) slots[slot] = typeof initial === 'function' ? initial() : initial
      return [slots[slot], (value: any) => {
        slots[slot] = typeof value === 'function' ? value(slots[slot]) : value
        render()
      }]
    },
    useEffect() {},
  }
  const render = () => {
    cursor = 0
    view = RolePanel({
      t: (key: string) => key,
      status: state,
      loading: false,
      error: '',
      busy: false,
      onRefresh() {},
      onEnabled: enabled => { calls.enabled = enabled },
      onBookEnabled: enabled => { calls.bookEnabled = enabled },
      onSave: (scope, text) => { calls.saved = [scope, text] },
      onRestoreHistory() {},
      onRemoveHistory() {},
      onClearHistory: scope => { calls.cleared = scope },
      onUndo() {},
      onClear() {},
    })
  }
  bindRuntime((name: string) => {
    if (name === 'react') return React
    if (name === 'react-dom') return { createPortal: (node: any) => node }
    if (name === '@deepseek-ai/dsh-client-ui-primitives') return { Modal: 'Modal', Tooltip: 'Tooltip', Toast: 'Toast' }
    throw new Error(`unexpected require: ${name}`)
  })
  render()
  return { view: () => view, calls }
}

test('role_panel_renders_effective_role_and_controls', () => {
  const { view } = renderPanel({})
  const text = collectText(view())
  assert.match(text, /全局角色/)
  assert.match(text, /roleEffective/)
  assert.match(text, /roleSourceGlobal/)
  const placeholders = findAll(view(), node => node.type === 'textarea').map(node => node.props.placeholder)
  assert.deepEqual(placeholders, ['roleGlobalPlaceholder', 'roleBookPlaceholder'])
})

test('role_panel_switches_book_override_and_clears_history', () => {
  const calls: any = {}
  const { view } = renderPanel(calls)
  const buttons = findAll(view(), node => node.type === 'button')
  const bookOn = buttons.filter(node => collectText(node) === 'roleEnabledOn').at(-1)
  assert.ok(bookOn)
  bookOn.props.onClick()
  assert.equal(calls.bookEnabled, true)

  const clear = buttons.find(node => collectText(node) === 'historyClear')
  assert.ok(clear)
  clear.props.onClick()
  const dialog = findAll(view(), node => node.type === ConfirmDialog)[0]
  assert.ok(dialog)
  assert.equal(dialog.props.message, 'roleHistoryClearConfirm')
  dialog.props.onConfirm()
  assert.equal(calls.cleared, 'global')
})

test('role_panel_prefills_global_editor_with_default_role', () => {
  const calls: any = {}
  const { view } = renderPanel(calls, { ...status, globalText: '', effectiveText: '默认角色', effectiveSource: 'default' })
  const globalEditor = findAll(view(), node => node.type === 'textarea')[0]
  assert.equal(globalEditor.props.value, '默认角色')
  const save = findAll(view(), node => node.type === 'button' && collectText(node) === 'save')[0]
  save.props.onClick()
  assert.equal(calls.saved, undefined)
})
