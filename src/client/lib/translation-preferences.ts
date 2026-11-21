export const TRANSLATION_TARGET_KEY = 'dsh-readpilot.translation-target'
export const TRANSLATION_PROVIDER_KEY = 'dsh-readpilot.translation-provider'
export const TRANSLATION_NOTICE_KEY = 'dsh-readpilot.translation-notice'
export const DEFAULT_TRANSLATION_TARGET = 'zh-CN'
export const DEFAULT_TRANSLATION_PROVIDER = 'bing'

export const TRANSLATION_TARGETS: ReadonlyArray<{ id: string; label: string }> = [
  { id: 'zh-CN', label: '简体中文' },
  { id: 'zh-TW', label: '繁體中文' },
  { id: 'en', label: 'English' },
  { id: 'ja', label: '日本語' },
  { id: 'ko', label: '한국어' },
  { id: 'fr', label: 'Français' },
  { id: 'de', label: 'Deutsch' },
  { id: 'es', label: 'Español' },
  { id: 'ru', label: 'Русский' },
]

export function readTranslationTarget(): string {
  try {
    const value = window.localStorage.getItem(TRANSLATION_TARGET_KEY)
    return typeof value === 'string' && value ? value : DEFAULT_TRANSLATION_TARGET
  } catch {
    return DEFAULT_TRANSLATION_TARGET
  }
}

export function saveTranslationTarget(value: string): void {
  try {
    window.localStorage.setItem(TRANSLATION_TARGET_KEY, value)
  } catch {
    // Translation preference persistence is best effort.
  }
}

export function readTranslationProvider(): string {
  try {
    const value = window.localStorage.getItem(TRANSLATION_PROVIDER_KEY)
    return typeof value === 'string' && value && value !== 'auto' ? value : DEFAULT_TRANSLATION_PROVIDER
  } catch {
    return DEFAULT_TRANSLATION_PROVIDER
  }
}

export function saveTranslationProvider(value: string): void {
  try {
    window.localStorage.setItem(TRANSLATION_PROVIDER_KEY, value)
  } catch {
    // Translation preference persistence is best effort.
  }
}

export function readTranslationNotice(): boolean {
  try {
    return window.localStorage.getItem(TRANSLATION_NOTICE_KEY) === 'acknowledged'
  } catch {
    return false
  }
}

export function saveTranslationNotice(value: boolean): void {
  try {
    window.localStorage.setItem(TRANSLATION_NOTICE_KEY, value ? 'acknowledged' : '')
  } catch {
    // Translation preference persistence is best effort.
  }
}
