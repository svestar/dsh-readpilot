import { join } from 'node:path'
import { readJson, writeJson } from './fsjson.js'

const EMPTY_SETTINGS = { libraryDir: null, workspaceId: null }

export function pathsFor(dataDir) {
  return {
    settings: join(dataDir, 'settings.json'),
    progress: join(dataDir, 'progress.json'),
    sessions: join(dataDir, 'sessions.json'),
    cacheDir: join(dataDir, 'cache'),
  }
}

export function cachePath(dataDir, bookId) {
  return join(pathsFor(dataDir).cacheDir, `${bookId}.json`)
}

export async function loadSettings(dataDir) {
  return { ...EMPTY_SETTINGS, ...(await readJson(pathsFor(dataDir).settings, EMPTY_SETTINGS)) }
}

export async function saveSettings(dataDir, settings) {
  await writeJson(pathsFor(dataDir).settings, settings)
}

export async function loadProgress(dataDir) {
  return readJson(pathsFor(dataDir).progress, {})
}

export async function saveProgress(dataDir, progress) {
  await writeJson(pathsFor(dataDir).progress, progress)
}

export async function loadSessions(dataDir) {
  return readJson(pathsFor(dataDir).sessions, {})
}

export async function saveSessions(dataDir, sessions) {
  await writeJson(pathsFor(dataDir).sessions, sessions)
}

export async function loadBookCache(dataDir, bookId) {
  return readJson(cachePath(dataDir, bookId), null)
}

export async function saveBookCache(dataDir, bookId, record) {
  await writeJson(cachePath(dataDir, bookId), record)
}
