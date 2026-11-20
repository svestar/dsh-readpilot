export const TRANSLATION_ENDPOINTS = {
  translationProviders: 'translationProviders',
  translate: 'translate',
  translateBatch: 'translateBatch',
  translationCacheClear: 'translationCacheClear',
} as const

export interface TranslationProviderInfo {
  id: string
  name: string
  paid: boolean
}

export interface TranslationProviderList {
  available: boolean
  providers: TranslationProviderInfo[]
}

export interface TranslationResult {
  text: string
  provider: string
  targetLanguage: string
  cached: boolean
}

export interface TranslationBatchRequestItem {
  id: string
  text: string
}

export interface TranslationBatchResultItem {
  id: string
  text: string
  provider: string
  cached: boolean
  error?: string
}

export interface TranslationBatchResult {
  targetLanguage: string
  items: TranslationBatchResultItem[]
}
