import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, readFile, rm, writeFile, mkdir } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createReaderApi, createApp } from '../src/host/app.ts'
import { createRoleStore } from '../src/host/modules/role/store.ts'
import { resolveRole } from '../src/host/modules/role/resolve.ts'
import { buildRoleContext } from '../src/host/modules/role/context.ts'
import { DEFAULT_ROLE } from '../src/host/modules/role/defaults.ts'
import { fakeContext, makeLibrary } from './support/api-helpers.ts'

async function tempDir(t: any): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'dsh-readpilot-role-'))
  t.after(() => rm(dir, { recursive: true, force: true }))
  return dir
}

test('role_store_read_write_and_history', async t => {
  const dir = await tempDir(t)
  const store = createRoleStore(dir)
  assert.deepEqual(await store.read('global'), { text: '', characters: 0 })
  await store.write('global', '第一版')
  await store.write('global', '第二版')
  const history = await store.listHistory('global')
  assert.equal(history.length, 1)
  assert.equal(history[0].text, '第一版')
  assert.equal((await store.read('global')).text, '第二版')
  assert.equal(await readFile(join(dir, 'roles', 'global.md'), 'utf8'), '第二版')
  assert.equal((await store.undo('global')).text, '第一版')

  await store.write('book', '本书角色', 'book1')
  assert.equal((await store.read('book', 'book1')).text, '本书角色')
  assert.equal(await readFile(join(dir, 'roles', 'book1.md'), 'utf8'), '本书角色')
  await store.clear('book', 'book1')
  assert.deepEqual(await store.read('book', 'book1'), { text: '', characters: 0 })
})

test('role_migrates_legacy_memory_role', async t => {
  const dir = await tempDir(t)
  await mkdir(join(dir, 'memory', '.history', 'role'), { recursive: true })
  await writeFile(join(dir, 'memory', 'role.md'), '旧角色', 'utf8')
  await writeFile(join(dir, 'memory', '.history', 'role', '1-a.md'), '更旧角色', 'utf8')
  const store = createRoleStore(dir)
  assert.equal((await store.read('global')).text, '旧角色')
  assert.equal(await readFile(join(dir, 'roles', 'global.md'), 'utf8'), '旧角色')
  assert.equal((await store.listHistory('global'))[0].text, '更旧角色')
})

test('reader_memory_no_longer_exposes_role_scope', async t => {
  const dir = await tempDir(t)
  const app = createApp({ dataDir: dir })
  try {
    const tool = app.modules.flatMap(module => module.tools).find(item => item.name === 'reader_memory')
    assert.ok(tool)
    const scope = (tool.parameters as any).properties.scope
    assert.deepEqual(scope.enum, ['book', 'reader'])
  } finally {
    await app.dispose()
  }
})

test('role_resolution_priority', () => {
  const base = { enabled: true, bookEnabled: true, globalText: '全局', bookText: '本书', language: 'zh' as const }
  assert.deepEqual(resolveRole(base), { text: '本书', source: 'book' })
  assert.deepEqual(resolveRole({ ...base, bookText: '  ' }), { text: '全局', source: 'global' })
  assert.deepEqual(resolveRole({ ...base, bookEnabled: false }), { text: '全局', source: 'global' })
  assert.deepEqual(resolveRole({ ...base, globalText: '', bookText: '' }), { text: DEFAULT_ROLE.zh, source: 'default' })
  assert.deepEqual(resolveRole({ ...base, enabled: false }), { text: DEFAULT_ROLE.zh, source: 'default' })
})

test('role_context_wraps_and_truncates', () => {
  const text = buildRoleContext({ text: '你是林黛玉', source: 'global', language: 'zh' })
  assert.match(text, /^<reading_role>\n/)
  assert.match(text, /以该角色的身份、知识边界、语气和思考方式回应/)
  assert.match(text, /你是林黛玉/)
  assert.match(text, /<\/reading_role>$/)

  const huge = buildRoleContext({ text: '甲'.repeat(4000), source: 'book', language: 'zh' })
  assert.ok(huge.length <= 1200, String(huge.length))
  assert.match(huge, /<\/reading_role>$/)
})

test('role_rpc_roundtrip_and_context', async t => {
  const { library, data } = await makeLibrary(t)
  const api = createReaderApi({ ctx: fakeContext(), dataDir: data })
  const state = await api.configureLibrary({ path: library })
  const bookId = state.books[0].id
  await api.setCompanionContext({ sessionId: 's1', bookId, title: 'demo', chapter: 'c001' })

  const initial = await api.role({ action: 'status', bookId })
  assert.equal(initial.enabled, true)
  assert.equal(initial.effectiveSource, 'default')
  assert.equal(initial.effectiveText, DEFAULT_ROLE.zh)
  assert.match(api.roleContextOf('s1'), /未设置自定义角色/)

  const global = await api.role({ action: 'write', bookId, scope: 'global', text: '全局角色' })
  assert.equal(global.globalText, '全局角色')
  assert.equal(global.effectiveSource, 'global')
  const updated = await api.role({ action: 'write', bookId, scope: 'global', text: '全局角色二' })
  assert.equal(updated.globalHistory[0].text, '全局角色')
  assert.match(api.roleContextOf('s1'), /全局角色二/)
  assert.match(api.roleContextOf('no-book'), /DSH 阅读器中的阅读助手/)
  assert.doesNotMatch(api.roleContextOf('no-book'), /全局角色二/)

  const book = await api.role({ action: 'write', bookId, scope: 'book', text: '本书角色' })
  assert.equal(book.effectiveSource, 'global')
  const enabled = await api.role({ action: 'setBookEnabled', bookId, enabled: true })
  assert.equal(enabled.effectiveSource, 'book')
  assert.match(api.roleContextOf('s1'), /本书角色/)

  const disabled = await api.role({ action: 'setEnabled', bookId, enabled: false })
  assert.equal(disabled.effectiveSource, 'default')
  assert.doesNotMatch(api.roleContextOf('s1'), /本书角色|全局角色/)

  const history = await api.role({ action: 'status', bookId })
  const id = history.globalHistory[0].id
  const restored = await api.role({ action: 'historyRestore', bookId, scope: 'global', id })
  assert.equal(restored.globalText, '全局角色')
})
