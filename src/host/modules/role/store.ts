import { cp, readFile, readdir } from 'node:fs/promises'
import { join } from 'node:path'
import type { RoleScope } from '../../../shared/contracts/role.ts'
import {
  CardStoreError,
  createCardStore,
  type CardHistoryEntry,
  type CardValue,
} from '../../lib/card-store.ts'

const ROLE_DIR = 'roles'
const GLOBAL_CARD = 'global'
const BOOK_ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/

export interface RoleStore {
  read(scope: RoleScope, bookId?: string): Promise<CardValue>
  write(scope: RoleScope, text: string, bookId?: string): Promise<CardValue>
  clear(scope: RoleScope, bookId?: string): Promise<void>
  listHistory(scope: RoleScope, bookId?: string): Promise<CardHistoryEntry[]>
  readHistory(scope: RoleScope, id: string, bookId?: string): Promise<CardHistoryEntry>
  restoreHistory(scope: RoleScope, id: string, bookId?: string): Promise<CardValue>
  removeHistory(scope: RoleScope, id: string, bookId?: string): Promise<boolean>
  clearHistory(scope: RoleScope, bookId?: string): Promise<number>
  undo(scope: RoleScope, bookId?: string): Promise<CardValue>
  readAll(): Promise<{ global: CardValue; books: Record<string, CardValue> }>
}

export function createRoleStore(dataDir: string): RoleStore {
  const root = join(dataDir, ROLE_DIR)
  const store = createCardStore(root, {
    maxCharacters: 600,
    namePattern: BOOK_ID_PATTERN,
    invalidNameCode: 'invalid-role-book',
    tooLargeCode: 'role-too-large',
    invalidContentCode: 'invalid-role',
    invalidPathCode: 'invalid-role',
  })
  let migration: Promise<void> | null = null

  function cardName(scope: RoleScope, bookId?: string): string {
    if (scope === 'global') return GLOBAL_CARD
    if (typeof bookId !== 'string' || !BOOK_ID_PATTERN.test(bookId) || bookId === GLOBAL_CARD) {
      throw new CardStoreError('invalid-role-book', 'bookId 不合法')
    }
    return bookId
  }

  async function migrateLegacyRole(): Promise<void> {
    const current = await store.read(GLOBAL_CARD)
    if (current.text) return
    let legacy: string
    try {
      legacy = await readFile(join(dataDir, 'memory', 'role.md'), 'utf8')
    } catch {
      return
    }
    if (legacy.trim()) await store.write(GLOBAL_CARD, legacy)
    const source = join(dataDir, 'memory', '.history', 'role')
    const target = join(root, '.history', GLOBAL_CARD)
    try {
      const entries = await readdir(target)
      if (entries.length > 0) return
    } catch {
      // No migrated history yet.
    }
    try {
      await cp(source, target, { recursive: true })
    } catch {
      // Legacy snapshots are optional; the current card is already preserved.
    }
  }

  function ensureMigrated(): Promise<void> {
    if (!migration) migration = migrateLegacyRole()
    return migration
  }

  return {
    async read(scope, bookId) {
      if (scope === 'global') await ensureMigrated()
      return store.read(cardName(scope, bookId))
    },
    async write(scope, text, bookId) {
      if (scope === 'global') await ensureMigrated()
      return store.write(cardName(scope, bookId), text)
    },
    async clear(scope, bookId) {
      if (scope === 'global') await ensureMigrated()
      return store.clear(cardName(scope, bookId))
    },
    async listHistory(scope, bookId) {
      if (scope === 'global') await ensureMigrated()
      return store.listHistory(cardName(scope, bookId))
    },
    async readHistory(scope, id, bookId) {
      if (scope === 'global') await ensureMigrated()
      return store.readHistory(cardName(scope, bookId), id)
    },
    async restoreHistory(scope, id, bookId) {
      if (scope === 'global') await ensureMigrated()
      return store.restoreHistory(cardName(scope, bookId), id)
    },
    async removeHistory(scope, id, bookId) {
      if (scope === 'global') await ensureMigrated()
      return store.removeHistory(cardName(scope, bookId), id)
    },
    async clearHistory(scope, bookId) {
      if (scope === 'global') await ensureMigrated()
      return store.clearHistory(cardName(scope, bookId))
    },
    async undo(scope, bookId) {
      if (scope === 'global') await ensureMigrated()
      return store.undo(cardName(scope, bookId))
    },
    async readAll() {
      await ensureMigrated()
      const global = await store.read(GLOBAL_CARD)
      const books: Record<string, CardValue> = {}
      let entries: string[]
      try {
        entries = await readdir(root)
      } catch {
        return { global, books }
      }
      for (const entry of entries) {
        if (!entry.endsWith('.md') || entry === `${GLOBAL_CARD}.md`) continue
        const bookId = entry.slice(0, -'.md'.length)
        if (!BOOK_ID_PATTERN.test(bookId)) continue
        const card = await store.read(bookId)
        if (card.text) books[bookId] = card
      }
      return { global, books }
    },
  }
}
