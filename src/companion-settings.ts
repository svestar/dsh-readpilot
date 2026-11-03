import { join } from 'node:path'
import { readJson, writeJson } from './fsjson.ts'

export type MemoryMode = 'off' | 'ask' | 'on'
export type BookMemoryState = 'inherit' | 'on' | 'off'

export interface CompanionMemorySettings {
  mode: MemoryMode
  books: Record<string, BookMemoryState>
}

export interface CompanionSettings {
  notes: Record<string, boolean>
  memory: CompanionMemorySettings
}

const BOOK_ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/

function isMemoryMode(value: unknown): value is MemoryMode {
  return value === 'off' || value === 'ask' || value === 'on'
}

function isBookMemoryState(value: unknown): value is BookMemoryState {
  return value === 'inherit' || value === 'on' || value === 'off'
}

function notesOf(raw: unknown): Record<string, boolean> {
  const notes: Record<string, boolean> = {}
  if (!raw || typeof raw !== 'object') return notes
  for (const [bookId, enabled] of Object.entries(raw as Record<string, unknown>)) {
    if (BOOK_ID_PATTERN.test(bookId) && typeof enabled === 'boolean') notes[bookId] = enabled
  }
  return notes
}

function memoryOf(raw: unknown): CompanionMemorySettings {
  if (!raw || typeof raw !== 'object') return { mode: 'ask', books: {} }
  const record = raw as Record<string, unknown>
  const books: Record<string, BookMemoryState> = {}
  if (record.books && typeof record.books === 'object') {
    for (const [bookId, state] of Object.entries(record.books as Record<string, unknown>)) {
      if (BOOK_ID_PATTERN.test(bookId) && isBookMemoryState(state)) books[bookId] = state
    }
  }
  return { mode: isMemoryMode(record.mode) ? record.mode : 'ask', books }
}

export function companionSettingsPath(dataDir: string): string {
  return join(dataDir, 'companion.json')
}

export async function loadCompanionSettings(dataDir: string): Promise<CompanionSettings> {
  let value: unknown
  try {
    value = await readJson<unknown>(companionSettingsPath(dataDir), {})
  } catch {
    // 损坏的配置文件按默认值处理，避免阅读器因单个文件无法解析而不可用。
    return { notes: {}, memory: { mode: 'ask', books: {} } }
  }
  const record = value && typeof value === 'object' ? value as Record<string, unknown> : {}
  return { notes: notesOf(record.notes), memory: memoryOf(record.memory) }
}

export async function saveCompanionSettings(dataDir: string, value: CompanionSettings): Promise<void> {
  await writeJson(companionSettingsPath(dataDir), value)
}

export function effectiveMemoryState(settings: CompanionSettings, bookId: string): 'on' | 'off' | 'ask' {
  const mode = settings.memory.mode
  const state = settings.memory.books[bookId]
  if (mode === 'off') return 'off'
  if (state === 'off') return 'off'
  if (state === 'on') return 'on'
  return mode === 'on' ? 'on' : 'ask'
}
