import { homedir } from 'node:os'
import { join } from 'node:path'

export function resolveDshHome(env: Record<string, string | undefined> = process.env, home = homedir()): string {
  const configured = typeof env.DSH_HOME === 'string' ? env.DSH_HOME.trim() : ''
  return configured || join(home, '.dsh')
}

export function pluginDataDir(dshHome: string): string {
  return join(dshHome, 'dsh-readpilot')
}
