import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { bookIdFor, findBookByKey, scanLibrary } from '../src/books/library.ts'
import { NOTES_MARKER } from '../src/notes/files.ts'

test('scan_lists_books', async t => {
  const root = await mkdtemp(join(tmpdir(), 'dsh-readpilot-library-'))
  t.after(() => rm(root, { recursive: true, force: true }))
  await writeFile(join(root, 'a.txt'), 'hello', 'utf8')
  await writeFile(join(root, 'b.md'), '# b', 'utf8')
  await writeFile(join(root, 'c.pdf'), '%PDF-1.7', 'utf8')
  await writeFile(join(root, 'skip.log'), 'ignored', 'utf8')
  await writeFile(join(root, 'AGENTS.md'), '# instructions', 'utf8')

  const books = await scanLibrary(root)
  assert.deepEqual(books.map(book => book.title).sort(), ['a', 'b', 'c'])
  assert.equal(books.find(book => book.title === 'a')!.supported, true)
  assert.equal(books.find(book => book.title === 'c')!.supported, true)
  assert.equal(findBookByKey(books, 'b')!.title, 'b')
  assert.equal(findBookByKey(books, 'missing'), undefined)
})

test('book_id_is_stable', () => {
  const first = bookIdFor('E:\\Books\\demo.txt')
  const second = bookIdFor('E:\\Books\\demo.txt')
  assert.equal(first, second)
  assert.notEqual(first, bookIdFor('E:\\Books\\other.txt'))
})

test('scan_skips_reader_notes_dir', async t => {
  const root = await mkdtemp(join(tmpdir(), 'dsh-readpilot-library-'))
  t.after(() => rm(root, { recursive: true, force: true }))
  await writeFile(join(root, 'a.txt'), 'hello', 'utf8')
  await mkdir(join(root, 'notes'), { recursive: true })
  await writeFile(join(root, 'notes', 'fake.md'), '# fake', 'utf8')

  const before = await scanLibrary(root)
  assert.ok(before.some(book => book.title === 'fake'))

  await writeFile(join(root, 'notes', NOTES_MARKER), 'dsh-readpilot notes\n', 'utf8')
  const after = await scanLibrary(root)
  assert.equal(after.some(book => book.title === 'fake'), false)
  assert.ok(after.some(book => book.title === 'a'))
})
