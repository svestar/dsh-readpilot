import { readdir } from 'node:fs/promises'
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

  function cardName(scope: RoleScope, bookId?: string): string {
    if (scope === 'global') return GLOBAL_CARD
    if (typeof bookId !== 'string' || !BOOK_ID_PATTERN.test(bookId) || bookId === GLOBAL_CARD) {
      throw new CardStoreError('invalid-role-book', 'bookId 不合法')
    }
    return bookId
  }

  return {
    async read(scope, bookId) {
      return store.read(cardName(scope, bookId))
    },
    async write(scope, text, bookId) {
      return store.write(cardName(scope, bookId), text)
    },
    async clear(scope, bookId) {
      return store.clear(cardName(scope, bookId))
    },
    async listHistory(scope, bookId) {
      return store.listHistory(cardName(scope, bookId))
    },
    async readHistory(scope, id, bookId) {
      return store.readHistory(cardName(scope, bookId), id)
    },
    async restoreHistory(scope, id, bookId) {
      return store.restoreHistory(cardName(scope, bookId), id)
    },
    async removeHistory(scope, id, bookId) {
      return store.removeHistory(cardName(scope, bookId), id)
    },
    async clearHistory(scope, bookId) {
      return store.clearHistory(cardName(scope, bookId))
    },
    async undo(scope, bookId) {
      return store.undo(cardName(scope, bookId))
    },
    async readAll() {
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
