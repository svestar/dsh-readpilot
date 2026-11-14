import { spawn } from 'node:child_process'
import { resolve, sep } from 'node:path'
import { NOTES_DIR_NAME } from '../../../lib/notes-paths.ts'
import { ReaderError } from '../../../lib/errors.ts'

export function openWithExternalEditor(path: string): Promise<void> {
  const command = process.platform === 'win32' ? 'explorer.exe' : process.platform === 'darwin' ? 'open' : 'xdg-open'
  return new Promise((resolvePromise, reject) => {
    const child = spawn(command, [path], { detached: true, stdio: 'ignore', windowsHide: false })
    child.once('error', reject)
    child.once('spawn', () => {
      child.unref()
      resolvePromise()
    })
  })
}

export function noteFilePath(libraryDir: string, notePath: string): string {
  const notesRoot = resolve(libraryDir, NOTES_DIR_NAME)
  const target = resolve(libraryDir, notePath)
  if (target !== notesRoot && !target.startsWith(`${notesRoot}${sep}`)) {
    throw new ReaderError('invalid-note', '笔记路径越界')
  }
  return target
}
