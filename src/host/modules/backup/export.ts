import JSZip from 'jszip'
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { BackupExportResult } from '../../../shared/contracts/backup.ts'
import type { Book } from '../library/book.ts'
import { NOTES_DIR_NAME } from '../../lib/notes-paths.ts'
import {
  BACKUP_PREFIX,
  BACKUP_VERSION,
  NOTES_PREFIX,
  backupDir,
  safeName,
  stamp,
} from './manifest.ts'

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
  const manifest = {
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
