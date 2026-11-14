import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdir, mkdtemp, rm, truncate, utimes, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createReaderApi } from '../src/host/app.ts'
import { buildBlankPdf, fakeContext, makeLibrary } from './support/api-helpers.ts'
test('library_search_stops_at_parse_budget', async t => {
  const root = await mkdtemp(join(tmpdir(), 'dsh-readpilot-api-'))
  const library = join(root, 'books')
  const data = join(root, 'data')
  await mkdir(library, { recursive: true })
  t.after(() => rm(root, { recursive: true, force: true }))
  const large = join(library, 'large.txt')
  await writeFile(large, 'large', 'utf8')
  await truncate(large, 129 * 1024 * 1024)
  await utimes(large, new Date(0), new Date(0))
  await writeFile(join(library, 'recent.txt'), '第一章 开始\n\n唯一关键词 预算', 'utf8')
  const api = createReaderApi({ ctx: fakeContext(), dataDir: data })
  await api.configureLibrary({ path: library })

  const result = await api.search({ query: '唯一关键词', limit: 50 })
  assert.equal(result.booksTotal, 2)
  assert.equal(result.booksScanned, 1)
  assert.equal(result.matches.length, 1)
  assert.equal(result.truncated, true)
  assert.equal(result.unreadable, false)
})

test('rpc_envelope_dispatches', async t => {
  const { library, data } = await makeLibrary(t)
  const api = createReaderApi({ ctx: fakeContext(), dataDir: data })
  const configured = await api.handleRpc('configure', { path: library })
  assert.equal(configured.ok, true)
  assert.equal(configured.value.books.length, 1)

  const state = await api.handleRpc('state', null)
  assert.equal(state.ok, true)
  assert.equal(state.value.settings.libraryDir, library)

  const unknown = await api.handleRpc('missing', null)
  assert.equal(unknown.ok, false)
  assert.equal(unknown.error?.code, 'unknown-endpoint')
})

test('open_scanned_pdf_returns_visual_only', async t => {
  const root = await mkdtemp(join(tmpdir(), 'dsh-readpilot-api-'))
  const library = join(root, 'books')
  const data = join(root, 'data')
  await mkdir(library, { recursive: true })
  await writeFile(join(library, 'scan.pdf'), buildBlankPdf())
  t.after(() => rm(root, { recursive: true, force: true }))
  const api = createReaderApi({ ctx: fakeContext(), dataDir: data })
  const state = await api.configureLibrary({ path: library })
  const opened = await api.open({ bookId: state.books[0].id })
  assert.equal(opened.supported, true)
  assert.equal(opened.scanOnly, true)
  assert.equal(opened.pageCount, 1)
  assert.equal(opened.toc[0].id, 'scan')
})

test('search_all_returns_all_matches', async t => {
  const root = await mkdtemp(join(tmpdir(), 'dsh-readpilot-api-'))
  const library = join(root, 'books')
  const data = join(root, 'data')
  await mkdir(library, { recursive: true })
  const text = `第一章 开始\n\n${'目标词 '.repeat(60)}`
  await writeFile(join(library, 'many.txt'), text, 'utf8')
  t.after(() => rm(root, { recursive: true, force: true }))
  const api = createReaderApi({ ctx: fakeContext(), dataDir: data })
  const state = await api.configureLibrary({ path: library })
  const bookId = state.books[0].id
  const partial = await api.search({ bookId, query: '目标词', limit: 20 })
  assert.equal(partial.matches.length, 20)
  assert.equal(partial.truncated, true)
  const all = await api.search({ bookId, query: '目标词', limit: 0 })
  assert.equal(all.matches.length, 60)
  assert.equal(all.truncated, false)
})

test('open_and_search_use_library_title', async t => {
  const root = await mkdtemp(join(tmpdir(), 'dsh-readpilot-api-'))
  const library = join(root, 'books')
  const data = join(root, 'data')
  await mkdir(library, { recursive: true })
  await writeFile(join(library, 'library-title.md'), '---\ntitle: 元数据标题\nauthor: 作者\n---\n\n第一章 开始\n\n正文包含唯一词。', 'utf8')
  t.after(() => rm(root, { recursive: true, force: true }))
  const api = createReaderApi({ ctx: fakeContext(), dataDir: data })
  const state = await api.configureLibrary({ path: library })
  const book = state.books[0]
  assert.equal(book.title, 'library-title')
  const opened = await api.open({ bookId: book.id })
  assert.equal(opened.book.title, 'library-title')
  const found = await api.search({ query: '唯一词', limit: 10 })
  assert.equal(found.matches[0].bookTitle, 'library-title')
})
