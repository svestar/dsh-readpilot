import type { SessionMap } from '../../../shared/contracts/companion.ts'
import { pathsFor } from '../../lib/data-paths.ts'
import { readJson, writeJson } from '../../lib/fs-json.ts'

export async function loadSessions(dataDir: string): Promise<SessionMap> {
  return readJson<SessionMap>(pathsFor(dataDir).sessions, {})
}

export async function saveSessions(dataDir: string, sessions: SessionMap): Promise<void> {
  await writeJson(pathsFor(dataDir).sessions, sessions)
}
