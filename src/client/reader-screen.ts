import type { Screen } from './types.ts'

let lastScreen: Screen = { kind: 'library' }

export function currentReaderScreen(): Screen {
  return lastScreen
}

export function rememberReaderScreen(screen: Screen): void {
  lastScreen = screen
}
