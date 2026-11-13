import { React } from '../common/runtime.ts'
import type { CallRpc } from '../common/types.ts'
import type { ReaderAction, ReaderActionType } from '../../reading/actions.ts'

const ACTION_TYPES: ReaderActionType[] = ['goto', 'open_panel', 'notesRefresh', 'libraryRefresh']

interface ReaderActionOptions {
  call: CallRpc
  bookId?: string | null
  types?: ReaderActionType[]
  onAction: (action: ReaderAction) => Promise<void> | void
  intervalMs?: number
}

/** Poll and execute queued agent actions for the mounted reader. */
export function useReaderActions({ call, bookId, types = ACTION_TYPES, onAction, intervalMs = 1000 }: ReaderActionOptions) {
  const handlerRef = React.useRef(onAction)
  handlerRef.current = onAction
  const busyRef = React.useRef(false)
  const failuresRef = React.useRef(0)
  const disabledRef = React.useRef(false)
  const warnedRef = React.useRef(false)

  React.useEffect(() => {
    let stopped = false
    const run = async () => {
      if (stopped || busyRef.current || disabledRef.current) return
      busyRef.current = true
      try {
        const actionTypes = bookId ? types : types.filter(type => type !== 'notesRefresh')
        const value = await call('readerActions', {
          action: 'take',
          types: actionTypes,
          ...(bookId ? { bookId } : {}),
        })
        failuresRef.current = 0
        for (const action of value.actions ?? []) {
          if (stopped) return
          try {
            await handlerRef.current(action)
          } catch (error) {
            console.warn('dsh-readpilot: reader action failed', action.type, error)
          }
        }
      } catch (error) {
        failuresRef.current += 1
        if (!warnedRef.current) {
          console.warn('dsh-readpilot: reader action poll failed', error)
          warnedRef.current = true
        }
        if (failuresRef.current >= 5) disabledRef.current = true
      } finally {
        busyRef.current = false
      }
    }
    const timer = setInterval(() => void run(), intervalMs)
    void run()
    return () => {
      stopped = true
      clearInterval(timer)
    }
  }, [bookId, call, intervalMs, types])
}
