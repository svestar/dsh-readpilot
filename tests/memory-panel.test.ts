import test from 'node:test'
import assert from 'node:assert/strict'
import { bindRuntime } from '../src/client/runtime.ts'
import { ConfirmDialog } from '../src/client/modules/common/ConfirmDialog.ts'
import { MemoryPanel, type MemoryPanelProps, type MemoryView } from '../src/client/modules/companion/MemoryPanel.ts'

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

function historyButtons(view: any, label: string): any[] {
  return findAll(view, node => node.type === 'button' && collectText(node) === label)
}

function confirmOf(view: any): any {
  return findAll(view, node => node.type === ConfirmDialog)[0]
}

/** Renders MemoryPanel with stateful hooks so confirm flows can re-render synchronously. */
function interactivePanel(props: MemoryPanelProps): () => any {
  const slots: any[] = []
  let cursor = 0
  let view: any = null
  const render = () => {
    cursor = 0
    view = MemoryPanel(props)
  }
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
  bindRuntime((name: string) => {
    if (name === 'react') return React
    if (name === 'react-dom') return { createPortal: (node: any) => node }
    if (name === '@deepseek-ai/dsh-client-ui-primitives') return { Modal: 'Modal', Tooltip: 'Tooltip', Toast: 'Toast' }
    throw new Error(`unexpected require: ${name}`)
  })
  render()
  return () => view
}

test('memory_panel_shows_history_snapshot_text', () => {
  const React = {
    createElement(type: any, props: any, ...children: any[]) {
      return { type, props: props ?? {}, children }
    },
    useState(initial: any) {
      return [typeof initial === 'function' ? initial() : initial, () => {}]
    },
    useEffect() {},
  }
  bindRuntime((name: string) => {
    if (name === 'react') return React
    if (name === 'react-dom') return { createPortal: (node: any) => node }
    if (name === '@deepseek-ai/dsh-client-ui-primitives') return { Modal: 'Modal', Tooltip: 'Tooltip', Toast: 'Toast' }
    throw new Error(`unexpected require: ${name}`)
  })

  const status: MemoryView = {
    mode: 'on',
    book: 'inherit',
    effective: 'on',
    bookText: '当前本书记忆',
    readerText: '当前读者卡',
    roleText: '当前角色/风格',
    bookHistory: [{ id: '1-a', text: '旧的本书记忆', createdAt: 1, characters: 5 }],
    readerHistory: [{ id: '2-b', text: '旧的读者卡偏好', createdAt: 2, characters: 7 }],
    roleHistory: [{ id: '3-c', text: '旧的角色设定', createdAt: 3, characters: 6 }],
  }
  const view = MemoryPanel({
    t: key => key,
    status,
    loading: false,
    error: '',
    busy: false,
    onRefresh() {},
    onMode() {},
    onBookState() {},
    onSave() {},
    onRestoreHistory() {},
    onRemoveHistory() {},
    onClearHistory() {},
    onUndo() {},
    onClear() {},
  })
  const text = collectText(view)
  assert.match(text, /旧的本书记忆/)
  assert.match(text, /旧的读者卡偏好/)
  assert.match(text, /旧的角色设定/)
  assert.equal(text.split('historyRestore').length - 1, 3)
  assert.equal(text.split('historyDelete').length - 1, 3)
  assert.equal(text.split('historyClear').length - 1, 3)
})

test('memory_panel_history_confirm_flow', () => {
  const restored: Array<[string, string]> = []
  const removed: Array<[string, string]> = []
  const cleared: string[] = []
  const view = interactivePanel({
    t: key => key,
    status: {
      mode: 'on',
      book: 'inherit',
      effective: 'on',
      bookText: 'B',
      readerText: 'R',
      roleText: 'S',
      bookHistory: [{ id: '1-a', text: 'old book', createdAt: 1, characters: 8 }],
      readerHistory: [{ id: '2-b', text: 'old reader', createdAt: 2, characters: 10 }],
      roleHistory: [{ id: '3-c', text: 'old role', createdAt: 3, characters: 8 }],
    },
    loading: false,
    error: '',
    busy: false,
    onRefresh() {},
    onMode() {},
    onBookState() {},
    onSave() {},
    onRestoreHistory(scope, id) {
      restored.push([scope, id])
    },
    onRemoveHistory(scope, id) {
      removed.push([scope, id])
    },
    onClearHistory(scope) {
      cleared.push(scope)
    },
    onUndo() {},
    onClear() {},
  })

  historyButtons(view(), 'historyDelete')[0].props.onClick()
  assert.equal(confirmOf(view()).props.message, 'historyDeleteConfirm')
  confirmOf(view()).props.onConfirm()
  assert.deepEqual(removed, [['book', '1-a']])

  historyButtons(view(), 'historyDelete')[1].props.onClick()
  confirmOf(view()).props.onCancel()
  assert.deepEqual(removed, [['book', '1-a']])

  historyButtons(view(), 'historyClear')[0].props.onClick()
  assert.equal(confirmOf(view()).props.message, 'memoryBookHistoryClearConfirm')
  confirmOf(view()).props.onCancel()
  historyButtons(view(), 'historyClear')[1].props.onClick()
  assert.equal(confirmOf(view()).props.message, 'memoryHistoryClearConfirm')
  confirmOf(view()).props.onConfirm()
  assert.deepEqual(cleared, ['reader'])

  historyButtons(view(), 'historyClear')[2].props.onClick()
  assert.equal(confirmOf(view()).props.message, 'memoryRoleHistoryClearConfirm')
  confirmOf(view()).props.onConfirm()
  assert.deepEqual(cleared, ['reader', 'role'])

  historyButtons(view(), 'historyRestore')[2].props.onClick()
  assert.deepEqual(restored, [['role', '3-c']])
})
