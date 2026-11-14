import type JSZip from 'jszip'
import { mkdir, readdir, rm, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import type { Book } from '../library/book.ts'
import { NOTES_DIR_NAME, NOTES_MARKER } from '../../lib/notes-paths.ts'
import { readJson, writeJson } from '../../lib/fs-json.ts'
import { BACKUP_PREFIX, MAX_BACKUP_TEXT, NOTES_PREFIX, isObject } from './manifest.ts'

export async function remapNotes(zip: JSZip, dataDir: string, mapping: Map<string, string>): Promise<number> {
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

export async function remapLongNotes(
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

export async function remapMemory(zip: JSZip, dataDir: string, mapping: Map<string, string>): Promise<void> {
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
