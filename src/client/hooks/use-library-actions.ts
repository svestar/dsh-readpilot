import { React } from '../runtime.ts'
import type { StateSetter } from '../runtime.ts'
import type { CallRpc } from '../../rpc.ts'
import type { ClientBook, Snapshot } from '../types.ts'

export function useLibraryActions(call: CallRpc, setSnapshot: StateSetter<Snapshot | null>) {
  const setBookTags = React.useCallback(async (book: ClientBook, tags: string[]) => {
    const result = await call('setBookTags', { bookId: book.id, tags })
    setSnapshot(previous => previous
      ? { ...previous, tags: { ...previous.tags, [book.id]: result.tags } }
      : previous)
    return result.tags
  }, [])

  const setBookStatus = React.useCallback(async (book: ClientBook, status: string | null) => {
    const result = await call('setBookStatus', { bookId: book.id, status })
    setSnapshot(previous => {
      if (!previous) return previous
      const statuses = { ...previous.status }
      if (result.status) statuses[book.id] = result.status as any
      else delete statuses[book.id]
      return { ...previous, status: statuses }
    })
    return result.status
  }, [])

  const setBookRating = React.useCallback(async (book: ClientBook, rating: number) => {
    const result = await call('setBookRating', { bookId: book.id, rating: rating > 0 ? rating : null })
    setSnapshot(previous => {
      if (!previous) return previous
      const ratings = { ...previous.rating }
      if (result.rating !== null) ratings[book.id] = result.rating
      else delete ratings[book.id]
      return { ...previous, rating: ratings }
    })
    return result.rating
  }, [])

  const deleteDuplicate = React.useCallback(async (book: ClientBook) => {
    const next = await call('deleteDuplicate', { bookId: book.id })
    setSnapshot(next)
  }, [])

  const backupExport = React.useCallback(async () => call('backupExport'), [])
  const backupRestore = React.useCallback(async (archivePath: string, libraryPath: string) => {
    const result = await call('backupRestore', { archivePath, libraryPath })
    setSnapshot(result.state)
    return result
  }, [])

  const rememberSession = React.useCallback((bookId: string, sessionId: string) => {
    setSnapshot(previous => previous
      ? {
        ...previous,
        sessions: {
          ...previous.sessions,
          [bookId]: { sessionId, updatedAt: Date.now() },
        },
      }
      : previous)
  }, [])

  const forgetSession = React.useCallback((bookId: string) => {
    setSnapshot(previous => {
      if (!previous?.sessions?.[bookId]) return previous
      const sessions = { ...previous.sessions }
      delete sessions[bookId]
      return { ...previous, sessions }
    })
  }, [])

  return {
    setBookTags,
    setBookStatus,
    setBookRating,
    deleteDuplicate,
    backupExport,
    backupRestore,
    rememberSession,
    forgetSession,
  }
}
