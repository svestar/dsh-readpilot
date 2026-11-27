import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import type { WorkspaceLanguage } from '../../../shared/contracts/library.ts'
import { WORKSPACE_SKILLS, workspaceSkillBody } from '../prompt/skills.ts'

const BEGIN = '<!-- dsh-readpilot:skill:begin -->'
const END = '<!-- dsh-readpilot:skill:end -->'

function skillFile(skillsDir: string, name: string): string {
  return join(skillsDir, name, 'SKILL.md')
}

function frontmatter(name: string, description: string): string {
  return ['---', `name: ${name}`, `description: ${description}`, '---'].join('\n')
}

function managedBlock(body: string): string {
  return [BEGIN, body, END].join('\n')
}

function replaceBlock(existing: string, block: string): string | null {
  const begin = existing.indexOf(BEGIN)
  const end = existing.indexOf(END)
  if (begin === -1 || end <= begin) return null
  return `${existing.slice(0, begin)}${block}${existing.slice(end + END.length)}`
}

function repairFrontmatter(existing: string, name: string, description: string): string {
  const expected = frontmatter(name, description)
  if (existing.startsWith(`${expected}\n`) || existing.startsWith(`${expected}\r\n`)) return existing
  const offset = existing.startsWith('---\r\n') ? 5 : 4
  if (existing.startsWith('---\n') || existing.startsWith('---\r\n')) {
    const close = existing.indexOf('\n---', offset)
    if (close !== -1) {
      const rest = existing.slice(close + 4).replace(/^\r?\n/, '')
      return `${expected}\n\n${rest}`
    }
  }
  return `${expected}\n\n${existing}`
}

async function writeAtomic(path: string, content: string): Promise<void> {
  const temporary = `${path}.${process.pid}.tmp`
  await writeFile(temporary, content, 'utf8')
  await rename(temporary, path)
}

/** Remove plugin-managed skills left in a library workspace by older versions. */
export async function removeLegacyWorkspaceSkills(libraryDir: string): Promise<boolean> {
  if (typeof libraryDir !== 'string' || !libraryDir) return false
  const root = join(libraryDir, '.dsh', 'skills')
  let changed = false
  for (const skill of WORKSPACE_SKILLS) {
    const dir = join(root, skill.name)
    try {
      const text = await readFile(join(dir, 'SKILL.md'), 'utf8')
      if (!text.includes(BEGIN) || !text.includes(END)) continue
      await rm(dir, { recursive: true, force: true })
      changed = true
    } catch (error) {
      if ((error as NodeJS.ErrnoException | null)?.code !== 'ENOENT') throw error
    }
  }
  return changed
}

/** Create or refresh the plugin's on-demand skills in the DSH user skill directory. */
export async function ensureUserSkills(
  skillsDir: string,
  language: WorkspaceLanguage,
): Promise<boolean> {
  if (typeof skillsDir !== 'string' || !skillsDir) return false
  let changed = false
  for (const skill of WORKSPACE_SKILLS) {
    const file = skillFile(skillsDir, skill.name)
    const block = managedBlock(workspaceSkillBody(skill, language))
    let existing = ''
    try {
      existing = await readFile(file, 'utf8')
    } catch (error) {
      if ((error as NodeJS.ErrnoException | null)?.code !== 'ENOENT') throw error
    }
    if (existing) {
      const replaced = replaceBlock(existing, block)
      // A same-named skill without markers belongs to the user.
      if (replaced === null) continue
      const next = repairFrontmatter(replaced, skill.name, skill.description)
      if (next === existing) continue
      await writeAtomic(file, next)
      changed = true
      continue
    }
    await mkdir(dirname(file), { recursive: true })
    await writeAtomic(file, `${frontmatter(skill.name, skill.description)}\n\n${block}\n`)
    changed = true
  }
  return changed
}
