import type { HostModule } from '../../types.ts'
import type { BackupExportResult, BackupRestoreResult } from '../../../shared/contracts/backup.ts'
import type { ReaderState } from '../../../shared/contracts/library.ts'
import type { Book } from '../library/book.ts'
import { ReaderError } from '../../lib/errors.ts'
import { BACKUP_ENDPOINTS } from '../../../shared/contracts/backup.ts'
import { exportBackup } from './export.ts'
import { restoreBackup } from './restore.ts'
import { isAbsolute } from 'node:path'
import { realpath, stat } from 'node:fs/promises'

export { BACKUP_VERSION } from './manifest.ts'
export { exportBackup } from './export.ts'
export { restoreBackup } from './restore.ts'
export type { BackupBook, BackupExportResult, BackupManifest, BackupRestoreResult } from '../../../shared/contracts/backup.ts'

export interface BackupServiceDependencies {
  dataDir: string
  appVersion: string
  books(): Promise<Book[]>
  targetBooks(libraryDir: string): Promise<Book[]>
  currentSettings(): Promise<{ libraryDir: string | null }>
  configureLibrary(payload: { path: string }): Promise<ReaderState>
}

export function createBackupService(deps: BackupServiceDependencies) {
  async function backupExport(): Promise<BackupExportResult> {
    const settings = await deps.currentSettings()
    return exportBackup(deps.dataDir, settings.libraryDir, await deps.books(), deps.appVersion)
  }

  async function backupRestore({ archivePath, libraryPath }: any = {}): Promise<BackupRestoreResult & { state: ReaderState }> {
    if (typeof archivePath !== 'string' || !archivePath.trim() || !isAbsolute(archivePath)) {
      throw new ReaderError('invalid-backup', '备份文件必须是绝对路径')
    }
    if (typeof libraryPath !== 'string' || !libraryPath.trim() || !isAbsolute(libraryPath)) {
      throw new ReaderError('invalid-path', '目标书库必须是绝对路径')
    }
    const archive = await realpath(archivePath.trim())
    const archiveInfo = await stat(archive)
    if (!archiveInfo.isFile()) throw new ReaderError('invalid-backup', '备份路径不是文件')
    const library = await realpath(libraryPath.trim())
    const libraryInfo = await stat(library)
    if (!libraryInfo.isDirectory()) throw new ReaderError('invalid-path', '目标书库不是目录')
    const targetBooks = await deps.targetBooks(library)
    const result = await restoreBackup(archive, deps.dataDir, library, targetBooks, deps.appVersion)
    let next: ReaderState
    try {
      next = await deps.configureLibrary({ path: library })
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      throw new ReaderError('workspace-bind-failed', `${message}（数据已恢复，恢复前快照：${result.snapshotPath}）`)
    }
    return { ...result, state: next }
  }

  return { backupExport, backupRestore }
}

export function createBackupModule(deps: BackupServiceDependencies): {
  module: HostModule
  service: ReturnType<typeof createBackupService>
} {
  const service = createBackupService(deps)
  return {
    service,
    module: {
      id: 'backup',
      handlers: {
        [BACKUP_ENDPOINTS.backupExport]: () => service.backupExport(),
        [BACKUP_ENDPOINTS.backupRestore]: payload => service.backupRestore(payload),
      },
      tools: [],
    },
  }
}
