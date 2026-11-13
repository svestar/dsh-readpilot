import JSZip from 'jszip'
import { mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { readJson, writeJson } from '../storage/fsjson.ts'
import type { Book } from '../books/library.ts'
import { NOTES_DIR_NAME, NOTES_MARKER } from '../notes/files.ts'

export const BACKUP_VERSION = 1
const MAX_BACKUP_ENTRIES = 20_000
const MAX_BACKUP_TEXT = 2 * 1024 * 1024
const BACKUP_PREFIX = 'data'
const NOTES_PREFIX = 'library-notes'

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

interface RestoreMapping {
  old: BackupBook
  target: Book
}

function stamp(): string {
  return new Date().toISOString().replace(/[:.]/g, '-')
}

function backupDir(dataDir: string): string {
  return join(dataDir, 'backups')
}

function safeName(name: string): string {
  return name.replace(/[\\/:*?"<>|]/g, '-')
}

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function normalizeManifest(value: unknown): BackupManifest | null {
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

async function addFileIfExists(zip: JSZip, source: string, name: string): Promise<void> {
  try {
    zip.file(name, await readFile(source))
  } catch (error) {
    if ((error as NodeJS.ErrnoException | null)?.code === 'ENOENT') return
    throw error
  }
}

async function addTree(zip: JSZip, root: string, prefix: string): Promise<void> {
  let entries
  try {
    entries = await readdir(root, { withFileTypes: true })
  } catch (error) {
    if ((error as NodeJS.ErrnoException | null)?.code === 'ENOENT') return
    throw error
  }
  for (const entry of entries) {
    const source = join(root, entry.name)
    const name = `${prefix}/${entry.name}`
    if (entry.isDirectory()) {
      await addTree(zip, source, name)
    } else if (entry.isFile() && entry.name !== '.DS_Store') {
      await addFileIfExists(zip, source, name)
    }
  }
}

export async function exportBackup(
  dataDir: string,
  libraryDir: string | null,
  books: readonly Book[],
  appVersion: string,
  prefix = 'readpilot-backup',
): Promise<BackupExportResult> {
  const manifest: BackupManifest = {
    version: BACKUP_VERSION,
    createdAt: Date.now(),
    appVersion,
    books: books.map(book => ({
      bookId: book.id,
      contentKey: book.contentKey,
      title: book.title,
      format: book.format,
    })),
  }
  const zip = new JSZip()
  zip.file('manifest.json', `${JSON.stringify(manifest, null, 2)}\n`)
  for (const name of ['presets.json', 'progress.json', 'library-meta.json', 'companion.json']) {
    await addFileIfExists(zip, join(dataDir, name), `${BACKUP_PREFIX}/${name}`)
  }
  const notesRoot = join(dataDir, 'notes')
  for (const book of books) {
    await addFileIfExists(zip, join(notesRoot, `${book.id}.json`), `${BACKUP_PREFIX}/notes/${book.id}.json`)
  }
  await addTree(zip, join(dataDir, 'memory'), `${BACKUP_PREFIX}/memory`)
  if (libraryDir) {
    await addTree(zip, join(libraryDir, NOTES_DIR_NAME), NOTES_PREFIX)
  }

  const targetDir = backupDir(dataDir)
  await mkdir(targetDir, { recursive: true })
  const filePath = join(targetDir, `${safeName(prefix)}-${stamp()}.zip`)
  const buffer = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' })
  await writeFile(filePath, buffer)
  return { path: filePath, manifest }
}

function assertArchiveLimits(zip: JSZip): void {
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

async function readZipJson<T>(zip: JSZip, name: string, fallback: T): Promise<T> {
  const entry = zip.file(name)
  if (!entry) return fallback
  const value = JSON.parse(await entry.async('string'))
  return value as T
}

async function remapNotes(zip: JSZip, dataDir: string, mapping: Map<string, string>): Promise<number> {
  const root = join(dataDir, 'notes')
  await mkdir(root, { recursive: true })
  let count = 0
  for (const [oldId, targetId] of mapping) {
    const targetPath = join(root, `${targetId}.json`)
    await rm(targetPath, { force: true })
    const entry = zip.file(`${BACKUP_PREFIX}/notes/${oldId}.json`)
    if (!entry) continue
    const raw = await entry.async('string')
    if (raw.length > MAX_BACKUP_TEXT) throw new Error('备份批注过大，无法恢复')
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) continue
    for (const note of parsed) {
      if (isObject(note)) note.bookId = targetId
    }
    await writeJson(targetPath, parsed)
    count += parsed.length
  }
  return count
}

function noteMetaOf(value: unknown): { bookId?: string } {
  return isObject(value) && typeof value.bookId === 'string' ? { bookId: value.bookId } : {}
}

async function targetNoteDirs(libraryDir: string, bookIds: Set<string>): Promise<string[]> {
  const root = join(libraryDir, NOTES_DIR_NAME)
  let entries
  try {
    entries = await readdir(root, { withFileTypes: true })
  } catch (error) {
    if ((error as NodeJS.ErrnoException | null)?.code === 'ENOENT') return []
    throw error
  }
  const dirs: string[] = []
  for (const entry of entries) {
    if (!entry.isDirectory() || entry.name === '.history') continue
    const dir = join(root, entry.name)
    const meta = noteMetaOf(await readJson<unknown>(join(dir, '.book.json'), {}))
    if (meta.bookId && bookIds.has(meta.bookId)) dirs.push(dir)
  }
  return dirs
}

async function remapLongNotes(
  zip: JSZip,
  libraryDir: string,
  mapping: Map<string, string>,
  targetById: Map<string, Book>,
): Promise<number> {
  const root = join(libraryDir, NOTES_DIR_NAME)
  await mkdir(root, { recursive: true })
  await writeFile(join(root, NOTES_MARKER), 'dsh-readpilot notes\n', 'utf8')
  const targets = new Set(mapping.values())
  for (const dir of await targetNoteDirs(libraryDir, targets)) {
    await rm(dir, { recursive: true, force: true })
  }

  const groups = new Map<string, string[]>()
  for (const name of Object.keys(zip.files)) {
    if (!name.startsWith(`${NOTES_PREFIX}/`)) continue
    const rest = name.slice(NOTES_PREFIX.length + 1)
    const [dir, ...tail] = rest.split('/')
    if (!dir || tail.length === 0 || zip.files[name].dir) continue
    const list = groups.get(dir) ?? []
    list.push(rest)
    groups.set(dir, list)
  }

  let count = 0
  for (const [dirName, names] of groups) {
    const metaEntry = zip.file(`${NOTES_PREFIX}/${dirName}/.book.json`)
    if (!metaEntry) continue
    const meta = noteMetaOf(JSON.parse(await metaEntry.async('string')))
    if (!meta.bookId) continue
    const targetId = mapping.get(meta.bookId)
    if (!targetId) continue
    const target = targetById.get(targetId)
    let outDir = join(root, dirName)
    let suffix = 2
    while (true) {
      try {
        await readdir(outDir)
        outDir = join(root, `${dirName}-${suffix}`)
        suffix += 1
      } catch {
        break
      }
    }
    await mkdir(outDir, { recursive: true })
    for (const name of names) {
      const entry = zip.file(`${NOTES_PREFIX}/${name}`)
      if (!entry || entry.dir) continue
      const relativeName = name.slice(dirName.length + 1)
      const targetPath = join(outDir, relativeName)
      await mkdir(dirname(targetPath), { recursive: true })
      if (relativeName === '.book.json') {
        const value = JSON.parse(await entry.async('string'))
        await writeJson(targetPath, {
          ...value,
          bookId: targetId,
          ...(target ? { sourcePath: target.path } : {}),
        })
      } else if (relativeName.endsWith('.md')) {
        const text = await entry.async('string')
        await writeFile(targetPath, text.replace(/^bookId:.*$/m, `bookId: ${targetId}`), 'utf8')
      } else {
        await writeFile(targetPath, await entry.async('nodebuffer'))
      }
    }
    count += 1
  }
  return count
}

function memoryEntries(zip: JSZip, mapping: Map<string, string>): Map<string, string> {
  const result = new Map<string, string>()
  for (const name of Object.keys(zip.files)) {
    if (!name.startsWith(`${BACKUP_PREFIX}/memory/`) || zip.files[name].dir) continue
    const rel = name.slice(`${BACKUP_PREFIX}/memory/`.length)
    if (rel === 'reader.md' || rel.startsWith('.history/reader/')) {
      result.set(`memory/${rel}`, name)
      continue
    }
    const direct = /^([^/]+)\.md$/.exec(rel)
    if (direct && mapping.has(direct[1])) {
      result.set(`memory/${mapping.get(direct[1])}.md`, name)
      continue
    }
    const history = /^\.history\/([^/]+)\/(.+)$/.exec(rel)
    if (history && mapping.has(history[1])) {
      result.set(`memory/.history/${mapping.get(history[1])}/${history[2]}`, name)
    }
  }
  return result
}

async function remapMemory(zip: JSZip, dataDir: string, mapping: Map<string, string>): Promise<void> {
  const root = join(dataDir, 'memory')
  for (const targetId of mapping.values()) {
    await rm(join(root, `${targetId}.md`), { force: true })
    await rm(join(root, '.history', targetId), { recursive: true, force: true })
  }
  await rm(join(root, 'reader.md'), { force: true })
  await rm(join(root, '.history', 'reader'), { recursive: true, force: true })
  for (const [rel, source] of memoryEntries(zip, mapping)) {
    const entry = zip.file(source)
    if (!entry) continue
    const path = join(dataDir, rel)
    await mkdir(dirname(path), { recursive: true })
    await writeFile(path, await entry.async('nodebuffer'))
  }
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
