import { createHash } from 'node:crypto'
import { join } from 'node:path'
import { readJson, writeJson } from '../../lib/fs-json.ts'
import { enqueueWrite } from '../../lib/write-queue.ts'

const MAX_ENTRIES = 3000

export interface TranslationCacheEntry {
  text: string
  provider: string
  targetLanguage: string
  sourceLanguage: string
  createdAt: number
}

interface CacheFile {
  version: 1
  entries: Record<string, TranslationCacheEntry>
}

export function translationCacheKey(input: {
  provider: string
  sourceLanguage: string
  targetLanguage: string
  text: string
}): string {
  return createHash('sha256')
    .update(`${input.provider}\u0000${input.sourceLanguage}\u0000${input.targetLanguage}\u0000${input.text}`)
    .digest('hex')
}

/** Persistent raw-text cache; it never touches notes or the companion session. */
export function createTranslationCache(dataDir: string) {
  const path = join(dataDir, 'translations.json')
  const key = `translations:${dataDir}`
  let entries: Record<string, TranslationCacheEntry> | null = null

  async function load(): Promise<Record<string, TranslationCacheEntry>> {
    if (entries) return entries
    const value = await readJson<CacheFile>(path, { version: 1, entries: {} })
    entries = value?.version === 1 && value.entries && typeof value.entries === 'object'
      ? value.entries
      : {}
    return entries
  }

  async function save(next: Record<string, TranslationCacheEntry>): Promise<void> {
    const keys = Object.keys(next)
    if (keys.length > MAX_ENTRIES) {
      keys
        .sort((left, right) => (next[left]?.createdAt ?? 0) - (next[right]?.createdAt ?? 0))
        .slice(0, keys.length - MAX_ENTRIES)
        .forEach(key => delete next[key])
    }
    await enqueueWrite(key, () => writeJson(path, { version: 1, entries: next } satisfies CacheFile))
  }

  async function get(input: Parameters<typeof translationCacheKey>[0]): Promise<TranslationCacheEntry | undefined> {
    const current = await load()
    return current[translationCacheKey(input)]
  }

  async function set(input: Parameters<typeof translationCacheKey>[0] & { sourceText: string; text: string }): Promise<void> {
    const current = await load()
    current[translationCacheKey({ ...input, text: input.sourceText })] = {
      text: input.text,
      provider: input.provider,
      targetLanguage: input.targetLanguage,
      sourceLanguage: input.sourceLanguage,
      createdAt: Date.now(),
    }
    await save(current)
  }

  async function clear(): Promise<void> {
    entries = {}
    await save(entries)
  }

  return { get, set, clear }
}
