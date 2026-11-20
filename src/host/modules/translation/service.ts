import type {
  TranslationBatchRequestItem,
  TranslationBatchResult,
  TranslationBatchResultItem,
  TranslationProviderInfo,
  TranslationProviderList,
  TranslationResult,
} from '../../../shared/contracts/translation.ts'
import type { HostContext } from '../../types.ts'
import { ReaderError } from '../../lib/errors.ts'
import { anonymousTranslate } from './providers.ts'
import { createTranslationCache } from './store.ts'

const MAX_BATCH_ITEMS = 100
const MAX_BATCH_CHARS = 60_000
const MAX_TEXT_CHARS = 4_000
const BATCH_CONCURRENCY = 2

const PROVIDER_NAMES: Record<string, string> = {
  google: 'Google 翻译',
  bing: 'Bing 翻译',
  'deepseek-account': 'DeepSeek 账户',
  'deepseek-official': 'DeepSeek 官方',
}
const PAID_PROVIDERS = new Set(['deepseek-account', 'deepseek-official'])
const FALLBACK_PROVIDERS = ['bing', 'google']

export interface TranslationServiceOptions {
  dataDir: string
  ctx?: HostContext
}

function translatorOf(ctx?: HostContext): any {
  return ctx?.get?.('translator')
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

function providerInfo(id: string): TranslationProviderInfo {
  return { id, name: PROVIDER_NAMES[id] ?? id, paid: PAID_PROVIDERS.has(id) }
}

export function createTranslationService(options: TranslationServiceOptions) {
  const cache = createTranslationCache(options.dataDir)

  async function translationProviders(): Promise<TranslationProviderList> {
    const translator = translatorOf(options.ctx)
    let available: string[] = []
    if (translator && typeof translator.availableProviders === 'function') {
      try {
        const providers = await translator.availableProviders()
        available = (Array.isArray(providers) ? providers : [])
          .filter((id: unknown): id is string => typeof id === 'string' && id.length > 0)
      } catch {
        available = []
      }
    }
    // The experimental translator service is opt-in. Bing/Google are still
    // reachable directly, so the picker must not disappear when it is absent.
    const providers = [...new Set([...available, ...FALLBACK_PROVIDERS])]
    return { available: true, providers: providers.map(providerInfo) }
  }

  function requestOf(input: any, text: string): any {
    const targetLanguage = typeof input?.targetLanguage === 'string' ? input.targetLanguage.trim() : 'zh-CN'
    if (!targetLanguage) throw new ReaderError('translation-invalid', '缺少目标语言')
    if (!text.trim()) throw new ReaderError('translation-empty', '没有可翻译的文本')
    if (text.length > MAX_TEXT_CHARS) {
      throw new ReaderError('translation-too-long', `单段最多翻译 ${MAX_TEXT_CHARS} 个字符`)
    }
    const provider = typeof input?.provider === 'string' && input.provider && input.provider !== 'auto'
      ? input.provider
      : undefined
    const sourceLanguage = typeof input?.sourceLanguage === 'string' && input.sourceLanguage.trim()
      ? input.sourceLanguage.trim()
      : undefined
    const sessionId = typeof input?.sessionId === 'string' && input.sessionId ? input.sessionId : undefined
    return {
      text,
      targetLanguage,
      ...(provider ? { provider } : {}),
      ...(sourceLanguage ? { sourceLanguage } : {}),
      // Anonymous google/bing must not be written through a Session; only the
      // paid DeepSeek routes need one.
      ...(provider && PAID_PROVIDERS.has(provider) && sessionId ? { sessionId } : {}),
    }
  }

  async function translateOne(input: any, text: string): Promise<TranslationResult> {
    const request = requestOf(input, text)
    const translator = translatorOf(options.ctx)
    const modernTranslator = translator
      && typeof translator.resolve === 'function'
      && typeof translator.translate === 'function'
      ? translator
      : null
    let spec: any
    let provider: string
    let sourceLanguage: string
    let targetLanguage: string
    if (modernTranslator) {
      try {
        spec = modernTranslator.resolve(request)
      } catch (error) {
        throw new ReaderError('translation-invalid', messageOf(error))
      }
      provider = typeof spec?.provider === 'string' ? spec.provider : 'unknown'
      sourceLanguage = typeof spec?.sourceLanguage === 'string' ? spec.sourceLanguage : 'auto'
      targetLanguage = typeof spec?.targetLanguage === 'string' ? spec.targetLanguage : request.targetLanguage
    } else {
      provider = request.provider ?? 'bing'
      if (PAID_PROVIDERS.has(provider)) {
        throw new ReaderError('translation-unavailable', '付费翻译需要宿主启用 translator 服务')
      }
      sourceLanguage = request.sourceLanguage ?? 'auto'
      targetLanguage = request.targetLanguage
    }
    const cached = await cache.get({ provider, sourceLanguage, targetLanguage, text })
    if (cached) return { text: cached.text, provider, targetLanguage, cached: true }
    let translated: string
    try {
      translated = modernTranslator
        ? await modernTranslator.translate(spec)
        : await anonymousTranslate(provider as 'bing' | 'google', text, sourceLanguage, targetLanguage)
    } catch (error) {
      throw new ReaderError('translation-failed', `翻译失败：${messageOf(error)}`)
    }
    if (typeof translated !== 'string' || !translated.trim()) {
      throw new ReaderError('translation-empty', '翻译服务没有返回文本')
    }
    await cache.set({
      provider,
      sourceLanguage,
      targetLanguage,
      sourceText: text,
      text: translated,
    })
    return { text: translated, provider, targetLanguage, cached: false }
  }

  async function translate(input: any = {}): Promise<TranslationResult> {
    const text = typeof input?.text === 'string' ? input.text : ''
    return translateOne(input, text)
  }

  async function translateBatch(input: any = {}): Promise<TranslationBatchResult> {
    const rawItems: TranslationBatchRequestItem[] = Array.isArray(input?.items) ? input.items : []
    if (rawItems.length > MAX_BATCH_ITEMS) {
      throw new ReaderError('translation-too-long', `一次最多翻译 ${MAX_BATCH_ITEMS} 段`)
    }
    const items = rawItems
      .map(item => ({
        id: typeof item?.id === 'string' ? item.id : '',
        text: typeof item?.text === 'string' ? item.text : '',
      }))
      .filter(item => item.id && item.text.trim())
    const total = items.reduce((sum, item) => sum + item.text.length, 0)
    if (total > MAX_BATCH_CHARS) {
      throw new ReaderError('translation-too-long', `一次翻译请控制在 ${MAX_BATCH_CHARS} 个字符内`)
    }
    const results = new Array<TranslationBatchResultItem>(items.length)
    let next = 0
    const fail = (index: number, error: unknown) => {
      const item = items[index]
      results[index] = {
        id: item.id,
        text: '',
        provider: '',
        cached: false,
        error: error instanceof ReaderError ? error.message : messageOf(error),
      }
    }
    const worker = async () => {
      while (next < items.length) {
        const index = next++
        const item = items[index]
        try {
          const result = await translateOne(input, item.text)
          results[index] = { id: item.id, ...result }
        } catch (error) {
          fail(index, error)
        }
      }
    }
    await Promise.all(Array.from({ length: Math.min(BATCH_CONCURRENCY, items.length) }, () => worker()))
    return {
      targetLanguage: typeof input?.targetLanguage === 'string' && input.targetLanguage.trim()
        ? input.targetLanguage.trim()
        : 'zh-CN',
      items: results.filter(Boolean),
    }
  }

  async function translationCacheClear(): Promise<{ cleared: true }> {
    await cache.clear()
    return { cleared: true }
  }

  return { translationProviders, translate, translateBatch, translationCacheClear }
}
