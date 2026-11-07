import { join } from 'node:path'
import type { ParsedBook } from './formats.ts'
import { readJson, writeJson } from './fsjson.ts'

export interface Settings {
  libraryDir: string | null
  workspaceId: string | null
  title?: string
}

export interface ReadingProgress {
  chapterId?: string
  chapterTitle?: string
  chapterFraction?: number
  percent?: number
  updatedAt?: number
}

export type ProgressMap = Record<string, ReadingProgress>

export interface SessionRecord {
  sessionId: string
  updatedAt: number
}

export type SessionMap = Record<string, SessionRecord>

export interface BookSource {
  path: string
  mtimeMs: number
  size: number
}

export interface BookCacheRecord extends ParsedBook {
  parserVersion: number
  source: BookSource
}

export interface DataPaths {
  settings: string
  progress: string
  sessions: string
  cacheDir: string
}

const EMPTY_SETTINGS: Settings = { libraryDir: null, workspaceId: null }

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

export async function loadSettings(dataDir: string): Promise<Settings> {
  const stored = await readJson<Partial<Settings>>(pathsFor(dataDir).settings, EMPTY_SETTINGS)
  return { ...EMPTY_SETTINGS, ...stored }
}

export async function saveSettings(dataDir: string, settings: Settings): Promise<void> {
  await writeJson(pathsFor(dataDir).settings, settings)
}

export async function loadProgress(dataDir: string): Promise<ProgressMap> {
  return readJson<ProgressMap>(pathsFor(dataDir).progress, {})
}

export async function saveProgress(dataDir: string, progress: ProgressMap): Promise<void> {
  await writeJson(pathsFor(dataDir).progress, progress)
}

export async function loadSessions(dataDir: string): Promise<SessionMap> {
  return readJson<SessionMap>(pathsFor(dataDir).sessions, {})
}

export async function saveSessions(dataDir: string, sessions: SessionMap): Promise<void> {
  await writeJson(pathsFor(dataDir).sessions, sessions)
}

export async function loadBookCache(dataDir: string, bookId: string): Promise<BookCacheRecord | null> {
  return readJson<BookCacheRecord | null>(cachePath(dataDir, bookId), null)
}

export async function saveBookCache(dataDir: string, bookId: string, record: BookCacheRecord): Promise<void> {
  await writeJson(cachePath(dataDir, bookId), record)
}
