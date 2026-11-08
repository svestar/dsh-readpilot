import { randomBytes } from 'node:crypto'

export type ReaderActionType = 'goto' | 'open_panel' | 'notesRefresh' | 'libraryRefresh'

export interface ReaderAction {
  id: string
  type: ReaderActionType
  bookId?: string
  bookTitle?: string
  chapterId?: string
  offset?: number
  createdAt: number
}

export interface ReaderActionInput {
  type: ReaderActionType
  bookId?: string
  bookTitle?: string
  chapterId?: string
  offset?: number
}

export interface ReaderActionFilter {
  types?: ReaderActionType[]
  bookId?: string
}

export interface ReaderActionStore {
  push(action: ReaderActionInput): ReaderAction
  take(filter?: ReaderActionFilter): ReaderAction[]
}

const TTL_MS = 120_000
const MAX_ACTIONS = 100

export function createReaderActionStore(): ReaderActionStore {
  let queue: ReaderAction[] = []
  const prune = () => {
    const now = Date.now()
    queue = queue.filter(action => now - action.createdAt <= TTL_MS).slice(-MAX_ACTIONS)
  }
  return {
    push(action) {
      prune()
      const entry: ReaderAction = {
        ...action,
        id: `action-${randomBytes(5).toString('hex')}`,
        createdAt: Date.now(),
      }
      queue.push(entry)
      return entry
    },
    take(filter = {}) {
      prune()
      const taken: ReaderAction[] = []
      const kept: ReaderAction[] = []
      for (const action of queue) {
        if (filter.types && !filter.types.includes(action.type)) {
          kept.push(action)
          continue
        }
        if (action.type === 'notesRefresh' && filter.bookId && action.bookId && action.bookId !== filter.bookId) {
          kept.push(action)
          continue
        }
        taken.push(action)
      }
      queue = kept
      return taken
    },
  }
}
