import { React } from '../../runtime.ts'
import { messageOf } from '../../lib/helpers.ts'
import { useLibraryActions } from '../library/use-library-actions.ts'
import { currentReaderScreen, rememberReaderScreen } from './screen.ts'
import type { CallRpc, Screen, Snapshot, TextFn } from '../../lib/types.ts'

let cachedSnapshot: Snapshot | null = null

/** Snapshot, screen and refresh lifecycle for the reader panel. */
export function useReaderState({ call, t }: { call: CallRpc; t: TextFn }) {
  const [snapshot, setSnapshot] = React.useState<Snapshot | null>(cachedSnapshot)
  const [screenState, setScreenState] = React.useState<Screen>(currentReaderScreen)
  const setScreen = React.useCallback((next: Screen | ((previous: Screen) => Screen)) => {
    if (typeof next === 'function') {
      setScreenState(previous => {
        const value = next(previous)
        rememberReaderScreen(value)
        return value
      })
      return
    }
    rememberReaderScreen(next)
    setScreenState(next)
  }, [])
  const [busy, setBusy] = React.useState(false)
  const [error, setError] = React.useState('')

  const refresh = React.useCallback(async () => {
    setBusy(true)
    setError('')
    try {
      let value: Snapshot | null = null
      try {
        value = await call('state')
      } catch {
        // The first request can arrive while the Host connection is still warming up.
        await new Promise(resolve => setTimeout(resolve, 300))
        value = await call('state')
      }
      if (!value || typeof value !== 'object') throw new Error('阅读器状态为空')
      cachedSnapshot = value
      setSnapshot(value)
    } catch (cause) {
      setError(`${t('loadFailed')}：${messageOf(cause)}`)
    } finally {
      setBusy(false)
    }
  }, [call, t])

  React.useEffect(() => {
    cachedSnapshot = snapshot
  }, [snapshot])

  React.useEffect(() => {
    void refresh()
  }, [refresh])

  const libraryActions = useLibraryActions(call, setSnapshot)

  return {
    snapshot,
    setSnapshot,
    screen: screenState,
    setScreen,
    busy,
    setBusy,
    error,
    setError,
    refresh,
    ...libraryActions,
  }
}
