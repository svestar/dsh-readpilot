import { homedir } from 'node:os'
import { join } from 'node:path'

export function resolveDshHome(env = process.env, home = homedir()) {
  const configured = typeof env.DSH_HOME === 'string' ? env.DSH_HOME.trim() : ''
  return configured || join(home, '.dsh')
}

export function pluginDataDir(dshHome) {
  return join(dshHome, 'dsh-reader')
}
