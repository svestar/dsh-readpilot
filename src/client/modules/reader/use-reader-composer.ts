import { React } from '../../runtime.ts'
import { messageOf } from '../../lib/helpers.ts'
import { renderPrompt } from '../../../shared/prompt-render.ts'
import { usePromptPresetActions } from '../companion/use-prompt-preset-actions.ts'
import { quoteDraft } from './SelectionNote.ts'
import type { PromptPreset } from '../../../shared/contracts/prompts.ts'
import type { CallRpc, MutableRef, Note, Screen, Selection, Snapshot, TextFn } from '../../lib/types.ts'
import type { StateSetter } from '../../runtime.ts'

interface ReaderComposerOptions {
  call: CallRpc
  t: TextFn
  screen: Screen
  activeBookId: string | null
  snapshot: Snapshot | null
  setSnapshot: StateSetter<Snapshot | null>
  setError: (value: string) => void
  selection: Selection | null
  setSelection: StateSetter<Selection | null>
  annotations: Note[]
  chat: {
    setDraft: (value: string) => void
    setChatOpen: (value: boolean) => void
    setChatTab: (value: string) => void
    setChatError: (value: string) => void
    chatInputRef: MutableRef<HTMLTextAreaElement | null>
  }
  nativeInputRef: MutableRef<any>
  epubFrameRef: MutableRef<HTMLIFrameElement | null>
}

/** Note-context switches, prompt presets and the composer quote hand-off. */
export function useReaderComposer({
  call,
  t,
  screen,
  activeBookId,
  snapshot,
  setSnapshot,
  setError,
  selection,
  setSelection,
  annotations,
  chat,
  nativeInputRef,
  epubFrameRef,
}: ReaderComposerOptions) {
  const [noteContextBusy, setNoteContextBusy] = React.useState(false)
  const [noteContextCharacters, setNoteContextCharacters] = React.useState(0)
  const noteContextEnabled = Boolean(activeBookId && snapshot?.companion?.notes?.[activeBookId])
  const toggleNoteContext = React.useCallback(async () => {
    if (!activeBookId) return
    const bookId = activeBookId
    setNoteContextBusy(true)
    setError('')
    try {
      const result = await call('setNoteContext', { bookId, enabled: !noteContextEnabled })
      setSnapshot(previous => {
        if (!previous) return previous
        const notes = { ...(previous.companion?.notes ?? {}) }
        if (result.enabled) notes[bookId] = true
        else delete notes[bookId]
        const companion = previous.companion ?? {
          notes: {},
          memory: { mode: 'off' as const, books: {} },
          autoApplyNotes: false,
        }
        return { ...previous, companion: { ...companion, notes } }
      })
      setNoteContextCharacters(result.characters)
    } catch (cause) {
      setError(`${t('noteContextFailed')}：${messageOf(cause)}`)
    } finally {
      setNoteContextBusy(false)
    }
  }, [activeBookId, call, noteContextEnabled, setError, setSnapshot, t])

  React.useEffect(() => {
    setNoteContextCharacters(0)
  }, [activeBookId])

  const noteContext = {
    enabled: noteContextEnabled,
    busy: noteContextBusy,
    characters: noteContextCharacters,
    toggle: toggleNoteContext,
  }

  const autoApplyNotes = Boolean(snapshot?.companion?.autoApplyNotes)
  const [autoApplyBusy, setAutoApplyBusy] = React.useState(false)
  const toggleAutoApply = React.useCallback(async () => {
    setAutoApplyBusy(true)
    setError('')
    try {
      const result = await call('setAutoApplyNotes', { enabled: !autoApplyNotes })
      setSnapshot(previous => previous
        ? {
          ...previous,
          companion: { ...previous.companion, autoApplyNotes: result.enabled },
        }
        : previous)
    } catch (cause) {
      setError(`${t('autoApplyNotesFailed')}：${messageOf(cause)}`)
    } finally {
      setAutoApplyBusy(false)
    }
  }, [autoApplyNotes, call, setError, setSnapshot, t])
  const autoApply = {
    enabled: autoApplyNotes,
    busy: autoApplyBusy,
    toggle: toggleAutoApply,
  }

  const [promptPresets, setPromptPresets] = React.useState<PromptPreset[]>([])
  const [presetManagerOpen, setPresetManagerOpen] = React.useState(false)
  const [presetError, setPresetError] = React.useState('')
  const refreshPromptPresets = React.useCallback(async () => {
    try {
      const value = await call('prompts', { action: 'list' })
      setPromptPresets(Array.isArray(value.presets) ? value.presets : [])
      setPresetError('')
    } catch (cause) {
      setPresetError(`${t('presetLoadFailed')}：${messageOf(cause)}`)
    }
  }, [call, t])

  React.useEffect(() => {
    void refreshPromptPresets()
  }, [refreshPromptPresets])

  const { savePromptPreset, deletePromptPreset, resetPromptPresets } = usePromptPresetActions({
    call,
    t,
    setPromptPresets,
    setPresetError,
  })

  const prefillComposer = React.useCallback((text: string) => {
    const nativeInput = nativeInputRef.current?.inputActions
    let prefilledNative = false
    if (nativeInput && typeof nativeInput.setDraft === 'function') {
      try {
        nativeInput.setDraft(text)
        if (typeof nativeInput.focus === 'function') nativeInput.focus()
        prefilledNative = true
      } catch {
        prefilledNative = false
      }
    }
    if (!prefilledNative) chat.setDraft(text)
    setSelection(null)
    chat.setChatOpen(true)
    chat.setChatTab('chat')
    chat.setChatError('')
    requestAnimationFrame(() => chat.chatInputRef.current?.focus())
  }, [chat, nativeInputRef, setSelection])

  const askCompanion = React.useCallback(() => {
    if (!selection || screen.kind !== 'book') return
    window.getSelection()?.removeAllRanges()
    epubFrameRef.current?.contentWindow?.getSelection()?.removeAllRanges()
    prefillComposer(quoteDraft(selection.text))
  }, [epubFrameRef, prefillComposer, screen.kind, selection])

  const applyPromptPreset = React.useCallback((preset: PromptPreset) => {
    if (!selection || screen.kind !== 'book') return
    const notesText = annotations.slice(0, 8).map(note => {
      const quote = note.quote.trim()
      const body = (note.note || note.annotation || '').trim()
      return quote && body ? `- ${quote}：${body}` : quote ? `- ${quote}` : body ? `- ${body}` : ''
    }).filter(Boolean).join('\n') || t('presetNoNotes')
    const prompt = renderPrompt(preset.template, {
      selection: selection.text,
      book: screen.detail.book.title,
      chapter: screen.content.title,
      notes: notesText,
    })
    window.getSelection()?.removeAllRanges()
    epubFrameRef.current?.contentWindow?.getSelection()?.removeAllRanges()
    prefillComposer(prompt)
  }, [annotations, epubFrameRef, prefillComposer, screen, selection, t])

  return {
    noteContext,
    autoApply,
    promptPresets,
    presetManagerOpen,
    setPresetManagerOpen,
    presetError,
    savePromptPreset,
    deletePromptPreset,
    resetPromptPresets,
    prefillComposer,
    askCompanion,
    applyPromptPreset,
  }
}
