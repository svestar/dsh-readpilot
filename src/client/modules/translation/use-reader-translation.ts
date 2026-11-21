import { React } from '../../runtime.ts'
import { messageOf } from '../../lib/helpers.ts'
import {
  DEFAULT_TRANSLATION_PROVIDER,
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
import type { TranslationBlockView } from './blocks.ts'
import type { CallRpc, Screen, Selection, TextFn } from '../../lib/types.ts'
import {
  rememberTranslationEnabled,
  translationEnabledForBook,
} from './session-state.ts'

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
}

export function useReaderTranslation({
  call,
  t,
  screen,
  selection,
  activeSessionId,
}: ReaderTranslationOptions) {
  const bookId = screen.kind === 'book' ? screen.detail.book.id : null
  const chapterId = screen.kind === 'book' ? screen.content.chapterId : ''
  const chapterKey = `${bookId ?? ''}\u0000${chapterId}`
  const [enabled, setEnabledState] = React.useState(() => translationEnabledForBook(bookId))
  const [targetLanguage, setTargetLanguageState] = React.useState(readTranslationTarget)
  const [provider, setProviderState] = React.useState(readTranslationProvider)
  const [noticeAcknowledged, setNoticeAcknowledged] = React.useState(readTranslationNotice)
  const [providers, setProviders] = React.useState<TranslationProviderList>({ available: false, providers: [] })
  const [blocks, setBlocks] = React.useState<Record<number, BlockTranslation>>({})
  const [selectionResult, setSelectionResult] = React.useState<SelectionTranslation | null>(null)
  const [panelError, setPanelError] = React.useState('')
  const [revision, setRevision] = React.useState(0)
  const selectionRequestRef = React.useRef(0)
  const versionRef = React.useRef(0)
  const viewKeyRef = React.useRef('')

  const refreshProviders = React.useCallback(async () => {
    try {
      const value = await call('translationProviders')
      setProviders({
        available: value?.available === true,
        providers: Array.isArray(value?.providers) ? value.providers : [],
      })
    } catch {
      setProviders({ available: false, providers: [] })
    }
  }, [call])

  React.useEffect(() => {
    void refreshProviders()
  }, [refreshProviders])

  React.useEffect(() => {
    setEnabledState(translationEnabledForBook(bookId))
    setBlocks({})
    setSelectionResult(null)
  }, [bookId])

  React.useEffect(() => {
    versionRef.current += 1
    selectionRequestRef.current += 1
    setBlocks({})
    setSelectionResult(null)
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
    selectionRequestRef.current += 1
    setBlocks({})
    setSelectionResult(null)
  }, [])

  const setProvider = React.useCallback((value: string) => {
    setProviderState(value)
    saveTranslationProvider(value)
    versionRef.current += 1
    selectionRequestRef.current += 1
    setBlocks({})
    setSelectionResult(null)
  }, [])

  const acknowledgeNotice = React.useCallback(() => {
    setNoticeAcknowledged(true)
    saveTranslationNotice(true)
  }, [])

  const setEnabled = React.useCallback((value: boolean) => {
    setEnabledState(value)
    rememberTranslationEnabled(bookId, value)
    if (!value) {
      versionRef.current += 1
      setBlocks({})
      setPanelError('')
    }
  }, [bookId])

  const toggleEnabled = React.useCallback(() => {
    setEnabled(!enabled)
  }, [enabled, setEnabled])

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
    const request = selectionRequestRef.current + 1
    selectionRequestRef.current = request
    try {
      const value: TranslationResult = await call('translate', requestArgs(source))
      if (versionRef.current !== version || selectionRequestRef.current !== request) return
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
      if (versionRef.current !== version || selectionRequestRef.current !== request) return
      setSelectionResult({ ...result, loading: false, error: messageOf(cause) })
    }
  }, [call, requestArgs, selection])

  const closeSelection = React.useCallback(() => {
    selectionRequestRef.current += 1
    setSelectionResult(null)
  }, [])

  const setViewKey = React.useCallback((key: string) => {
    viewKeyRef.current = key
  }, [])

  const dropLoading = React.useCallback((usable: TranslationBlockView[]) => {
    setBlocks(current => {
      const next = { ...current }
      for (const block of usable) {
        if (next[block.index]?.loading) delete next[block.index]
      }
      return next
    })
  }, [])

  const translateAll = React.useCallback(async (list: TranslationBlockView[], viewKey = ''): Promise<void> => {
    const usable = list.filter(block => block.text.trim()).slice(0, 80)
    if (usable.length === 0) return
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
      if (versionRef.current !== version) return
      if (viewKeyRef.current !== viewKey) {
        dropLoading(usable)
        return
      }
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
      setRevision(current => current + 1)
    } catch (cause) {
      if (versionRef.current !== version) return
      if (viewKeyRef.current !== viewKey) {
        dropLoading(usable)
        return
      }
      setPanelError(t('translationFailed') + `：${messageOf(cause)}`)
      setBlocks(current => {
        const next = { ...current }
        for (const block of usable) {
          const previous = next[block.index]
          if (previous?.loading) next[block.index] = { ...previous, loading: false, error: messageOf(cause) }
        }
        return next
      })
      setRevision(current => current + 1)
    }
  }, [activeSessionId, call, dropLoading, providerArg, t, targetLanguage])

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

  const pending = React.useMemo(
    () => Object.values(blocks).some(block => block.loading),
    [blocks],
  )

  return {
    enabled,
    pending,
    targetLanguage,
    provider,
    providers,
    noticeAcknowledged,
    blocks,
    selectionResult,
    panelError,
    revision,
    setEnabled,
    toggleEnabled,
    setTargetLanguage,
    setProvider,
    acknowledgeNotice,
    translateSelection,
    closeSelection,
    setViewKey,
    translateAll,
    clearCache,
    defaultProvider: DEFAULT_TRANSLATION_PROVIDER,
  }
}
