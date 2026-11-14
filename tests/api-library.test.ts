import test from 'node:test'
import assert from 'node:assert/strict'
import { copyFile, mkdir, mkdtemp, readFile, rename, rm, stat, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createReaderApi } from '../src/host/app.ts'
import { fakeContext, makeLibrary } from './support/api-helpers.ts'
test('book_tags_persist_and_validate', async t => {
  const { library, data } = await makeLibrary(t)
  const api = createReaderApi({ ctx: fakeContext(), dataDir: data })
  const state = await api.configureLibrary({ path: library })
  const bookId = state.books[0].id

  await api.setBookTags({ bookId, tags: ['技术', '技术', '待读'] })
  assert.deepEqual((await api.state()).tags[bookId], ['技术', '待读'])

  const reloaded = createReaderApi({ ctx: fakeContext(), dataDir: data })
  assert.deepEqual((await reloaded.state()).tags[bookId], ['技术', '待读'])

  await reloaded.setBookTags({ bookId, tags: [] })
  assert.equal((await reloaded.state()).tags[bookId], undefined)
  await assert.rejects(
    () => reloaded.setBookTags({ bookId, tags: ['x'.repeat(25)] }),
    /24/,
  )
})

test('progress_percent_persists', async t => {
  const { library, data } = await makeLibrary(t)
  const api = createReaderApi({ ctx: fakeContext(), dataDir: data })
  const state = await api.configureLibrary({ path: library })
  const bookId = state.books[0].id
  await api.saveReadingProgress({ bookId, chapterId: 'c002', chapterTitle: '第二章', chapterFraction: 0.25, percent: 42.5 })
  const progress = (await api.state()).progress[bookId]
  assert.equal(progress.chapterId, 'c002')
  assert.equal(progress.percent, 42.5)
  assert.equal(progress.chapterFraction, 0.25)
})

test('configure_creates_workspace', async t => {
  const { library, data } = await makeLibrary(t)
  const ctx = fakeContext()
  const api = createReaderApi({ ctx, dataDir: data })

  const first = await api.configureLibrary({ path: library })
  assert.ok(first.settings.workspaceId)
  assert.equal(ctx.workspaces.length, 1)
  assert.equal(first.books.length, 1)
  const promptFile = await readFile(join(library, 'AGENTS.md'), 'utf8')
  assert.match(promptFile, /dsh-readpilot:prompt:begin/)
  assert.equal((await api.state()).books.length, 1)

  const second = await api.configureLibrary({ path: library })
  assert.equal(ctx.workspaces.length, 1)
  assert.equal(second.settings.workspaceId, first.settings.workspaceId)
})

test('session_mapping_persists', async t => {
  const { library, data } = await makeLibrary(t)
  const api = createReaderApi({ ctx: fakeContext(), dataDir: data })
  const state = await api.configureLibrary({ path: library })
  const bookId = state.books[0].id
  await api.setCompanionSession({ bookId, sessionId: 'session-1' })

  const reloaded = createReaderApi({ ctx: fakeContext(), dataDir: data })
  const next = await reloaded.state()
  assert.equal(next.sessions[bookId].sessionId, 'session-1')
  await reloaded.setCompanionSession({ bookId, sessionId: null })
  assert.equal((await reloaded.state()).sessions[bookId], undefined)
})

test('search_returns_locator', async t => {
  const { library, data } = await makeLibrary(t)
  const api = createReaderApi({ ctx: fakeContext(), dataDir: data })
  const state = await api.configureLibrary({ path: library })
  const bookId = state.books[0].id
  const opened = await api.open({ bookId })
  assert.equal(opened.supported, true)
  assert.equal(opened.toc.length, 2)

  const result = await api.search({ bookId, query: '再见' })
  assert.equal(result.matches.length, 1)
  assert.equal(result.booksScanned, 1)
  assert.equal(result.booksTotal, 1)
  assert.equal(result.truncated, false)
  assert.match(result.matches[0].locator, /:c002:/)
  assert.match(result.matches[0].jumpUrl, /dsh-readpilot\.invalid\/jump\?book=/)
  assert.equal(result.matches[0].chapterTitle, '第二章 继续')
})

test('rename_preserves_book_id_and_notes', async t => {
  const { library, data } = await makeLibrary(t)
  const api = createReaderApi({ ctx: fakeContext(), dataDir: data })
  const state = await api.configureLibrary({ path: library })
  const bookId = state.books[0].id
  await api.handleRpc('notes', {
    action: 'add',
    bookId,
    chapterId: 'c001',
    blockIndex: 0,
    offset: 0,
    quote: '测试引用',
    note: '改名后仍在',
  })

  await rename(join(library, 'demo.txt'), join(library, 'renamed.txt'))
  const after = await api.rescan()
  assert.equal(after.books.length, 1)
  assert.equal(after.books[0].id, bookId)
  assert.equal(after.books[0].path, join(library, 'renamed.txt'))
  const notes = await api.handleRpc('notes', { action: 'list', bookId })
  assert.equal(notes.value.notes.length, 1)
})

test('duplicate_with_user_data_cannot_delete', async t => {
  const { library, data } = await makeLibrary(t)
  const api = createReaderApi({ ctx: fakeContext(), dataDir: data })
  await api.configureLibrary({ path: library })
  await copyFile(join(library, 'demo.txt'), join(library, 'demo-copy.txt'))
  const duplicated = await api.rescan()
  const duplicate = duplicated.books.find(book => book.duplicateOf)!
  await api.handleRpc('notes', {
    action: 'add',
    bookId: duplicate.id,
    chapterId: 'c001',
    blockIndex: 0,
    offset: 0,
    quote: '副本引用',
    note: '副本笔记',
  })
  await assert.rejects(
    () => api.deleteDuplicate({ bookId: duplicate.id }),
    /不能直接删除/,
  )
})

test('duplicate_copy_can_be_deleted', async t => {
  const { library, data } = await makeLibrary(t)
  const api = createReaderApi({ ctx: fakeContext(), dataDir: data })
  const state = await api.configureLibrary({ path: library })
  const canonicalId = state.books[0].id
  await copyFile(join(library, 'demo.txt'), join(library, 'demo-copy.txt'))

  const duplicated = await api.rescan()
  assert.equal(duplicated.books.length, 2)
  const duplicate = duplicated.books.find(book => book.duplicateOf)!
  assert.equal(duplicate.duplicateOf, canonicalId)

  const deleted = await api.deleteDuplicate({ bookId: duplicate.id })
  assert.deepEqual(deleted.books.map(book => book.id), [canonicalId])
  await assert.rejects(() => stat(join(library, 'demo-copy.txt')))
})

test('delete_primary_promotes_copy_and_keeps_notes', async t => {
  const { library, data } = await makeLibrary(t)
  const api = createReaderApi({ ctx: fakeContext(), dataDir: data })
  const state = await api.configureLibrary({ path: library })
  const canonicalId = state.books[0].id
  await api.handleRpc('notes', {
    action: 'add',
    bookId: canonicalId,
    chapterId: 'c001',
    blockIndex: 0,
    offset: 0,
    quote: '主记录引用',
    note: '主记录笔记',
  })
  await copyFile(join(library, 'demo.txt'), join(library, 'demo-copy.txt'))
  await api.rescan()

  const after = await api.deleteDuplicate({ bookId: canonicalId })
  assert.equal(after.books.length, 1)
  assert.equal(after.books[0].id, canonicalId)
  assert.equal(after.books[0].path, join(library, 'demo-copy.txt'))
  const notes = await api.handleRpc('notes', { action: 'list', bookId: canonicalId })
  assert.equal(notes.value.notes.length, 1)
})

test('library_search_reports_scan_scope', async t => {
  const root = await mkdtemp(join(tmpdir(), 'dsh-readpilot-api-'))
  const library = join(root, 'books')
  const data = join(root, 'data')
  await mkdir(library, { recursive: true })
  t.after(() => rm(root, { recursive: true, force: true }))
  for (let index = 1; index <= 21; index += 1) {
    await writeFile(
      join(library, `book-${String(index).padStart(2, '0')}.txt`),
      `第一章 开始\n\n唯一关键词 ${index}`,
      'utf8',
    )
  }
  const api = createReaderApi({ ctx: fakeContext(), dataDir: data })
  await api.configureLibrary({ path: library })

  const result = await api.search({ query: '唯一关键词', limit: 50 })
  assert.equal(result.booksTotal, 21)
  assert.equal(result.booksScanned, 20)
  assert.equal(result.matches.length, 20)
  assert.equal(result.truncated, true)
  assert.equal(result.unreadable, false)
})

test('library_scan_is_cached_until_rescan', async t => {
  const { library, data } = await makeLibrary(t)
  const api = createReaderApi({ ctx: fakeContext(), dataDir: data })
  const configured = await api.configureLibrary({ path: library })
  assert.equal(configured.books.length, 1)

  await writeFile(join(library, 'added.txt'), '第一章 新书\n\n新增内容', 'utf8')
  const cached = await api.state()
  assert.equal(cached.books.length, 1)

  const forced = await api.handleRpc('rescan', {})
  assert.equal(forced.ok, true)
  assert.equal((forced as any).value.books.length, 2)
})
test('library_scan_watch_invalidates_cache', async t => {
  const { library, data } = await makeLibrary(t)
  const callbacks: Array<() => void> = []
  let closed = false
  const fs = {
    async resolve(path: string) {
      return { targetKey: path, displayPath: path }
    },
    async watch(_target: any, changed: () => void) {
      callbacks.push(changed)
      return async () => { closed = true }
    },
  }
  const api = createReaderApi({ ctx: fakeContext({ fs }), dataDir: data })
  const configured = await api.configureLibrary({ path: library })
  assert.equal(configured.books.length, 1)
  assert.equal(callbacks.length, 1)

  await writeFile(join(library, 'watched.txt'), '第一章 新书\n\n内容', 'utf8')
  assert.equal((await api.state()).books.length, 1)
  callbacks[0]()
  assert.equal((await api.state()).books.length, 2)

  await api.dispose()
  assert.equal(closed, true)
})

test('archived_session_is_reported_and_filtered_from_state', async t => {
  const { library, data } = await makeLibrary(t)
  const ctx = fakeContext()
  const api = createReaderApi({ ctx, dataDir: data })
  const state = await api.configureLibrary({ path: library })
  const bookId = state.books[0].id
  await api.setCompanionSession({ bookId, sessionId: 's1' })
  assert.equal((await api.sessionAlive({ sessionId: 's1' })).alive, true)
  ctx.archivedSessionIds.push('s1')
  assert.equal((await api.sessionAlive({ sessionId: 's1' })).alive, false)
  const refreshed = await api.state()
  assert.equal(refreshed.sessions[bookId], undefined)
})
test('book_assets_serve_library_images_and_rewrite_chapter_urls', async t => {
  const { library, data } = await makeLibrary(t)
  const api = createReaderApi({ ctx: fakeContext(), dataDir: data })
  const state = await api.configureLibrary({ path: library })
  const bookId = state.books[0].id
  await writeFile(join(library, 'cover.png'), Buffer.from('png-bytes'), 'utf8')

  const asset = await api.bookAsset({ bookId, path: 'cover.png' })
  assert.equal(asset.contentType, 'image/png')
  assert.equal(asset.bytes.toString('utf8'), 'png-bytes')
  await assert.rejects(
    () => api.bookAsset({ bookId, path: '../outside.png' }),
    /越界|invalid-path/,
  )

  await writeFile(join(library, 'pic.md'), '![图](cover.png)\n\n正文。', 'utf8')
  const refreshed = await api.handleRpc('rescan', {})
  assert.equal(refreshed.ok, true)
  const markdown = (refreshed as any).value.books.find((book: any) => book.title === 'pic')
  assert.ok(markdown)
  const opened = await api.open({ bookId: markdown.id })
  const content = await api.chapter({ bookId: markdown.id, chapterId: opened.toc[0].id })
  assert.equal(content.blocks[0].type, 'image')
  assert.match(content.blocks[0].src!, /^\/api\/dsh-readpilot\/book-asset\?bookId=/)
})
