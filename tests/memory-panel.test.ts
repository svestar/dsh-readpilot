import test from 'node:test'
import assert from 'node:assert/strict'
import { bindRuntime } from '../src/client/runtime.ts'
import { MemoryPanel, type MemoryView } from '../src/client/modules/companion/MemoryPanel.ts'

function collectText(node: any): string {
  if (node == null) return ''
  if (typeof node === 'string' || typeof node === 'number') return String(node)
  if (Array.isArray(node)) return node.map(collectText).join('')
  return collectText(node.children)
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
    bookHistory: [{ id: '1-a', text: '旧的本书记忆', createdAt: 1, characters: 5 }],
    readerHistory: [{ id: '2-b', text: '旧的读者卡偏好', createdAt: 2, characters: 7 }],
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
  assert.equal(text.split('historyRestore').length - 1, 2)
  assert.equal(text.split('historyDelete').length - 1, 2)
  assert.equal(text.split('historyClear').length - 1, 2)
})
