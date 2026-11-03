import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'

export async function readJson<T>(path: string, fallback: T): Promise<T> {
  try {
    return JSON.parse(await readFile(path, 'utf8'))
  } catch (error) {
    if ((error as NodeJS.ErrnoException | null)?.code === 'ENOENT') return fallback
    throw error
  }
}

export async function writeJson(path: string, value: unknown): Promise<void> {
  await mkdir(dirname(path), { recursive: true })
  const temporary = `${path}.${process.pid}.tmp`
  await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, 'utf8')
  await rename(temporary, path)
}
