import type { Settings } from '../../../shared/contracts/library.ts'
import { pathsFor } from '../../lib/data-paths.ts'
import { readJson, writeJson } from '../../lib/fs-json.ts'

const EMPTY_SETTINGS: Settings = { libraryDir: null, workspaceId: null }

export async function loadSettings(dataDir: string): Promise<Settings> {
  const stored = await readJson<Partial<Settings>>(pathsFor(dataDir).settings, EMPTY_SETTINGS)
  return { ...EMPTY_SETTINGS, ...stored }
}

export async function saveSettings(dataDir: string, settings: Settings): Promise<void> {
  await writeJson(pathsFor(dataDir).settings, settings)
}
