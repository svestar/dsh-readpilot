import { readFileSync } from 'node:fs'
import type { Settings, WorkspaceLanguage } from '../../../shared/contracts/library.ts'
import { pathsFor } from '../../lib/data-paths.ts'
import { readJson, writeJson } from '../../lib/fs-json.ts'

const EMPTY_SETTINGS: Settings = { libraryDir: null, workspaceId: null, workspaceLanguage: 'zh' }

/** Read the persisted language synchronously so the first prompt assembly uses it. */
export function readWorkspaceLanguageSync(dataDir: string): WorkspaceLanguage {
  try {
    const parsed = JSON.parse(readFileSync(pathsFor(dataDir).settings, 'utf8')) as { workspaceLanguage?: unknown }
    return parsed?.workspaceLanguage === 'en' ? 'en' : 'zh'
  } catch {
    return 'zh'
  }
}

export async function loadSettings(dataDir: string): Promise<Settings> {
  const stored = await readJson<Partial<Settings>>(pathsFor(dataDir).settings, EMPTY_SETTINGS)
  return { ...EMPTY_SETTINGS, ...stored }
}

export async function saveSettings(dataDir: string, settings: Settings): Promise<void> {
  await writeJson(pathsFor(dataDir).settings, settings)
}
