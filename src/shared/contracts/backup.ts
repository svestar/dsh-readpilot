export const BACKUP_ENDPOINTS = {
  backupExport: 'backupExport',
  backupRestore: 'backupRestore',
} as const

export interface BackupBook {
  bookId: string
  contentKey: string
  title: string
  format: string
}

export interface BackupManifest {
  version: number
  createdAt: number
  appVersion: string
  books: BackupBook[]
}

export interface BackupExportResult {
  path: string
  manifest: BackupManifest
}

export interface BackupRestoreResult {
  matched: number
  skipped: number
  notes: number
  longNotes: number
  snapshotPath: string
}
