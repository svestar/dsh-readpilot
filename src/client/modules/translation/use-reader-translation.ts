import { React } from '../../runtime.ts'
import { messageOf } from '../../lib/helpers.ts'
import {
  DEFAULT_TRANSLATION_PROVIDER,
  DEFAULT_TRANSLATION_TARGET,
  readTranslationNotice,
  readTranslationProvider,
  readTranslationTarget,
  saveTranslationNotice,
  saveTranslationProvider,
  saveTranslationTarget,
} from '../../lib/translation-preferences.ts'
import type {
  TranslationBatchResult,
  TranslationProviderList,
  TranslationResult,
} from '../../../shared/contracts/translation.ts'
import type { CallRpc, Screen, Selection, TextFn } from '../../lib/types.ts'

export interface TranslationBlockView {
  index: number
  text: string
}

export interface BlockTranslation {
  text: string
  provider: string
  cached: boolean
  loading: boolean
  error: string
}

export interface SelectionTranslation {
  source: string
  text: string
  provider: string
  cached: boolean
  loading: boolean
  error: string
  x: number
  y: number
}

interface ReaderTranslationOptions {
  call: CallRpc
  t: TextFn
  screen: Screen
  selection: Selection | null
  activeSessionId: string | null
  setChatOpen: (value: boolean) => void
  setChatTab: (value: string) => void
}

export function useReaderTranslation({
  call,
  t,
  screen,
  selection,
  activeSessionId,
  setChatOpen,
  setChatTab,
}: ReaderTranslationOptions) {
  const [targetLanguage, setTargetLanguageState] = React.useState(readTranslationTarget)
  const [provider, setProviderState] = React.useState(readTranslationProvider)
  const [noticeAcknowledged, setNoticeAcknowledged] = React.useState(readTranslationNotice)
  const [providers, setProviders] = React.useState<TranslationProviderList>({ available: false, providers: [] })
  const [providersLoading, setProvidersLoading] = React.useState(false)
  const [blocks, setBlocks] = React.useState<Record<number, BlockTranslation>>({})
  const [selectionResult, setSelectionResult] = React.useState<SelectionTranslation | null>(null)
  const [panelError, setPanelError] = React.useState('')
  const requestRef = React.useRef(0)
  const versionRef = React.useRef(0)

  const bookId = screen.kind === 'book' ? screen.detail.book.id : null
  const chapterId = screen.kind === 'book' ? screen.content.chapterId : ''
  const chapterKey = `${bookId ?? ''}\u0000${chapterId}`
  const chapterKeyRef = React.useRef(chapterKey)
  chapterKeyRef.current = chapterKey

  const refreshProviders = React.useCallback(async () => {
    setProvidersLoading(true)
    try {
      const value = await call('translationProviders')
      setProviders({
        available: value?.available === true,
        providers: Array.isArray(value?.providers) ? value.providers : [],
      })
    } catch {
      setProviders({ available: false, providers: [] })
    } finally {
      setProvidersLoading(false)
    }
  }, [call])

  React.useEffect(() => {
    void refreshProviders()
  }, [refreshProviders])

  React.useEffect(() => {
    versionRef.current += 1
    setBlocks({})
    setPanelError('')
  }, [chapterKey])

  React.useEffect(() => {
    setSelectionResult(null)
  }, [bookId])

  const providerArg = provider === DEFAULT_TRANSLATION_PROVIDER ? undefined : provider
  const requestArgs = React.useCallback((text: string) => ({
    text,
    targetLanguage,
    ...(providerArg ? { provider: providerArg } : {}),
    ...(activeSessionId ? { sessionId: activeSessionId } : {}),
  }), [activeSessionId, providerArg, targetLanguage])

  const setTargetLanguage = React.useCallback((value: string) => {
    setTargetLanguageState(value)
    saveTranslationTarget(value)
    versionRef.current += 1
    setBlocks({})
    setSelectionResult(null)
  }, [])

  const setProvider = React.useCallback((value: string) => {
    setProviderState(value)
    saveTranslationProvider(value)
    versionRef.current += 1
    setBlocks({})
    setSelectionResult(null)
  }, [])

  const acknowledgeNotice = React.useCallback(() => {
    setNoticeAcknowledged(true)
    saveTranslationNotice(true)
  }, [])

  const openPanel = React.useCallback(() => {
    setChatOpen(true)
    setChatTab('translate')
    void refreshProviders()
  }, [refreshProviders, setChatOpen, setChatTab])

  const translateSelection = React.useCallback(async (): Promise<void> => {
    const source = selection?.text?.trim() ?? ''
    if (!source) return
    const result: SelectionTranslation = {
      source,
      text: '',
      provider: '',
      cached: false,
      loading: true,
      error: '',
      x: selection?.x ?? 0,
      y: selection?.y ?? 0,
    }
    setSelectionResult(result)
    const version = versionRef.current
    try {
      const value: TranslationResult = await call('translate', requestArgs(source))
      if (versionRef.current !== version) return
      setSelectionResult({
        source,
        text: value?.text ?? '',
        provider: value?.provider ?? '',
        cached: value?.cached === true,
        loading: false,
        error: '',
        x: result.x,
        y: result.y,
      })
    } catch (cause) {
      if (versionRef.current !== version) return
      setSelectionResult({ ...result, loading: false, error: messageOf(cause) })
    }
  }, [call, requestArgs, selection])

  const closeSelection = React.useCallback(() => setSelectionResult(null), [])

  const translateBlock = React.useCallback(async (block: TranslationBlockView): Promise<void> => {
    const source = block.text.trim()
    if (!source) return
    setBlocks(current => ({
      ...current,
      [block.index]: { text: '', provider: '', cached: false, loading: true, error: '' },
    }))
    const version = versionRef.current
    try {
      const value: TranslationResult = await call('translate', requestArgs(source))
      if (versionRef.current !== version) return
      setBlocks(current => ({
        ...current,
        [block.index]: {
          text: value?.text ?? '',
          provider: value?.provider ?? '',
          cached: value?.cached === true,
          loading: false,
          error: '',
        },
      }))
    } catch (cause) {
      if (versionRef.current !== version) return
      setBlocks(current => ({
        ...current,
        [block.index]: { text: '', provider: '', cached: false, loading: false, error: messageOf(cause) },
      }))
    }
  }, [call, requestArgs])

  const translateAll = React.useCallback(async (list: TranslationBlockView[]): Promise<void> => {
    const usable = list.filter(block => block.text.trim()).slice(0, 80)
    if (usable.length === 0) return
    const request = requestRef.current + 1
    requestRef.current = request
    const version = versionRef.current
    setPanelError('')
    setBlocks(current => {
      const next = { ...current }
      for (const block of usable) {
        next[block.index] = { text: '', provider: '', cached: false, loading: true, error: '' }
      }
      return next
    })
    try {
      const value: TranslationBatchResult = await call('translateBatch', {
        targetLanguage,
        ...(providerArg ? { provider: providerArg } : {}),
        ...(activeSessionId ? { sessionId: activeSessionId } : {}),
        items: usable.map(block => ({ id: String(block.index), text: block.text })),
      })
      if (requestRef.current !== request || versionRef.current !== version) return
      setBlocks(current => {
        const next = { ...current }
        for (const item of value?.items ?? []) {
          const index = Number(item.id)
          if (!Number.isInteger(index)) continue
          next[index] = {
            text: item.text ?? '',
            provider: item.provider ?? '',
            cached: item.cached === true,
            loading: false,
            error: item.error ?? '',
          }
        }
        return next
      })
    } catch (cause) {
      if (requestRef.current === request && versionRef.current === version) {
        setPanelError(t('translationFailed') + `：${messageOf(cause)}`)
        setBlocks(current => {
          const next = { ...current }
          for (const block of usable) {
            const previous = next[block.index]
            if (previous?.loading) next[block.index] = { ...previous, loading: false, error: messageOf(cause) }
          }
          return next
        })
      }
    }
  }, [activeSessionId, call, providerArg, t, targetLanguage])

  const clearCache = React.useCallback(async (): Promise<void> => {
    setPanelError('')
    try {
      await call('translationCacheClear')
      setBlocks({})
      setSelectionResult(null)
    } catch (cause) {
      setPanelError(t('translationFailed') + `：${messageOf(cause)}`)
    }
  }, [call, t])

  return {
    targetLanguage,
    provider,
    providers,
    providersLoading,
    noticeAcknowledged,
    blocks,
    selectionResult,
    panelError,
    setTargetLanguage,
    setProvider,
    acknowledgeNotice,
    openPanel,
    translateSelection,
    closeSelection,
    translateBlock,
    translateAll,
    clearCache,
    refreshProviders,
    defaultTarget: DEFAULT_TRANSLATION_TARGET,
    defaultProvider: DEFAULT_TRANSLATION_PROVIDER,
  }
}
