import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import {
  createPromptPresetStore,
  DEFAULT_PROMPT_PRESETS,
  DEFAULT_PROMPT_PRESETS_EN,
} from '../src/host/modules/prompts/store.ts'
import { renderPrompt } from '../src/shared/prompt-render.ts'
import { createReaderApi } from '../src/host/app.ts'
import { fakeContext, makeLibrary } from './support/api-helpers.ts'
import { bindRuntime } from '../src/client/runtime.ts'
import { PromptPresetManager } from '../src/client/modules/companion/PromptPresetManager.ts'
import { ConfirmDialog } from '../src/client/modules/common/ConfirmDialog.ts'
import { zhWorkspace } from '../src/client/locale/zh-workspace.ts'
import { enWorkspace } from '../src/client/locale/en-workspace.ts'

async function tempStore(t: any) {
  const dataDir = await mkdtemp(join(tmpdir(), 'dsh-readpilot-presets-'))
  t.after(() => rm(dataDir, { recursive: true, force: true }))
  return { dataDir, store: createPromptPresetStore(dataDir) }
}

test('prompt_presets_seed_edit_reset_and_delete', async t => {
  const { store } = await tempStore(t)
  const initial = await store.list()
  assert.equal(initial.length, DEFAULT_PROMPT_PRESETS.length)
  assert.ok(initial.length >= 12)
  assert.ok(initial.some(item => item.id === 'character'))
  assert.ok(initial.some(item => item.id === 'craft'))
  assert.equal(initial[0].builtin, true)

  const created = await store.save({ title: '我的模板', template: '解释 {{selection}}' })
  assert.equal(created.builtin, false)
  assert.match(created.id, /^preset-/)

  const edited = await store.save({ id: 'explain', title: '解释', template: '解释：{{selection}}' })
  assert.equal(edited.id, 'explain')
  assert.equal(edited.title, '解释')

  assert.equal(await store.remove(created.id), true)
  assert.equal(await store.remove(created.id), false)
  const afterDelete = await store.list()
  assert.equal(afterDelete.some(item => item.id === created.id), false)

  const reset = await store.reset()
  assert.deepEqual(reset.map(item => item.id), DEFAULT_PROMPT_PRESETS.map(item => item.id))
  assert.equal((await store.list()).length, DEFAULT_PROMPT_PRESETS.length)
})

test('prompt_presets_validate_input', async t => {
  const { store } = await tempStore(t)
  await assert.rejects(store.save({ title: '', template: 'x' }), /title/)
  await assert.rejects(store.save({ title: 'x', template: '   ' }), /template/)
  await assert.rejects(store.save({ title: 'x', template: 'x'.repeat(4001) }), /template/)
  await assert.rejects(store.save({ id: 'missing', title: 'x', template: 'x' }), /not found/)
  await assert.rejects(store.remove('bad id'), /invalid/)
})

test('prompt_presets_migrate_new_defaults_once', async t => {
  const { dataDir, store } = await tempStore(t)
  await writeFile(join(dataDir, 'presets.json'), JSON.stringify([
    { id: 'explain', title: '旧解释', template: '旧 {{selection}}', builtin: true },
  ]), 'utf8')
  const migrated = await store.list()
  assert.ok(migrated.some(item => item.id === 'explain'))
  assert.equal(migrated.find(item => item.id === 'explain')?.title, '旧解释')
  assert.ok(migrated.some(item => item.id === 'character'))
  assert.equal(migrated.some(item => item.id === 'terms'), false)
  const file = JSON.parse(await readFile(join(dataDir, 'presets.json'), 'utf8'))
  assert.equal(file.version, 5)
  assert.deepEqual(file.overrides.explain, { title: '旧解释', template: '旧 {{selection}}' })
  assert.ok(file.hidden.includes('terms'))

  assert.equal(await store.remove('character'), true)
  assert.equal((await store.list()).some(item => item.id === 'character'), false)
  const character = DEFAULT_PROMPT_PRESETS.find(item => item.id === 'character')
  assert.ok(character)
  await store.save({ id: 'character', title: character.title, template: character.template })
  assert.ok((await store.list()).some(item => item.id === 'character'))
})

test('prompt_presets_localize_unedited_builtins', async t => {
  const { store } = await tempStore(t)
  const english = await store.list('en')
  assert.equal(english.length, DEFAULT_PROMPT_PRESETS_EN.length)
  assert.equal(english.find(item => item.id === 'explain')?.title, 'Explain this passage')
  assert.match(english.find(item => item.id === 'explain')?.template ?? '', /Explain this passage/)

  await store.save({ id: 'explain', title: 'My explanation', template: 'Custom {{selection}}' })
  const editedEn = await store.list('en')
  const editedZh = await store.list('zh')
  assert.equal(editedEn.find(item => item.id === 'explain')?.title, 'My explanation')
  assert.equal(editedZh.find(item => item.id === 'explain')?.title, 'My explanation')

  await store.reset()
  assert.equal((await store.list('en')).find(item => item.id === 'explain')?.title, 'Explain this passage')
  assert.equal((await store.list('zh')).find(item => item.id === 'explain')?.title, '解释这段')
})

test('prompt_presets_save_unchanged_builtin_keeps_localization', async t => {
  const { dataDir, store } = await tempStore(t)
  const explain = (await store.list('en')).find(item => item.id === 'explain')
  assert.ok(explain)
  await store.save({ title: '临时预设', template: '临时 {{selection}}' })

  await store.save({ id: 'explain', title: explain.title, template: explain.template }, 'en')
  assert.equal((await store.list('zh')).find(item => item.id === 'explain')?.title, '解释这段')
  const file = JSON.parse(await readFile(join(dataDir, 'presets.json'), 'utf8'))
  assert.equal(file.version, 5)
  assert.equal(file.overrides.explain, undefined)

  await store.save({ id: 'explain', title: '自定义解释', template: '自定义 {{selection}}' })
  assert.equal((await store.list('zh')).find(item => item.id === 'explain')?.title, '自定义解释')
})

test('prompt_presets_other_language_default_is_an_edit', async t => {
  const { dataDir, store } = await tempStore(t)
  const zh = DEFAULT_PROMPT_PRESETS.find(item => item.id === 'explain')
  assert.ok(zh)
  await store.save({ title: '临时预设', template: '临时 {{selection}}' })

  const saved = await store.save({ id: 'explain', title: zh.title, template: zh.template }, 'en')
  assert.equal(saved.builtin, true)
  assert.equal((await store.list('en')).find(item => item.id === 'explain')?.title, zh.title)
  assert.equal((await store.list('zh')).find(item => item.id === 'explain')?.title, zh.title)
  const file = JSON.parse(await readFile(join(dataDir, 'presets.json'), 'utf8'))
  assert.deepEqual(file.overrides.explain, { title: zh.title, template: zh.template })
})

test('prompt_presets_v4_migrates_edited_and_hidden', async t => {
  const { dataDir, store } = await tempStore(t)
  const terms = DEFAULT_PROMPT_PRESETS.find(item => item.id === 'terms')
  assert.ok(terms)
  await writeFile(join(dataDir, 'presets.json'), JSON.stringify({
    version: 4,
    presets: [
      { id: 'explain', title: '我的解释', template: '自定义 {{selection}}', builtin: true, edited: true },
      { id: 'terms', title: terms.title, template: terms.template, builtin: true },
      { id: 'my-custom', title: '自定义', template: '自定义 {{selection}}', builtin: false },
    ],
  }), 'utf8')

  const list = await store.list()
  assert.equal(list.find(item => item.id === 'explain')?.title, '我的解释')
  assert.equal(list.find(item => item.id === 'terms')?.title, terms.title)
  assert.equal(list.find(item => item.id === 'my-custom')?.builtin, false)
  assert.equal(list.some(item => item.id === 'character'), false)

  const file = JSON.parse(await readFile(join(dataDir, 'presets.json'), 'utf8'))
  assert.equal(file.version, 5)
  assert.deepEqual(file.overrides.explain, { title: '我的解释', template: '自定义 {{selection}}' })
  assert.equal(file.overrides.terms, undefined)
  assert.ok(file.hidden.includes('character'))
})

test('prompt_presets_simplify_untouched_defaults_on_v2', async t => {
  const { dataDir, store } = await tempStore(t)
  await writeFile(join(dataDir, 'presets.json'), JSON.stringify({
    version: 2,
    presets: [
      {
        id: 'explain',
        title: '解释这段',
        template: '请解释下面这段内容，并结合《{{book}}》{{chapter}} 的上下文说明它的意思：\n\n{{selection}}',
        builtin: true,
      },
      { id: 'custom', title: '自定义', template: '自定义 {{selection}}', builtin: false },
    ],
  }), 'utf8')
  const list = await store.list()
  assert.equal(list.find(item => item.id === 'explain')?.template, '解释这段，结合《{{book}}》{{chapter}} 的上下文：\n\n{{selection}}')
  assert.equal(list.find(item => item.id === 'custom')?.template, '自定义 {{selection}}')
  assert.equal(list.some(item => item.id === 'character'), false)
})

test('prompts_rpc_uses_host_workspace_language', async t => {
  const { library, data } = await makeLibrary(t)
  const api = createReaderApi({ ctx: fakeContext(), dataDir: data })
  await api.configureLibrary({ path: library, locale: 'en' })

  const value = await api.prompts({ action: 'list', locale: 'zh' })
  assert.equal(value.presets.find((item: any) => item.id === 'explain')?.title, 'Explain this passage')
})

test('render_prompt_replaces_placeholders_literally', () => {
  const output = renderPrompt('《{{book}}》{{chapter}}：{{selection}}\n{{notes}}', {
    book: '书名$&',
    chapter: '第一章',
    selection: '选中 $1 文本',
    notes: '批注 A',
  })
  assert.equal(output, '《书名$&》第一章：选中 $1 文本\n批注 A')
})

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

const presetText = (key: string) => (zhWorkspace as Record<string, string>)[key] ?? key

const managerPresets = [
  { id: 'explain', title: '解释这段', template: '{{selection}}', builtin: true },
  { id: 'preset-abc', title: '自定义', template: '{{book}}', builtin: false },
]

/** Renders PromptPresetManager with stateful hooks so confirm flows can re-render synchronously. */
function renderManager() {
  const calls = { reset: 0 }
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
    useRef(initial: any) {
      return { current: initial }
    },
  }
  const render = () => {
    cursor = 0
    view = PromptPresetManager({
      t: presetText,
      presets: managerPresets,
      onSave: async () => {},
      onDelete: async () => {},
      onReset: async () => { calls.reset += 1 },
      onClose: () => {},
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

test('prompt_preset_reset_lives_in_footer_and_requires_confirmation', async () => {
  const { view, calls } = renderManager()
  const footer = findAll(view(), node => node.props?.className === 'dsh-readpilot-preset-footer')[0]
  assert.ok(footer)
  assert.match(collectText(footer), /恢复全部默认/)
  const actions = findAll(view(), node => node.props?.className === 'dsh-readpilot-preset-actions')[0]
  assert.doesNotMatch(collectText(actions), /恢复全部默认/)

  const clickReset = () => {
    const button = findAll(view(), node => node.type === 'button' && collectText(node) === '恢复全部默认')[0]
    assert.ok(button)
    button.props.onClick()
  }

  clickReset()
  assert.equal(calls.reset, 0)
  const cancelDialog = findAll(view(), node => node.type === ConfirmDialog)[0]
  assert.ok(cancelDialog)
  assert.match(cancelDialog.props.message, /删除所有自定义提示词/)
  cancelDialog.props.onCancel()
  await new Promise(resolve => setImmediate(resolve))
  assert.equal(calls.reset, 0)
  assert.equal(findAll(view(), node => node.type === ConfirmDialog).length, 0)

  clickReset()
  const confirmDialog = findAll(view(), node => node.type === ConfirmDialog)[0]
  assert.ok(confirmDialog)
  confirmDialog.props.onConfirm()
  await new Promise(resolve => setImmediate(resolve))
  assert.equal(calls.reset, 1)

  assert.match((enWorkspace as Record<string, string>).presetReset, /all/i)
  assert.match((enWorkspace as Record<string, string>).presetResetConfirm, /custom/i)
})

