import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createReaderApi } from '../src/host/app.ts'

function fakeContext() {
  const workspaces: any[] = []
  return {
    get(name: string) {
      if (name !== 'workspaceRegistry') return undefined
      return {
        archivedSessionIds: [],
        async resolveByPath(path: string) {
          return workspaces.find(workspace => workspace.path === path)
        },
        async create(path: string, title: string) {
          const workspace = { id: `ws-${workspaces.length + 1}`, path, title }
          workspaces.push(workspace)
          return workspace
        },
      }
    },
  }
}

function buildBlankPdf(): Buffer {
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] >>',
  ]
  const chunks: Buffer[] = []
  let offset = 0
  const write = (value: string) => {
    const bytes = Buffer.from(value, 'latin1')
    chunks.push(bytes)
    offset += bytes.length
  }
  write('%PDF-1.4\n')
  const offsets = objects.map((body, index) => {
    const start = offset
    write(`${index + 1} 0 obj\n${body}\nendobj\n`)
    return start
  })
  const xrefOffset = offset
  write(`xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`)
  for (const start of offsets) write(`${String(start).padStart(10, '0')} 00000 n \n`)
  write(`trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`)
  return Buffer.concat(chunks)
}

test('smoke: library, reading, search, annotation and progress', async t => {
  const root = await mkdtemp(join(tmpdir(), 'dsh-readpilot-smoke-'))
  t.after(() => rm(root, { recursive: true, force: true }))
  const library = join(root, 'books')
  const data = join(root, 'data')
  await mkdir(library, { recursive: true })
  await writeFile(join(library, 'demo.txt'), '第一章 开始\n\n这是冒烟测试正文。\n\n第二章 继续\n\n结束。', 'utf8')

  const api = createReaderApi({ ctx: fakeContext() as any, dataDir: data })
  const state = await api.configureLibrary({ path: library })
  assert.equal(state.books.length, 1)
  const bookId = state.books[0].id

  const opened = await api.open({ bookId })
  assert.equal(opened.supported, true)
  assert.ok(opened.toc.length >= 2)
  const chapter = await api.chapter({ bookId, chapterId: opened.toc[0].id })
  assert.match(chapter.blocks.map(block => block.text).join('\n'), /冒烟测试正文/)

  const search = await api.search({ bookId, query: '冒烟' })
  assert.equal(search.matches.length, 1)

  await api.handleRpc('notes', {
    action: 'add',
    bookId,
    chapterId: chapter.chapterId,
    blockIndex: 0,
    offset: 0,
    quote: '冒烟测试正文',
    note: 'smoke',
  })
  const notes = await api.handleRpc('notes', { action: 'list', bookId })
  assert.equal(notes.value.notes.length, 1)

  await api.saveReadingProgress({ bookId, chapterId: chapter.chapterId, percent: 25 })
  assert.equal((await api.state()).progress[bookId].percent, 25)
})

test('smoke: scanned pdf opens and renders a page', async t => {
  const root = await mkdtemp(join(tmpdir(), 'dsh-readpilot-smoke-'))
  t.after(() => rm(root, { recursive: true, force: true }))
  const library = join(root, 'books')
  const data = join(root, 'data')
  await mkdir(library, { recursive: true })
  await writeFile(join(library, 'scan.pdf'), buildBlankPdf())

  const api = createReaderApi({ ctx: fakeContext() as any, dataDir: data })
  const state = await api.configureLibrary({ path: library })
  const bookId = state.books[0].id
  const opened = await api.open({ bookId })
  assert.equal(opened.supported, true)
  assert.equal(opened.scanOnly, true)
  assert.equal(opened.pageCount, 1)

  const view = await api.pageView({ bookId, page: 1, scale: 1 })
  assert.equal(view.pageCount, 1)
  const page = await api.pdfPage({ bookId, page: 1, scale: 1 })
  assert.ok(page.png.length > 0)
})

test('smoke_markdown_inline_images_are_rewritten_to_book_assets', async t => {
  const root = await mkdtemp(join(tmpdir(), 'dsh-readpilot-smoke-'))
  t.after(() => rm(root, { recursive: true, force: true }))
  const library = join(root, 'books')
  const data = join(root, 'data')
  await mkdir(library, { recursive: true })
  await writeFile(join(library, 'demo.md'), '# 第一章\n\n第一段 ![封面](images/cover.png)', 'utf8')
  const api = createReaderApi({ ctx: fakeContext() as any, dataDir: data })
  const state = await api.configureLibrary({ path: library })
  const bookId = state.books[0].id
  const opened = await api.open({ bookId })
  const chapter = await api.chapter({ bookId, chapterId: opened.toc[0].id })
  const text = chapter.blocks.map(block => block.text).join('\n')
  assert.match(text, /\/api\/dsh-readpilot\/book-asset\?/)
  assert.match(text, /images%2Fcover\.png/)
})
