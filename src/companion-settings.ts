import { join } from 'node:path'
import { readJson, writeJson } from './fsjson.ts'

export interface CompanionSettings {
  notes: Record<string, boolean>
}

const BOOK_ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/

export function companionSettingsPath(dataDir: string): string {
  return join(dataDir, 'companion.json')
}

export async function loadCompanionSettings(dataDir: string): Promise<CompanionSettings> {
  let value: Partial<CompanionSettings>
  try {
    value = await readJson<Partial<CompanionSettings>>(companionSettingsPath(dataDir), {})
  } catch {
    return { notes: {} }
  }
  const notes: Record<string, boolean> = {}
  const raw = value && typeof value === 'object' ? value.notes : undefined
  if (raw && typeof raw === 'object') {
    for (const [bookId, enabled] of Object.entries(raw)) {
      if (BOOK_ID_PATTERN.test(bookId) && typeof enabled === 'boolean') notes[bookId] = enabled
    }
  }
  return { notes }
}

export async function saveCompanionSettings(dataDir: string, value: CompanionSettings): Promise<void> {
  await writeJson(companionSettingsPath(dataDir), value)
}
