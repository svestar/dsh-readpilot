import test from 'node:test'
import assert from 'node:assert/strict'
import { access, mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createLibraryService, type LibraryService } from '../src/host/modules/library/service.ts'
import type { CompanionSettings } from '../src/shared/contracts/companion.ts'

const COMPANION: CompanionSettings = {
  notes: {},
  memory: { mode: 'off', books: {} },
  autoApplyNotes: false,
}

function fakeContext() {
  const workspaces: any[] = []
  return {
    workspaces,
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

function createService(dataDir: string, ctx: any): LibraryService {
  return createLibraryService({
    dataDir,
    ctx,
    notes: async () => [],
    noteFiles: async () => [],
    progress: async () => ({}),
    sessions: async () => ({}),
    companion: async () => COMPANION,
    archivedSessionIds: () => ctx.get('workspaceRegistry')?.archivedSessionIds ?? [],
  })
}

test('library_service_configure_state_and_meta', async t => {
  const root = await mkdtemp(join(tmpdir(), 'dsh-readpilot-library-service-'))
  t.after(() => rm(root, { recursive: true, force: true }))
  const library = join(root, 'books')
  const dataDir = join(root, 'data')
  await mkdir(library, { recursive: true })
  await writeFile(join(library, 'a.txt'), '第一章 开始\n\n正文', 'utf8')
  await writeFile(join(library, 'b.md'), '# 第一章\n\n正文', 'utf8')

  const ctx = fakeContext()
  const service = createService(dataDir, ctx)
  try {
    const state = await service.configure({ path: library })
    assert.equal(ctx.workspaces.length, 1)
    assert.equal(state.books.length, 2)
    assert.ok(state.settings.workspaceId)

    const bookId = state.books[0].id
    await service.setBookTags({ bookId, tags: ['技术', '技术', '待读'] })
    await service.setBookStatus({ bookId, status: 'reading' })
    await service.setBookRating({ bookId, rating: 4 })
    const next = await service.state()
    assert.deepEqual(next.tags[bookId], ['技术', '待读'])
    assert.equal(next.status[bookId], 'reading')
    assert.equal(next.rating[bookId], 4)

    await assert.rejects(() => service.resolveBook('missing'), /书库中找不到/)
  } finally {
    await service.dispose()
  }
})

test('library_service_deletes_duplicate_copy', async t => {
  const root = await mkdtemp(join(tmpdir(), 'dsh-readpilot-library-service-'))
  t.after(() => rm(root, { recursive: true, force: true }))
  const library = join(root, 'books')
  const dataDir = join(root, 'data')
  await mkdir(library, { recursive: true })
  await writeFile(join(library, 'a.txt'), 'same duplicate content', 'utf8')
  await writeFile(join(library, 'b.txt'), 'same duplicate content', 'utf8')

  const service = createService(dataDir, fakeContext())
  try {
    const state = await service.configure({ path: library })
    assert.equal(state.books.length, 2)
    const duplicate = state.books.find(book => book.duplicateOf)
    assert.ok(duplicate)

    const next = await service.deleteDuplicate({ bookId: duplicate.id })
    assert.equal(next.books.length, 1)
    await assert.rejects(() => access(duplicate.path), /ENOENT/)
  } finally {
    await service.dispose()
  }
})
