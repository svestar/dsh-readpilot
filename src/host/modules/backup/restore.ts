import JSZip from 'jszip'
import { readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { BackupRestoreResult } from '../../../shared/contracts/backup.ts'
import type { Book } from '../library/book.ts'
import { readJson, writeJson } from '../../lib/fs-json.ts'
import { exportBackup } from './export.ts'
import { assertArchiveLimits, BACKUP_PREFIX, isObject, normalizeManifest, readZipJson } from './manifest.ts'
import { remapLongNotes, remapMemory, remapNotes } from './notes.ts'

interface RestoreMapping {
  old: { bookId: string }
  target: Book
}

async function applyRestore(
  archivePath: string,
  dataDir: string,
  libraryDir: string,
  targetBooks: readonly Book[],
): Promise<BackupRestoreResult> {
  const zip = await JSZip.loadAsync(await readFile(archivePath))
  assertArchiveLimits(zip)
  const manifestEntry = zip.file('manifest.json')
  if (!manifestEntry) throw new Error('备份缺少 manifest.json')
  const manifest = normalizeManifest(JSON.parse(await manifestEntry.async('string')))
  if (!manifest) throw new Error('备份版本不兼容或 manifest 损坏')

  const targetById = new Map(targetBooks.map(book => [book.id, book]))
  const targetByContent = new Map<string, Book>()
  for (const book of targetBooks) {
    if (book.duplicateOf) continue
    if (!targetByContent.has(book.contentKey)) targetByContent.set(book.contentKey, book)
  }
  const mappings: RestoreMapping[] = []
  const seen = new Set<string>()
  for (const old of manifest.books) {
    const target = targetByContent.get(old.contentKey)
    if (!target || seen.has(target.id)) continue
    seen.add(target.id)
    mappings.push({ old, target })
  }
  const mapping = new Map(mappings.map(item => [item.old.bookId, item.target.id]))
  const notes = await remapNotes(zip, dataDir, mapping)

  const progress = await readJson<Record<string, unknown>>(join(dataDir, 'progress.json'), {})
  const backupProgress = await readZipJson<Record<string, unknown>>(zip, `${BACKUP_PREFIX}/progress.json`, {})
  for (const [oldId, targetId] of mapping) {
    delete progress[targetId]
    if (backupProgress[oldId] !== undefined) progress[targetId] = backupProgress[oldId]
  }
  await writeJson(join(dataDir, 'progress.json'), progress)

  const meta = await readJson<Record<string, any>>(join(dataDir, 'library-meta.json'), {})
  const backupMeta = await readZipJson<Record<string, any>>(zip, `${BACKUP_PREFIX}/library-meta.json`, {})
  for (const [oldId, targetId] of mapping) {
    for (const key of ['tags', 'status', 'rating']) {
      if (!isObject(meta[key])) meta[key] = {}
      if (backupMeta[key]?.[oldId] !== undefined) meta[key][targetId] = backupMeta[key][oldId]
      else delete meta[key][targetId]
    }
  }
  await writeJson(join(dataDir, 'library-meta.json'), meta)

  const companion = await readJson<Record<string, any>>(join(dataDir, 'companion.json'), {})
  const backupCompanion = await readZipJson<Record<string, any>>(zip, `${BACKUP_PREFIX}/companion.json`, {})
  if (!isObject(companion.notes)) companion.notes = {}
  if (!isObject(companion.memory)) companion.memory = { mode: 'off', books: {} }
  if (!isObject(companion.memory.books)) companion.memory.books = {}
  for (const [oldId, targetId] of mapping) {
    if (backupCompanion.notes?.[oldId] === true) companion.notes[targetId] = true
    else delete companion.notes[targetId]
    if (backupCompanion.memory?.books?.[oldId] !== undefined) {
      companion.memory.books[targetId] = backupCompanion.memory.books[oldId]
    } else {
      delete companion.memory.books[targetId]
    }
  }
  if (backupCompanion.memory?.mode !== undefined) companion.memory.mode = backupCompanion.memory.mode
  if (typeof backupCompanion.autoApplyNotes === 'boolean') companion.autoApplyNotes = backupCompanion.autoApplyNotes
  await writeJson(join(dataDir, 'companion.json'), companion)

  const presets = zip.file(`${BACKUP_PREFIX}/presets.json`)
  if (presets) await writeFile(join(dataDir, 'presets.json'), await presets.async('nodebuffer'))

  await remapMemory(zip, dataDir, mapping)
  const longNotes = await remapLongNotes(zip, libraryDir, mapping, targetById)
  return {
    matched: mappings.length,
    skipped: manifest.books.length - mappings.length,
    notes,
    longNotes,
    snapshotPath: '',
  }
}

export async function restoreBackup(
  archivePath: string,
  dataDir: string,
  libraryDir: string,
  targetBooks: readonly Book[],
  appVersion: string,
): Promise<BackupRestoreResult> {
  const snapshot = await exportBackup(dataDir, libraryDir, targetBooks, appVersion, 'pre-restore')
  try {
    const result = await applyRestore(archivePath, dataDir, libraryDir, targetBooks)
    return { ...result, snapshotPath: snapshot.path }
  } catch (error) {
    try {
      await applyRestore(snapshot.path, dataDir, libraryDir, targetBooks)
    } catch {
      // Keep the original error; the snapshot path remains available to the user.
    }
    const message = error instanceof Error ? error.message : String(error)
    throw new Error(`${message}（已保留恢复前快照：${snapshot.path}）`)
  }
}
