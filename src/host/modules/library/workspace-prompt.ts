import { readFile, rename, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { WorkspaceLanguage } from '../../../shared/contracts/library.ts'
import type { ToolPromptLine } from '../tools/prompt-map.ts'
import { readingPrompt } from '../prompt/catalog.ts'

const BEGIN = '<!-- dsh-readpilot:prompt:begin -->'
const END = '<!-- dsh-readpilot:prompt:end -->'
const LANGUAGE_MARKER = /<!--\s*dsh-readpilot:workspace-language:\s*(zh|en)(?:\s*;\s*version:\s*\d+)?\s*-->/

function normalizeLanguage(value: unknown): WorkspaceLanguage {
  return value === 'en' ? 'en' : 'zh'
}

function markedLanguage(content: string): WorkspaceLanguage | null {
  const match = LANGUAGE_MARKER.exec(content)
  return match ? normalizeLanguage(match[1]) : null
}

/** Read the language embedded in an existing workspace prompt, if any. */
export async function readWorkspacePromptLanguage(libraryDir: string): Promise<WorkspaceLanguage | null> {
  if (typeof libraryDir !== 'string' || !libraryDir) return null
  let existing = ''
  try {
    existing = await readFile(join(libraryDir, 'AGENTS.md'), 'utf8')
  } catch {
    return null
  }
  const begin = existing.indexOf(BEGIN)
  const end = existing.indexOf(END)
  if (begin === -1 || end <= begin) return null
  return markedLanguage(existing.slice(begin, end + END.length)) ?? 'zh'
}

function managedBlock(language: WorkspaceLanguage, tools: readonly ToolPromptLine[]) {
  const heading = language === 'en' ? '## Reading assistant' : '## 阅读助手'
  const marker = `<!-- dsh-readpilot:workspace-language:${language} -->`
  return [BEGIN, marker, heading, '', readingPrompt(language, tools), '', END].join('\n')
}

export async function ensureWorkspacePrompt(
  libraryDir: string,
  requestedLanguage: WorkspaceLanguage = 'zh',
  tools: readonly ToolPromptLine[] = [],
): Promise<boolean> {
  if (typeof libraryDir !== 'string' || !libraryDir) return false
  const filePath = join(libraryDir, 'AGENTS.md')
  let existing = ''
  try {
    existing = await readFile(filePath, 'utf8')
  } catch (error) {
    if ((error as NodeJS.ErrnoException | null)?.code !== 'ENOENT') throw error
  }

  const begin = existing.indexOf(BEGIN)
  const end = existing.indexOf(END)
  const hasBlock = begin !== -1 && end > begin
  const language = normalizeLanguage(requestedLanguage)
  const block = managedBlock(language, tools)
  let next
  if (hasBlock) {
    next = `${existing.slice(0, begin)}${block}${existing.slice(end + END.length)}`
  } else {
    const separator = existing.length > 0 && !existing.endsWith('\n') ? '\n\n' : existing.length > 0 ? '\n' : ''
    next = `${existing}${separator}${block}\n`
  }
  if (next === existing) return false

  const temporary = `${filePath}.${process.pid}.tmp`
  await writeFile(temporary, next, 'utf8')
  await rename(temporary, filePath)
  return true
}
