import { join } from 'node:path'

export interface DataPaths {
  settings: string
  progress: string
  sessions: string
  cacheDir: string
}

export function pathsFor(dataDir: string): DataPaths {
  return {
    settings: join(dataDir, 'settings.json'),
    progress: join(dataDir, 'progress.json'),
    sessions: join(dataDir, 'sessions.json'),
    cacheDir: join(dataDir, 'cache'),
  }
}

export function cachePath(dataDir: string, bookId: string): string {
  return join(pathsFor(dataDir).cacheDir, `${bookId}.json`)
}
