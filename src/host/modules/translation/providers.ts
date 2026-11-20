const GOOGLE_ENDPOINT = 'https://translate.googleapis.com/translate_a/single'
const BING_ENDPOINT = 'https://edge.microsoft.com/translate/translatetext'
const TIMEOUT_MS = 10_000
const MAX_RESPONSE_BYTES = 1024 * 1024

export type AnonymousProvider = 'google' | 'bing'

function language(tag: string, provider: AnonymousProvider): string {
  const lower = tag.toLowerCase()
  if (['zh', 'zh-cn', 'zh-sg', 'zh-hans'].includes(lower)) return provider === 'google' ? 'zh-CN' : 'zh-Hans'
  if (['zh-tw', 'zh-hk', 'zh-mo', 'zh-hant'].includes(lower)) return provider === 'google' ? 'zh-TW' : 'zh-Hant'
  return tag
}

function translationOf(payload: any, provider: AnonymousProvider): string {
  if (provider === 'google') {
    if (!Array.isArray(payload) || !Array.isArray(payload[0])) throw new Error('Google 返回了无效的翻译结果')
    const text = payload[0]
      .map((segment: any) => Array.isArray(segment) && typeof segment[0] === 'string' ? segment[0] : '')
      .join('')
    if (!text) throw new Error('Google 返回了空译文')
    return text
  }
  const first = Array.isArray(payload) ? payload[0] : null
  const translated = first && Array.isArray(first.translations) ? first.translations[0] : null
  if (!translated || typeof translated.text !== 'string' || !translated.text) {
    throw new Error('Bing 返回了无效的翻译结果')
  }
  return translated.text
}

/** Minimal anonymous provider used when the host translator service is not mounted. */
export async function anonymousTranslate(
  provider: AnonymousProvider,
  text: string,
  sourceLanguage: string,
  targetLanguage: string,
): Promise<string> {
  const source = language(sourceLanguage, provider)
  const target = language(targetLanguage, provider)
  let url: URL
  let body: string
  let contentType: string
  if (provider === 'google') {
    url = new URL(GOOGLE_ENDPOINT)
    const form = new URLSearchParams({
      client: 'gtx',
      sl: source,
      tl: target,
      dt: 't',
      q: text,
    })
    body = form.toString()
    contentType = 'application/x-www-form-urlencoded'
  } else {
    url = new URL(BING_ENDPOINT)
    if (source !== 'auto') url.searchParams.set('from', source)
    url.searchParams.set('to', target)
    url.searchParams.set('isEnterpriseClient', 'false')
    body = JSON.stringify([text])
    contentType = 'application/json'
  }
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': contentType },
    body,
    signal: AbortSignal.timeout(TIMEOUT_MS),
  })
  if (!response.ok) throw new Error(`${provider} 返回 HTTP ${response.status}`)
  const raw = await response.text()
  if (raw.length > MAX_RESPONSE_BYTES) throw new Error(`${provider} 响应过大`)
  let payload: unknown
  try {
    payload = JSON.parse(raw)
  } catch {
    throw new Error(`${provider} 返回的不是 JSON`)
  }
  return translationOf(payload, provider)
}
