import type { ProgressMap } from '../../../shared/contracts/library.ts'
import { pathsFor } from '../../lib/data-paths.ts'
import { readJson, writeJson } from '../../lib/fs-json.ts'

export async function loadProgress(dataDir: string): Promise<ProgressMap> {
  return readJson<ProgressMap>(pathsFor(dataDir).progress, {})
}

export async function saveProgress(dataDir: string, progress: ProgressMap): Promise<void> {
  await writeJson(pathsFor(dataDir).progress, progress)
}
