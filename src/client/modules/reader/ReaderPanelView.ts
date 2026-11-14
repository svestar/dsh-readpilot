import { h } from '../../runtime.ts'
import { useReaderPanel } from './use-reader-panel.ts'
import { Header } from './Header.ts'
import { ReaderSettings } from './ReaderSettings.ts'
import { ReaderBookView } from './ReaderBookView.ts'
import { SelectionToolbar, NoteDialog } from './SelectionNote.ts'
import { ActionHistory } from './ActionHistory.ts'
import { SearchPanel } from '../notes/SearchPanelView.ts'
import { DraftNotice } from '../notes/DraftNotice.ts'
import { PromptPresetManager } from '../companion/PromptPresetManager.ts'
import { HelpManual } from '../help/HelpManual.ts'
import { Library } from '../library/LibraryView.ts'
import { Setup } from '../library/panels.ts'
import type { CallRpc, TextFn } from '../../lib/types.ts'

interface ReaderPanelProps {
  call: CallRpc
  t: TextFn
  runtime: any
  SessionProvider?: any
  renderSlot?: any
  useResource?: any
  NativeChatBoundary: any
}

/** The main reader panel: header, book layout, search and modal dialogs. */
export function ReaderPanelView(props: ReaderPanelProps) {
  const { t, call, runtime } = props
  const model = useReaderPanel({
    call,
    t,
    runtime,
    SessionProvider: props.SessionProvider,
    renderSlot: props.renderSlot,
    useResource: props.useResource,
  })
  const { snapshot, screen, busy, error, prefs, view, notes, companion, composer, find, receipts } = model
  const palette = prefs.palette

  return h('div', {
    className: 'dsh-readpilot-panel',
    'data-palette': palette.id,
    style: {
      '--reader-bg': palette.bg,
      '--reader-fg': palette.fg,
      '--reader-muted': palette.muted,
      '--reader-border': palette.border,
      '--reader-selection': palette.selection,
      '--reader-highlight': palette.highlight,
      '--reader-glass-blur': `${prefs.glassBlur}px`,
    },
  },
  h(Header, {
    t,
    screen,
    title: model.headerTitle,
    subtitle: model.headerSubtitle,
    onBack: view.backToLibrary,
    searchOpen: find.searchOpen,
    settingsOpen: prefs.settingsOpen,
    onToggleSettings: () => prefs.setSettingsOpen(previous => !previous),
    openingWorkspace: companion.openingWorkspace,
    onOpenWorkspace: companion.openWorkspace,
    onToggleSearch: find.toggleSearch,
    onToggleChat: () => companion.setChatOpen(previous => !previous),
    onToggleToc: () => prefs.setTocOpen(previous => !previous),
    onBookmark: notes.addBookmark,
    onHelp: () => model.setHelpOpen(true),
    scanOnly: prefs.scanOnly,
  }),
  prefs.settingsOpen && screen.kind === 'book'
    ? h(ReaderSettings, {
      t,
      format: prefs.supportedFormat ?? 'txt',
      source: prefs.reflowMode,
      flow: prefs.effectiveMode,
      spread: prefs.format === 'pdf' && prefs.reflowMode ? 'single' : prefs.pageLayout,
      fontSize: prefs.fontSize,
      paletteId: prefs.paletteId,
      glassBlur: prefs.glassBlur,
      capabilities: prefs.capabilities,
      onSource: view.applySource,
      onFlow: view.changeFlow,
      onSpread: view.changeSpread,
      onFontSize: view.changeFontSize,
      onPalette: prefs.changePalette,
      onGlassBlur: prefs.setGlassBlur,
      onClose: () => prefs.setSettingsOpen(false),
    })
    : null,
  prefs.reflowWarning
    ? h('div', { className: 'dsh-readpilot-reflow-warning' },
      h('span', null, prefs.reflowWarning),
      h('button', {
        type: 'button',
        className: 'dsh-readpilot-reflow-warning-close',
        title: t('close'),
        'aria-label': t('close'),
        onClick: () => prefs.setReflowWarning(''),
      }, '×'))
    : null,
  error ? h('div', { className: 'dsh-readpilot-error' }, error) : null,
  h(SearchPanel, {
    t,
    open: find.searchOpen && !prefs.scanOnly,
    screen,
    call,
    searchInputRef: find.searchInputRef,
    searchQuery: find.searchQuery,
    setSearchQuery: find.setSearchQuery,
    runSearch: find.runSearch,
    searchBusy: find.searchBusy,
    setSearchOpen: find.setSearchOpen,
    searchError: find.searchError,
    searchResults: find.searchResults,
    openSearchMatch: find.openSearchMatch,
  }),
  !snapshot
    ? h('div', { className: 'dsh-readpilot-muted' },
      busy
        ? t('loading')
        : h('div', null,
          h('div', null, error || t('loadFailed')),
          h('button', {
            type: 'button',
            className: 'dsh-readpilot-secondary',
            onClick: () => { void model.refresh() },
          }, t('retry'))))
    : screen.kind === 'setup' || !snapshot.settings.libraryDir
      ? h(Setup, {
        t,
        initialPath: snapshot.settings.libraryDir ?? '',
        busy,
        onConfigure: model.configure,
        onPick: model.pickDirectory,
        onBackupExport: model.backupExport,
        onBackupRestore: model.backupRestore,
        onCancel: snapshot.settings.libraryDir
          ? () => model.setScreen({ kind: 'library' })
          : null,
      })
      : screen.kind === 'library'
        ? h(Library, {
          t,
          snapshot,
          busy,
          onOpen: view.openBook,
          onRefresh: model.refresh,
          onSettings: model.openSetup,
          onSetTags: model.setBookTags,
          onSetStatus: model.setBookStatus,
          onSetRating: model.setBookRating,
          onDeleteDuplicate: model.deleteDuplicate,
        })
        : screen.kind === 'unsupported'
          ? h('div', { className: 'dsh-readpilot-empty' },
            h('h2', null, screen.book.title),
            h('p', null, t('unsupportedHint')),
            h('button', {
              type: 'button',
              className: 'dsh-readpilot-secondary',
              onClick: view.backToLibrary,
            }, t('back')))
          : h(ReaderBookView, {
            t,
            model,
            NativeChatBoundary: props.NativeChatBoundary,
          }),
  h(SelectionToolbar, {
    t,
    selection: model.selection,
    onAsk: composer.askCompanion,
    onNote: () => notes.openNoteEditor(),
    onHighlight: (color: string) => void notes.addHighlight(color),
    presets: composer.promptPresets,
    onPreset: composer.applyPromptPreset,
    onManagePresets: () => composer.setPresetManagerOpen(true),
  }),
  h(NoteDialog, {
    t,
    noteEditor: notes.noteEditor,
    noteDraft: notes.noteDraft,
    setNoteDraft: notes.setNoteDraft,
    noteColor: notes.noteColor,
    setNoteColor: notes.setNoteColor,
    noteSaving: notes.noteSaving,
    noteError: notes.noteError,
    noteInputRef: notes.noteInputRef,
    activeBookId: companion.activeBookId,
    deleteNote: notes.deleteNote,
    closeNoteEditor: notes.closeNoteEditor,
    saveNote: notes.saveNote,
  }),
  composer.presetManagerOpen
    ? h(PromptPresetManager, {
      t,
      presets: composer.promptPresets,
      error: composer.presetError,
      onSave: composer.savePromptPreset,
      onDelete: composer.deletePromptPreset,
      onReset: composer.resetPromptPresets,
      onClose: () => composer.setPresetManagerOpen(false),
    })
    : null,
  model.helpOpen ? h(HelpManual, { t, onClose: () => model.setHelpOpen(false) }) : null,
  model.historyOpen
    ? h(ActionHistory, {
      t,
      receipts: receipts.receipts,
      busyId: receipts.busyId,
      onUndo: receipts.undo,
      onRefresh: receipts.refresh,
      onClose: () => model.setHistoryOpen(false),
    })
    : null,
  h(DraftNotice, { t, state: model.longNotes }))
}
