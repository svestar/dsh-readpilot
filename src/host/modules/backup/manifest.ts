import type JSZip from 'jszip'
import { join } from 'node:path'
import type { BackupBook, BackupManifest } from '../../../shared/contracts/backup.ts'

export const BACKUP_VERSION = 1
export const MAX_BACKUP_ENTRIES = 20_000
export const MAX_BACKUP_TEXT = 2 * 1024 * 1024
export const BACKUP_PREFIX = 'data'
export const NOTES_PREFIX = 'library-notes'

export function stamp(): string {
  return new Date().toISOString().replace(/[:.]/g, '-')
}

export function backupDir(dataDir: string): string {
  return join(dataDir, 'backups')
}

export function safeName(name: string): string {
  return name.replace(/[\\/:*?"<>|]/g, '-')
}

export function isObject(value: unknown): value is Record<string, any> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

export function normalizeManifest(value: unknown): BackupManifest | null {
  if (!isObject(value) || value.version !== BACKUP_VERSION || !Array.isArray(value.books)) return null
  const books: BackupBook[] = []
  for (const item of value.books) {
    if (!isObject(item)) continue
    if (typeof item.bookId !== 'string' || typeof item.contentKey !== 'string') continue
    if (typeof item.title !== 'string' || typeof item.format !== 'string') continue
    books.push({ bookId: item.bookId, contentKey: item.contentKey, title: item.title, format: item.format })
  }
  return {
    version: BACKUP_VERSION,
    createdAt: typeof value.createdAt === 'number' ? value.createdAt : 0,
    appVersion: typeof value.appVersion === 'string' ? value.appVersion : '',
    books,
  }
}

export function assertArchiveLimits(zip: JSZip): void {
  const entries = Object.values(zip.files)
  if (entries.length > MAX_BACKUP_ENTRIES) {
    throw new Error('备份条目过多，无法恢复')
  }
  for (const entry of entries) {
    if (entry.name.includes('..') || entry.name.startsWith('/') || entry.name.includes('\\')) {
      throw new Error(`备份包含非法路径：${entry.name}`)
    }
  }
}

export async function readZipJson<T>(zip: JSZip, name: string, fallback: T): Promise<T> {
  const entry = zip.file(name)
  if (!entry) return fallback
  const value = JSON.parse(await entry.async('string'))
  return value as T
}
