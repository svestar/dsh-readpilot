import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

export function fakeContext(options: { fs?: any } = {}) {
  const workspaces: any[] = []
  const archivedSessionIds: string[] = []
  return {
    workspaces,
    archivedSessionIds,
    get(name: string) {
      if (name === 'fs') return options.fs
      if (name !== 'workspaceRegistry') return undefined
      return {
        archivedSessionIds,
        async resolveByPath(path: string) {
          return workspaces.find(workspace => workspace.path === path)
        },
        async create(path: string, title: string) {
          const workspace = { id: `ws-${workspaces.length + 1}`, path, title }
          workspaces.push(workspace)
          return workspace
        },
      }
    },
  }
}

export async function makeLibrary(t: any) {
  const root = await mkdtemp(join(tmpdir(), 'dsh-readpilot-api-'))
  const library = join(root, 'books')
  const data = join(root, 'data')
  await mkdir(library, { recursive: true })
  await writeFile(
    join(library, 'demo.txt'),
    `第一章 开始\n\n${'这是第一章的测试文字。'.repeat(40)}\n\n第二章 继续\n\n再见。`,
    'utf8',
  )
  t.after(() => rm(root, { recursive: true, force: true }))
  return { root, library, data }
}

export function buildBlankPdf(): Buffer {
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] >>',
  ]
  const chunks: Buffer[] = []
  let offset = 0
  const write = (value: string) => {
    const bytes = Buffer.from(value, 'latin1')
    chunks.push(bytes)
    offset += bytes.length
  }
  write('%PDF-1.4\n')
  const offsets = objects.map((body, index) => {
    const start = offset
    write(`${index + 1} 0 obj\n${body}\nendobj\n`)
    return start
  })
  const xrefOffset = offset
  write(`xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`)
  for (const start of offsets) write(`${String(start).padStart(10, '0')} 00000 n \n`)
  write(`trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`)
  return Buffer.concat(chunks)
}
