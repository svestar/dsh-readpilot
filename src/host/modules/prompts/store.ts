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

interface PresetOverride {
  title: string
  template: string
}

interface PresetFile {
  version: 5
  overrides: Record<string, PresetOverride>
  hidden: string[]
}

interface LegacyPreset extends PromptPreset {
  edited?: boolean
}

const MAX_TITLE = 40
const MAX_TEMPLATE = 4000
const ID_PATTERN = /^[a-z0-9-]{1,64}$/
const PRESET_FILE_VERSION = 5
const NEW_DEFAULT_IDS = ['character', 'craft', 'background', 'argument', 'quote', 'questions', 'connect']

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

function normalizeOverride(id: string, value: unknown): PresetOverride | null {
  if (!value || typeof value !== 'object') return null
  const source = value as Record<string, unknown>
  if (typeof source.title !== 'string' || typeof source.template !== 'string') return null
  const title = source.title.trim()
  const template = source.template.trim()
  if (!ID_PATTERN.test(id) || !title || !template) return null
  return { title, template }
}

function normalizeLegacy(value: unknown): LegacyPreset | null {
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

function defaultPresetOf(id: string, language: WorkspaceLanguage): PromptPreset | undefined {
  const defaults = language === 'en' ? DEFAULT_PROMPT_PRESETS_EN : DEFAULT_PROMPT_PRESETS
  return defaults.find(item => item.id === id)
}

function isKnownDefault(preset: LegacyPreset): boolean {
  if (!preset.builtin) return false
  const zh = defaultPresetOf(preset.id, 'zh')
  const en = defaultPresetOf(preset.id, 'en')
  if (zh && preset.title === zh.title && preset.template === zh.template) return true
  if (en && preset.title === en.title && preset.template === en.template) return true
  const legacy = LEGACY_DEFAULT_TEMPLATES[preset.id]
  if (preset.id === 'translate' && preset.title === '翻译') {
    return preset.template === zh?.template || preset.template === legacy
  }
  return Boolean(legacy && preset.template === legacy && preset.title === zh?.title)
}

function emptyFile(): PresetFile {
  return { version: PRESET_FILE_VERSION, overrides: {}, hidden: [] }
}

function migrateLegacy(value: unknown): PresetFile | null {
  let presets: LegacyPreset[] = []
  let version = 0
  if (Array.isArray(value)) {
    presets = value.map(normalizeLegacy).filter((item): item is LegacyPreset => item !== null)
    version = 1
  } else if (value && typeof value === 'object' && Array.isArray((value as Record<string, unknown>).presets)) {
    presets = ((value as Record<string, unknown>).presets as unknown[])
      .map(normalizeLegacy)
      .filter((item): item is LegacyPreset => item !== null)
    version = Number((value as Record<string, unknown>).version) || 0
  } else {
    return null
  }

  const file = emptyFile()
  const seen = new Set<string>()
  for (const preset of presets) {
    seen.add(preset.id)
    if (preset.builtin) {
      if (!isKnownDefault(preset)) file.overrides[preset.id] = { title: preset.title, template: preset.template }
    } else {
      file.overrides[preset.id] = { title: preset.title, template: preset.template }
    }
  }
  const lateIds = new Set(NEW_DEFAULT_IDS)
  for (const preset of DEFAULT_PROMPT_PRESETS) {
    if (seen.has(preset.id)) continue
    if (version < 2 && lateIds.has(preset.id)) continue
    file.hidden.push(preset.id)
  }
  return file
}

function parseFile(value: unknown): PresetFile | null {
  if (value === null) return null
  if (value && typeof value === 'object' && !Array.isArray(value) && 'overrides' in value) {
    const source = value as Record<string, unknown>
    const rawOverrides = source.overrides
    const file = emptyFile()
    if (rawOverrides && typeof rawOverrides === 'object' && !Array.isArray(rawOverrides)) {
      for (const [id, override] of Object.entries(rawOverrides)) {
        const normalized = normalizeOverride(id, override)
        if (normalized) file.overrides[id] = normalized
      }
    }
    if (Array.isArray(source.hidden)) {
      file.hidden = source.hidden.filter((id): id is string => typeof id === 'string' && ID_PATTERN.test(id))
    }
    return file
  }
  return migrateLegacy(value)
}

async function readPresetFile(path: string): Promise<{ file: PresetFile; needsWrite: boolean }> {
  const raw = await readJson<unknown>(path, null)
  const file = parseFile(raw)
  if (!file) return { file: emptyFile(), needsWrite: false }
  const version = raw && typeof raw === 'object' && !Array.isArray(raw)
    ? Number((raw as Record<string, unknown>).version) || 0
    : 0
  return { file, needsWrite: version !== PRESET_FILE_VERSION }
}

async function writePresetFile(path: string, file: PresetFile): Promise<void> {
  await writeJson(path, { version: PRESET_FILE_VERSION, overrides: file.overrides, hidden: file.hidden })
}

function renderList(file: PresetFile, language: WorkspaceLanguage): PromptPreset[] {
  const defaults = language === 'en' ? DEFAULT_PROMPT_PRESETS_EN : DEFAULT_PROMPT_PRESETS
  const defaultIds = new Set(DEFAULT_PROMPT_PRESETS.map(item => item.id))
  const hidden = new Set(file.hidden)
  const builtins = defaults
    .filter(item => !hidden.has(item.id))
    .map(item => {
      const override = file.overrides[item.id]
      return {
        id: item.id,
        title: override?.title ?? item.title,
        template: override?.template ?? item.template,
        builtin: true,
      }
    })
  const custom = Object.entries(file.overrides)
    .filter(([id]) => !defaultIds.has(id))
    .map(([id, override]) => ({ id, title: override.title, template: override.template, builtin: false }))
  return [...builtins, ...custom]
}

export function createPromptPresetStore(dataDir: string): PromptPresetStore {
  const path = presetsPath(dataDir)

  return {
    async list(language = 'zh') {
      const state = await readPresetFile(path)
      if (!state.needsWrite) return renderList(state.file, language)
      return enqueueWrite(path, async () => {
        const current = await readPresetFile(path)
        if (current.needsWrite) await writePresetFile(path, current.file)
        return renderList(current.file, language)
      })
    },

    async save(input, language = 'zh') {
      const title = assertTitle(input.title)
      const template = assertTemplate(input.template)
      const id = typeof input.id === 'string' && input.id.trim() ? assertId(input.id.trim()) : null
      return enqueueWrite(path, async () => {
        const { file } = await readPresetFile(path)
        if (id) {
          const builtin = defaultPresetOf(id, language)
          if (builtin) {
            file.hidden = file.hidden.filter(item => item !== id)
            if (builtin.title === title && builtin.template === template) {
              delete file.overrides[id]
              await writePresetFile(path, file)
              return { ...builtin, builtin: true }
            }
            file.overrides[id] = { title, template }
            await writePresetFile(path, file)
            return { id, title, template, builtin: true }
          }
          if (!file.overrides[id]) throw new Error(`preset not found: ${id}`)
          file.overrides[id] = { title, template }
          await writePresetFile(path, file)
          return { id, title, template, builtin: false }
        }
        const presetId = `preset-${randomBytes(4).toString('hex')}`
        file.overrides[presetId] = { title, template }
        await writePresetFile(path, file)
        return { id: presetId, title, template, builtin: false }
      })
    },

    async remove(id) {
      const presetId = assertId(id)
      return enqueueWrite(path, async () => {
        const { file } = await readPresetFile(path)
        const builtin = DEFAULT_PROMPT_PRESETS.some(item => item.id === presetId)
        if (builtin) {
          if (file.hidden.includes(presetId) && !file.overrides[presetId]) return false
          delete file.overrides[presetId]
          if (!file.hidden.includes(presetId)) file.hidden.push(presetId)
          await writePresetFile(path, file)
          return true
        }
        if (!file.overrides[presetId]) return false
        delete file.overrides[presetId]
        await writePresetFile(path, file)
        return true
      })
    },

    async reset() {
      return enqueueWrite(path, async () => {
        const file = emptyFile()
        await writePresetFile(path, file)
        return renderList(file, 'zh')
      })
    },
  }
}
