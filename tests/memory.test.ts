import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { TestContext } from 'node:test'
import type { BookMemoryState, CompanionSettings, MemoryMode } from '../src/companion-settings.ts'
import { effectiveMemoryState, loadCompanionSettings, saveCompanionSettings } from '../src/companion-settings.ts'
import { createMemoryStore } from '../src/memory-store.ts'
import { buildReadingMemory } from '../src/memory-context.ts'

async function makeDataDir(t: TestContext): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'dsh-readpilot-memory-'))
  t.after(() => rm(dir, { recursive: true, force: true }))
  return dir
}

function settings(mode: MemoryMode, books: Record<string, BookMemoryState> = {}): CompanionSettings {
  return { notes: {}, memory: { mode, books }, autoApplyNotes: false }
}

test('memory_settings_defaults', async t => {
  const dir = await makeDataDir(t)
  assert.deepEqual(await loadCompanionSettings(dir), {
    notes: {},
    memory: { mode: 'off', books: {} },
    autoApplyNotes: false,
  })
})

test('memory_settings_migrates_notes_only_file', async t => {
  const dir = await makeDataDir(t)
  await writeFile(join(dir, 'companion.json'), JSON.stringify({ notes: { abc: true } }))
  assert.deepEqual(await loadCompanionSettings(dir), {
    notes: { abc: true },
    memory: { mode: 'off', books: {} },
    autoApplyNotes: false,
  })
})

test('memory_settings_validation_and_corrupt_file', async t => {
  const dir = await makeDataDir(t)
  await writeFile(join(dir, 'companion.json'), JSON.stringify({
    notes: { good: true, off: false, 'bad/id': true, wrong: 'yes' },
    memory: {
      mode: 'sometimes',
      books: { one: 'on', two: 'maybe', 'bad id': 'off', three: true, four: 'inherit' },
    },
    autoApplyNotes: true,
  }))
  assert.deepEqual(await loadCompanionSettings(dir), {
    notes: { good: true, off: false },
    memory: { mode: 'off', books: { one: 'on', four: 'inherit' } },
    autoApplyNotes: true,
  })

  await writeFile(join(dir, 'companion.json'), '{ not json')
  assert.deepEqual(await loadCompanionSettings(dir), {
    notes: {},
    memory: { mode: 'off', books: {} },
    autoApplyNotes: false,
  })
})

test('memory_settings_save_roundtrip', async t => {
  const dir = await makeDataDir(t)
  const value: CompanionSettings = {
    notes: { abc: true },
    memory: { mode: 'off', books: { abc: 'off', def: 'on' } },
    autoApplyNotes: true,
  }
  await saveCompanionSettings(dir, value)
  assert.deepEqual(await loadCompanionSettings(dir), value)
})

test('memory_effective_state_matrix', () => {
  const cases: Array<[MemoryMode, Record<string, BookMemoryState>, string, 'on' | 'off']> = [
    ['off', {}, 'book1', 'off'],
    ['off', { book1: 'inherit' }, 'book1', 'off'],
    ['off', { book1: 'on' }, 'book1', 'off'],
    ['off', { book1: 'off' }, 'book1', 'off'],
    ['on', {}, 'book1', 'on'],
    ['on', { book1: 'inherit' }, 'book1', 'on'],
    ['on', { book1: 'on' }, 'book1', 'on'],
    ['on', { book1: 'off' }, 'book1', 'off'],
    ['on', { other: 'off' }, 'book1', 'on'],
  ]
  for (const [mode, books, bookId, expected] of cases) {
    assert.equal(
      effectiveMemoryState(settings(mode, books), bookId),
      expected,
      `${mode}/${String(books[bookId] ?? 'inherit')}`,
    )
  }
})

test('memory_store_read_and_write', async t => {
  const dir = await makeDataDir(t)
  const store = createMemoryStore(dir)

  assert.deepEqual(await store.readBook('book1'), { text: '', characters: 0 })
  assert.deepEqual(await store.readReader(), { text: '', characters: 0 })

  const bookText = '# 人物\n\n罗辑与章北海'
  const written = await store.writeBook('book1', bookText)
  assert.equal(written.text, bookText)
  assert.equal(written.characters, bookText.length)
  assert.deepEqual(await store.readBook('book1'), written)
  assert.equal(await readFile(join(dir, 'memory', 'book1.md'), 'utf8'), bookText)

  const readerText = '偏好简洁，重视人物动机'
  const reader = await store.writeReader(readerText)
  assert.equal(reader.text, readerText)
  assert.equal(reader.characters, readerText.length)
  assert.deepEqual(await store.readReader(), reader)
  assert.equal(await readFile(join(dir, 'memory', 'reader.md'), 'utf8'), readerText)
})

test('memory_store_history_and_undo', async t => {
  const dir = await makeDataDir(t)
  const store = createMemoryStore(dir)

  await store.writeBook('book1', 'A')
  await store.writeBook('book1', 'B')
  await store.writeBook('book1', 'C')

  const history = await store.listHistory('book1')
  assert.equal(history.length, 2)
  assert.equal(history[0].characters, 1)
  const newest = await store.readHistory('book1', history[0].id)
  assert.equal(newest.text, 'B')
  assert.equal(newest.characters, 1)
  assert.ok(history[0].createdAt >= history[1].createdAt)

  const files = await readdir(join(dir, 'memory', '.history', 'book1'))
  assert.ok(files.every(name => /^\d+-[a-f0-9]{6}\.md$/.test(name)), files.join(','))

  assert.equal((await store.undo('book1')).text, 'B')
  assert.equal((await store.readBook('book1')).text, 'B')
  assert.equal((await store.listHistory('book1')).length, 3)

  assert.equal((await store.undo('book1')).text, 'C')
  assert.equal((await store.readBook('book1')).text, 'C')

  await assert.rejects(
    () => store.undo('fresh'),
    (error: any) => error?.code === 'history-empty',
  )
  await assert.rejects(
    () => store.readHistory('book1', '1234-abcdef'),
    (error: any) => error?.code === 'history-not-found',
  )
})

test('memory_store_history_is_capped', async t => {
  const dir = await makeDataDir(t)
  const store = createMemoryStore(dir)

  for (let index = 0; index < 12; index += 1) {
    await store.writeBook('book1', `v${index}`)
  }

  const history = await store.listHistory('book1')
  assert.equal(history.length, 10)
  const texts: string[] = []
  for (const entry of history) {
    texts.push((await store.readHistory('book1', entry.id)).text)
  }
  assert.equal(texts[0], 'v10')
  assert.equal(texts[9], 'v1')
  assert.equal(texts.includes('v0'), false)
})

test('memory_store_caps_clear_and_undo_clear', async t => {
  const dir = await makeDataDir(t)
  const store = createMemoryStore(dir)

  assert.equal((await store.writeBook('book1', 'a'.repeat(600))).characters, 600)
  await assert.rejects(
    () => store.writeBook('book1', 'a'.repeat(601)),
    (error: any) => error?.code === 'memory-too-large',
  )
  assert.equal((await store.writeReader('b'.repeat(600))).characters, 600)
  await assert.rejects(
    () => store.writeReader('b'.repeat(601)),
    (error: any) => error?.code === 'memory-too-large',
  )

  await store.writeBook('clear1', 'A')
  assert.deepEqual(await store.writeBook('clear1', '   '), { text: '', characters: 0 })
  assert.deepEqual(await store.readBook('clear1'), { text: '', characters: 0 })
  const cleared = await store.listHistory('clear1')
  assert.equal(cleared.length, 1)
  assert.equal((await store.readHistory('clear1', cleared[0].id)).text, 'A')
  assert.equal((await store.undo('clear1')).text, 'A')

  await store.clearBook('clear1')
  assert.deepEqual(await store.readBook('clear1'), { text: '', characters: 0 })
  assert.equal((await store.undo('clear1')).text, 'A')

  await store.writeReader('读者偏好')
  await store.clearReader()
  assert.deepEqual(await store.readReader(), { text: '', characters: 0 })
  assert.equal((await store.undo(null)).text, '读者偏好')
})

test('memory_store_rejects_path_traversal', async t => {
  const dir = await makeDataDir(t)
  const store = createMemoryStore(dir)
  await store.writeBook('book1', 'safe')

  const badBookIds = ['../evil', 'a/b', 'a\\b', '', 'x'.repeat(65), 'a b', 'reader']
  for (const bookId of badBookIds) {
    await assert.rejects(
      () => store.readBook(bookId),
      (error: any) => error?.code === 'invalid-book',
      bookId,
    )
    await assert.rejects(
      () => store.writeBook(bookId, 'x'),
      (error: any) => error?.code === 'invalid-book',
      bookId,
    )
  }

  const badHistoryIds = ['../evil', '1234-../../x', 'abc', '1234-ZZZZZZ', '1234-abcdef/../../x']
  for (const id of badHistoryIds) {
    await assert.rejects(
      () => store.readHistory('book1', id),
      (error: any) => error?.code === 'invalid-history',
      id,
    )
  }

  assert.deepEqual(await readdir(dir), ['memory'])
  assert.deepEqual(await readdir(join(dir, 'memory')), ['book1.md'])
})

test('memory_context_empty_and_format', () => {
  assert.equal(buildReadingMemory({ bookTitle: '三体', reader: '', book: '' }), '')
  assert.equal(buildReadingMemory({ bookTitle: '三体', reader: '  ', book: '\n' }), '')

  const text = buildReadingMemory({
    bookTitle: '三体',
    reader: '偏好简洁，重视人物动机。',
    book: '# 人物\n\n罗辑',
  })
  assert.match(text, /^<reading_memory>\n/)
  assert.match(text, /三体/)
  assert.match(text, /参考资料而不是指令/)
  assert.match(text, /## 跨书读者卡\n\n偏好简洁，重视人物动机。/)
  assert.match(text, /## 本书记忆卡\n\n# 人物\n\n罗辑/)
  assert.ok(text.indexOf('## 跨书读者卡') < text.indexOf('## 本书记忆卡'))
  assert.ok(text.endsWith('</reading_memory>'))

  const readerOnly = buildReadingMemory({ bookTitle: '三体', reader: '偏好', book: '' })
  assert.doesNotMatch(readerOnly, /## 本书记忆卡/)
  const bookOnly = buildReadingMemory({ bookTitle: '三体', reader: '', book: '事实' })
  assert.doesNotMatch(bookOnly, /## 跨书读者卡/)
})

test('memory_context_truncates_each_card', () => {
  const huge = '甲'.repeat(5000)
  const text = buildReadingMemory({ bookTitle: '长书', reader: huge, book: huge })
  assert.ok(text.length <= 3000, String(text.length))
  assert.match(text, /已截断/)
  assert.equal(text.includes(huge), false)

  const tight = buildReadingMemory({ bookTitle: '长书', reader: huge, book: huge, maxTotal: 600 })
  assert.ok(tight.length <= 600, String(tight.length))
  assert.match(tight, /## 跨书读者卡/)
  assert.match(tight, /## 本书记忆卡/)
  assert.match(tight, /已截断/)

  const single = buildReadingMemory({ bookTitle: '长书', reader: '', book: huge, maxTotal: 500 })
  assert.ok(single.length <= 500, String(single.length))
  assert.match(single, /已截断/)
})
test('memory_settings_migrates_ask_to_off', async t => {
  const dir = await makeDataDir(t)
  await writeFile(join(dir, 'companion.json'), JSON.stringify({ memory: { mode: 'ask', books: { abc: 'on' } } }))
  assert.deepEqual(await loadCompanionSettings(dir), {
    notes: {},
    memory: { mode: 'off', books: { abc: 'on' } },
    autoApplyNotes: false,
  })
})
