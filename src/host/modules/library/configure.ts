import { mkdir, realpath, stat } from 'node:fs/promises'
import { basename, isAbsolute, resolve } from 'node:path'
import type { ReaderState } from '../../../shared/contracts/library.ts'
import type { HostContext } from '../../types.ts'
import { ReaderError } from '../../lib/errors.ts'
import { saveSettings } from './settings.ts'
import type { LibraryScan } from './scan.ts'

export interface LibraryConfigureDependencies {
  ctx?: HostContext
  dataDir: string
  scan: LibraryScan
  state(): Promise<ReaderState>
}

export function createLibraryConfigure(deps: LibraryConfigureDependencies) {
  return async function configure({ path }: { path?: unknown } = {}): Promise<ReaderState> {
    if (typeof path !== 'string' || !path.trim()) {
      throw new ReaderError('invalid-path', '书库路径不能为空')
    }
    const requested = path.trim()
    if (!isAbsolute(requested)) {
      throw new ReaderError('invalid-path', '书库路径必须是绝对路径')
    }
    const target = resolve(requested)
    await mkdir(target, { recursive: true })
    const info = await stat(target)
    if (!info.isDirectory()) {
      throw new ReaderError('invalid-path', '书库路径不是目录')
    }
    const real = await realpath(target)
    const registry: any = deps.ctx?.get('workspaceRegistry')
    if (!registry) {
      throw new ReaderError('workspace-unavailable', '当前环境没有工作区服务，无法创建书库工作区')
    }
    let workspace = await registry.resolveByPath(real)
    if (!workspace) {
      workspace = await registry.create(real, basename(real) || '书库')
    }
    await saveSettings(deps.dataDir, {
      libraryDir: real,
      workspaceId: String(workspace.id),
      title: workspace.title ?? (basename(real) || '书库'),
    })
    deps.scan.invalidate()
    return deps.state()
  }
}
