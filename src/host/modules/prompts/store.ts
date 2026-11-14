import { randomBytes } from 'node:crypto'
import { join } from 'node:path'
import type { PromptPreset } from '../../../shared/contracts/prompts.ts'
import { readJson, writeJson } from '../../lib/fs-json.ts'
import { enqueueWrite } from '../../lib/write-queue.ts'

export type { PromptPreset } from '../../../shared/contracts/prompts.ts'

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
    template: '解释这段，结合《{{book}}》{{chapter}} 的上下文：\n\n{{selection}}',
    builtin: true,
  },
  {
    id: 'terms',
    title: '术语与典故',
    template: '解释这段里的术语、典故和背景：\n\n{{selection}}',
    builtin: true,
  },
  {
    id: 'translate',
    title: '翻译',
    template: '翻译这段（中译英或英译中），保留语气：\n\n{{selection}}',
    builtin: true,
  },
  {
    id: 'followup',
    title: '继续追问',
    template: '关于《{{book}}》{{chapter}}：\n\n{{selection}}\n\n我想继续追问：',
    builtin: true,
  },
  {
    id: 'summarize',
    title: '总结要点',
    template: '总结这段，列三个要点：\n\n{{selection}}',
    builtin: true,
  },
  {
    id: 'character',
    title: '人物关系',
    template: '梳理这段的人物、关系和动机：\n\n{{selection}}',
    builtin: true,
  },
  {
    id: 'craft',
    title: '写作手法',
    template: '分析这段的写作手法、节奏和意象：\n\n{{selection}}',
    builtin: true,
  },
  {
    id: 'background',
    title: '背景知识',
    template: '补充这段的时代、文化、作者或典故背景：\n\n{{selection}}',
    builtin: true,
  },
  {
    id: 'argument',
    title: '观点与论证',
    template: '提炼这段的观点、论据和隐含假设：\n\n{{selection}}',
    builtin: true,
  },
  {
    id: 'quote',
    title: '金句摘录',
    template: '摘出这段最值得记的句子，说明理由：\n\n{{selection}}',
    builtin: true,
  },
  {
    id: 'questions',
    title: '提问清单',
    template: '根据这段提五个由浅入深的问题：\n\n{{selection}}',
    builtin: true,
  },
  {
    id: 'connect',
    title: '联系全书',
    template: '把这段与《{{book}}》前后文或主题联系起来：\n\n{{selection}}',
    builtin: true,
  },
]

const LEGACY_DEFAULT_TEMPLATES: Record<string, string> = {
  explain: '请解释下面这段内容，并结合《{{book}}》{{chapter}} 的上下文说明它的意思：\n\n{{selection}}',
  terms: '请解释下面这段内容中的术语、典故和背景，并说明它们在本文中的含义：\n\n{{selection}}\n\n本书相关批注：\n{{notes}}',
  translate: '请把下面这段内容翻译成中文；如果原文是中文，翻译成英文。保留语气和段落：\n\n{{selection}}',
  followup: '关于《{{book}}》{{chapter}} 的这段内容：\n\n{{selection}}\n\n我想继续追问：',
  summarize: '请总结下面这段内容，并列出三个要点：\n\n{{selection}}\n\n本书相关批注：\n{{notes}}',
  character: '请梳理这段内容涉及的人物、关系与动机，并指出前后文可能对应的线索：\n\n{{selection}}',
  craft: '请分析这段文字的写作手法，包括叙述视角、节奏、修辞和意象，并举例说明：\n\n{{selection}}',
  background: '请补充理解这段内容所需的时代、文化、作者或典故背景，并说明它如何影响理解：\n\n{{selection}}',
  argument: '请提炼这段内容的核心观点、论据和隐含假设，并指出可以质疑的地方：\n\n{{selection}}',
  quote: '请从这段内容中摘出最值得记诵的句子，并说明理由：\n\n{{selection}}\n\n本书相关批注：\n{{notes}}',
  questions: '请基于这段内容生成五个由浅入深的问题，帮助我检查理解：\n\n{{selection}}',
  connect: '请把这段内容与《{{book}}》的前后文或全书主题联系起来，指出呼应、反差和伏笔：\n\n{{selection}}\n\n本书相关批注：\n{{notes}}',
}

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

const PRESET_FILE_VERSION = 3
const NEW_DEFAULT_IDS = ['character', 'craft', 'background', 'argument', 'quote', 'questions', 'connect']

function presetState(value: unknown): { presets: PromptPreset[]; version: number } {
  if (value === null) {
    return { presets: DEFAULT_PROMPT_PRESETS.map(item => ({ ...item })), version: PRESET_FILE_VERSION }
  }
  if (Array.isArray(value)) {
    return {
      presets: value.map(normalize).filter((item): item is PromptPreset => item !== null),
      version: 1,
    }
  }
  if (value && typeof value === 'object' && Array.isArray((value as Record<string, unknown>).presets)) {
    return {
      presets: ((value as Record<string, unknown>).presets as unknown[])
        .map(normalize)
        .filter((item): item is PromptPreset => item !== null),
      version: Number((value as Record<string, unknown>).version) || 0,
    }
  }
  throw new Error('presets file must be an array or { version, presets } object')
}

async function readPresetState(path: string): Promise<{ presets: PromptPreset[]; needsWrite: boolean }> {
  const state = presetState(await readJson<unknown>(path, null))
  if (state.version >= PRESET_FILE_VERSION) return { presets: state.presets, needsWrite: false }
  if (state.version < 2) {
    const ids = new Set(state.presets.map(item => item.id))
    for (const id of NEW_DEFAULT_IDS) {
      if (ids.has(id)) continue
      const preset = DEFAULT_PROMPT_PRESETS.find(item => item.id === id)
      if (preset) state.presets.push({ ...preset })
    }
  }
  if (state.version < 3) {
    for (const preset of state.presets) {
      if (!preset.builtin || preset.template !== LEGACY_DEFAULT_TEMPLATES[preset.id]) continue
      const next = DEFAULT_PROMPT_PRESETS.find(item => item.id === preset.id)
      if (next) preset.template = next.template
    }
  }
  return { presets: state.presets, needsWrite: true }
}

async function writePresetState(path: string, presets: PromptPreset[]): Promise<void> {
  await writeJson(path, { version: PRESET_FILE_VERSION, presets })
}

export function createPromptPresetStore(dataDir: string): PromptPresetStore {
  const path = presetsPath(dataDir)

  return {
    async list() {
      const state = await readPresetState(path)
      if (!state.needsWrite) return state.presets
      return enqueueWrite(path, async () => {
        const current = await readPresetState(path)
        if (current.needsWrite) await writePresetState(path, current.presets)
        return current.presets
      })
    },

    async save(input) {
      const title = assertTitle(input.title)
      const template = assertTemplate(input.template)
      const id = typeof input.id === 'string' && input.id.trim() ? assertId(input.id.trim()) : null
      return enqueueWrite(path, async () => {
        const { presets } = await readPresetState(path)
        const index = id ? presets.findIndex(item => item.id === id) : -1
        if (id && index === -1) throw new Error(`preset not found: ${id}`)
        if (index >= 0) {
          presets[index] = { ...presets[index], title, template }
          await writePresetState(path, presets)
          return presets[index]
        }
        const preset: PromptPreset = {
          id: `preset-${randomBytes(4).toString('hex')}`,
          title,
          template,
          builtin: false,
        }
        presets.push(preset)
        await writePresetState(path, presets)
        return preset
      })
    },

    async remove(id) {
      const presetId = assertId(id)
      return enqueueWrite(path, async () => {
        const { presets } = await readPresetState(path)
        const index = presets.findIndex(item => item.id === presetId)
        if (index === -1) return false
        presets.splice(index, 1)
        await writePresetState(path, presets)
        return true
      })
    },

    async reset() {
      return enqueueWrite(path, async () => {
        const presets = DEFAULT_PROMPT_PRESETS.map(item => ({ ...item }))
        await writePresetState(path, presets)
        return presets
      })
    },
  }
}
