export interface DigestChapterInput {
  id: string
  title: string
  text: string
}

export interface DigestChapter {
  id: string
  title: string
  chars: number
  excerpt: string
  truncated: boolean
}

export interface BookDigest {
  chapters: DigestChapter[]
  totalChars: number
  returnedChars: number
  truncated: boolean
  coverage: 'full' | 'extractive'
}

export interface DigestOptions {
  maxChars?: number
  perChapterChars?: number
}

const DEFAULT_MAX_CHARS = 12000
const MAX_CHARS = 30000
const DEFAULT_CHAPTER_CHARS = 600
const MAX_CHAPTER_CHARS = 2000

function positive(value: unknown, fallback: number, max: number): number {
  const number = Number(value)
  if (!Number.isFinite(number) || number <= 0) return fallback
  return Math.max(80, Math.min(max, Math.round(number)))
}

function normalize(text: string): string {
  return text.replace(/\r\n?/g, '\n').replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim()
}

function sentencesOf(text: string): string[] {
  const sentences: string[] = []
  for (const line of text.split(/\n+/)) {
    const trimmed = line.trim()
    if (!trimmed) continue
    for (const sentence of trimmed.split(/(?<=[。！？!?；;])/u)) {
      const value = sentence.trim()
      if (value) sentences.push(value)
      if (sentences.length >= 4000) return sentences
    }
  }
  return sentences
}

function termFrequency(text: string): Map<string, number> {
  const compact = text.replace(/[^\p{L}\p{N}]/gu, '')
  const frequency = new Map<string, number>()
  for (let index = 0; index < compact.length - 1; index += 1) {
    const term = compact.slice(index, index + 2)
    frequency.set(term, (frequency.get(term) ?? 0) + 1)
  }
  return frequency
}

function sentenceScore(sentence: string, frequency: Map<string, number>): number {
  const compact = sentence.replace(/[^\p{L}\p{N}]/gu, '')
  if (!compact) return 0
  let score = 0
  for (let index = 0; index < compact.length - 1; index += 1) {
    score += frequency.get(compact.slice(index, index + 2)) ?? 0
  }
  return score / Math.sqrt(compact.length)
}

function excerptOf(text: string, budget: number): { excerpt: string; truncated: boolean } {
  if (text.length <= budget) return { excerpt: text, truncated: false }
  const sentences = sentencesOf(text)
  if (sentences.length <= 1) return { excerpt: text.slice(0, budget), truncated: true }
  const frequency = termFrequency(text)
  const picks = new Set<number>([0, sentences.length - 1])
  const ranked = sentences
    .map((sentence, index) => ({ index, score: sentenceScore(sentence, frequency) }))
    .sort((left, right) => right.score - left.score)
  for (const candidate of ranked) {
    if (picks.size >= 12) break
    picks.add(candidate.index)
  }
  const ordered = [...picks].sort((left, right) => left - right)
  const parts: string[] = []
  let size = 0
  for (const index of ordered) {
    const sentence = sentences[index]
    if (size + sentence.length + 1 > budget) continue
    parts.push(sentence)
    size += sentence.length + 1
  }
  if (parts.length === 0) return { excerpt: text.slice(0, budget), truncated: true }
  return { excerpt: parts.join(' '), truncated: true }
}

export function buildBookDigest(chapters: readonly DigestChapterInput[], options: DigestOptions = {}): BookDigest {
  const maxChars = positive(options.maxChars, DEFAULT_MAX_CHARS, MAX_CHARS)
  const perChapterChars = positive(options.perChapterChars, DEFAULT_CHAPTER_CHARS, MAX_CHAPTER_CHARS)
  const prepared = chapters.map(chapter => ({
    id: chapter.id,
    title: chapter.title,
    text: normalize(chapter.text),
  }))
  const totalChars = prepared.reduce((sum, chapter) => sum + chapter.text.length, 0)
  const full = totalChars <= maxChars
  const chapterBudget = full
    ? maxChars
    : Math.max(80, Math.min(perChapterChars, Math.floor(maxChars / Math.max(1, prepared.length))))
  const result = prepared.map(chapter => {
    const selected = full
      ? { excerpt: chapter.text, truncated: false }
      : excerptOf(chapter.text, chapterBudget)
    return {
      id: chapter.id,
      title: chapter.title,
      chars: chapter.text.length,
      excerpt: selected.excerpt,
      truncated: selected.truncated || selected.excerpt.length < chapter.text.length,
    }
  })
  const returnedChars = result.reduce((sum, chapter) => sum + chapter.excerpt.length, 0)
  return {
    chapters: result,
    totalChars,
    returnedChars,
    truncated: result.some(chapter => chapter.truncated),
    coverage: full ? 'full' : 'extractive',
  }
}
