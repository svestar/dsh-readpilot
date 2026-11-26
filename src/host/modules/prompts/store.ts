import { randomBytes } from 'node:crypto'
import { join } from 'node:path'
import type { PromptPreset } from '../../../shared/contracts/prompts.ts'
import type { WorkspaceLanguage } from '../../../shared/contracts/library.ts'
import { readJson, writeJson } from '../../lib/fs-json.ts'
import { enqueueWrite } from '../../lib/write-queue.ts'
import { DEFAULT_PROMPT_PRESETS, DEFAULT_PROMPT_PRESETS_EN, LEGACY_DEFAULT_TEMPLATES } from './defaults.ts'
export { DEFAULT_PROMPT_PRESETS, DEFAULT_PROMPT_PRESETS_EN } from './defaults.ts'

export type { PromptPreset } from '../../../shared/contracts/prompts.ts'

export interface PromptPresetInput {
  id?: unknown
  title?: unknown
  template?: unknown
}

export interface PromptPresetStore {
  list(language?: WorkspaceLanguage): Promise<PromptPreset[]>
  save(input: PromptPresetInput, language?: WorkspaceLanguage): Promise<PromptPreset>
  remove(id: unknown): Promise<boolean>
  reset(): Promise<PromptPreset[]>
}

const MAX_TITLE = 40
const MAX_TEMPLATE = 4000
const ID_PATTERN = /^[a-z0-9-]{1,64}$/

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
  return {
    id,
    title,
    template,
    builtin: source.builtin === true,
    ...(source.edited === true ? { edited: true } : {}),
  }
}

function defaultPresetOf(preset: PromptPreset, language: WorkspaceLanguage): PromptPreset | undefined {
  const defaults = language === 'en' ? DEFAULT_PROMPT_PRESETS_EN : DEFAULT_PROMPT_PRESETS
  return defaults.find(item => item.id === preset.id)
}

function isKnownDefault(preset: PromptPreset): boolean {
  if (!preset.builtin) return false
  const zh = defaultPresetOf(preset, 'zh')
  const en = defaultPresetOf(preset, 'en')
  if (zh && preset.title === zh.title && preset.template === zh.template) return true
  if (en && preset.title === en.title && preset.template === en.template) return true
  const legacy = LEGACY_DEFAULT_TEMPLATES[preset.id]
  if (preset.id === 'translate' && preset.title === '翻译') {
    return preset.template === zh?.template || preset.template === legacy
  }
  if (!legacy || preset.template !== legacy) return false
  return preset.title === zh?.title
}

/** Whether the value still matches the shipped default in the language being edited. */
function isDefaultPresetValue(
  preset: PromptPreset,
  title: string,
  template: string,
  language: WorkspaceLanguage,
): boolean {
  const defaults = language === 'en' ? DEFAULT_PROMPT_PRESETS_EN : DEFAULT_PROMPT_PRESETS
  const item = defaults.find(candidate => candidate.id === preset.id)
  if (item && item.title === title && item.template === template) return true
  return language === 'zh' && LEGACY_DEFAULT_TEMPLATES[preset.id] === template
}

function localizePreset(preset: PromptPreset, language: WorkspaceLanguage): PromptPreset {
  if (!preset.builtin || preset.edited) return preset
  const fallback = defaultPresetOf(preset, language)
  return fallback ? { ...preset, title: fallback.title, template: fallback.template } : preset
}

const PRESET_FILE_VERSION = 4
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
  if (state.version < 4) {
    for (const preset of state.presets) {
      if (!preset.builtin || preset.edited !== undefined) continue
      preset.edited = !isKnownDefault(preset)
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
    async list(language = 'zh') {
      const state = await readPresetState(path)
      if (!state.needsWrite) return state.presets.map(item => localizePreset(item, language))
      return enqueueWrite(path, async () => {
        const current = await readPresetState(path)
        if (current.needsWrite) await writePresetState(path, current.presets)
        return current.presets.map(item => localizePreset(item, language))
      })
    },

    async save(input, language = 'zh') {
      const title = assertTitle(input.title)
      const template = assertTemplate(input.template)
      const id = typeof input.id === 'string' && input.id.trim() ? assertId(input.id.trim()) : null
      return enqueueWrite(path, async () => {
        const { presets } = await readPresetState(path)
        const index = id ? presets.findIndex(item => item.id === id) : -1
        if (id && index === -1) throw new Error(`preset not found: ${id}`)
        if (index >= 0) {
          const current = presets[index]
          if (current.builtin && !current.edited) {
            if (isDefaultPresetValue(current, title, template, language)) return current
            presets[index] = { ...current, title, template, edited: true }
          } else {
            if (current.title === title && current.template === template) return current
            presets[index] = { ...current, title, template }
          }
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
