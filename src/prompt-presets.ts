import { randomBytes } from 'node:crypto'
import { join } from 'node:path'
import { readJson, writeJson } from './fsjson.ts'
import { enqueueWrite } from './write-queue.ts'

export interface PromptPreset {
  id: string
  title: string
  template: string
  builtin: boolean
}

export interface PromptPresetInput {
  id?: unknown
  title?: unknown
  template?: unknown
}

export interface PromptPresetStore {
  list(): Promise<PromptPreset[]>
  save(input: PromptPresetInput): Promise<PromptPreset>
  remove(id: unknown): Promise<boolean>
  reset(): Promise<PromptPreset[]>
}

const MAX_TITLE = 40
const MAX_TEMPLATE = 4000
const ID_PATTERN = /^[a-z0-9-]{1,64}$/

export const DEFAULT_PROMPT_PRESETS: PromptPreset[] = [
  {
    id: 'explain',
    title: '解释这段',
    template: '请解释下面这段内容，并结合《{{book}}》{{chapter}} 的上下文说明它的意思：\n\n{{selection}}',
    builtin: true,
  },
  {
    id: 'terms',
    title: '术语与典故',
    template: '请解释下面这段内容中的术语、典故和背景，并说明它们在本文中的含义：\n\n{{selection}}\n\n本书相关批注：\n{{notes}}',
    builtin: true,
  },
  {
    id: 'translate',
    title: '翻译',
    template: '请把下面这段内容翻译成中文；如果原文是中文，翻译成英文。保留语气和段落：\n\n{{selection}}',
    builtin: true,
  },
  {
    id: 'followup',
    title: '继续追问',
    template: '关于《{{book}}》{{chapter}} 的这段内容：\n\n{{selection}}\n\n我想继续追问：',
    builtin: true,
  },
  {
    id: 'summarize',
    title: '总结要点',
    template: '请总结下面这段内容，并列出三个要点：\n\n{{selection}}\n\n本书相关批注：\n{{notes}}',
    builtin: true,
  },
]

function presetsPath(dataDir: string): string {
  return join(dataDir, 'presets.json')
}

function assertTitle(value: unknown): string {
  const title = typeof value === 'string' ? value.trim() : ''
  if (!title) throw new Error('preset title must not be empty')
  if (title.length > MAX_TITLE) throw new Error(`preset title must be at most ${MAX_TITLE} characters`)
  return title
}

function assertTemplate(value: unknown): string {
  const template = typeof value === 'string' ? value.trim() : ''
  if (!template) throw new Error('preset template must not be empty')
  if (template.length > MAX_TEMPLATE) throw new Error(`preset template must be at most ${MAX_TEMPLATE} characters`)
  return template
}

function assertId(value: unknown): string {
  const id = typeof value === 'string' ? value : ''
  if (!ID_PATTERN.test(id)) throw new Error('preset id is invalid')
  return id
}

function normalize(value: unknown): PromptPreset | null {
  if (!value || typeof value !== 'object') return null
  const source = value as Record<string, unknown>
  if (typeof source.id !== 'string' || typeof source.title !== 'string' || typeof source.template !== 'string') return null
  const id = source.id.trim()
  const title = source.title.trim()
  const template = source.template.trim()
  if (!ID_PATTERN.test(id) || !title || !template) return null
  return { id, title, template, builtin: source.builtin === true }
}

async function readPresets(path: string): Promise<PromptPreset[]> {
  const value = await readJson<unknown>(path, null)
  if (value === null) return DEFAULT_PROMPT_PRESETS.map(item => ({ ...item }))
  if (!Array.isArray(value)) throw new Error(`presets file is not an array: ${path}`)
  return value.map(normalize).filter((item): item is PromptPreset => item !== null)
}

export function createPromptPresetStore(dataDir: string): PromptPresetStore {
  const path = presetsPath(dataDir)

  return {
    async list() {
      return await readPresets(path)
    },

    async save(input) {
      const title = assertTitle(input.title)
      const template = assertTemplate(input.template)
      const id = typeof input.id === 'string' && input.id.trim() ? assertId(input.id.trim()) : null
      return enqueueWrite(path, async () => {
        const presets = await readPresets(path)
        const index = id ? presets.findIndex(item => item.id === id) : -1
        if (id && index === -1) throw new Error(`preset not found: ${id}`)
        if (index >= 0) {
          presets[index] = { ...presets[index], title, template }
          await writeJson(path, presets)
          return presets[index]
        }
        const preset: PromptPreset = {
          id: `preset-${randomBytes(4).toString('hex')}`,
          title,
          template,
          builtin: false,
        }
        presets.push(preset)
        await writeJson(path, presets)
        return preset
      })
    },

    async remove(id) {
      const presetId = assertId(id)
      return enqueueWrite(path, async () => {
        const presets = await readPresets(path)
        const index = presets.findIndex(item => item.id === presetId)
        if (index === -1) return false
        presets.splice(index, 1)
        await writeJson(path, presets)
        return true
      })
    },

    async reset() {
      return enqueueWrite(path, async () => {
        const presets = DEFAULT_PROMPT_PRESETS.map(item => ({ ...item }))
        await writeJson(path, presets)
        return presets
      })
    },
  }
}
