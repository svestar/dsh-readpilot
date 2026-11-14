import type { LongNote, LongNoteHistory, NoteDraft } from '../../lib/types.ts'
import type { LongNoteDraft } from './use-long-notes.ts'

export interface LongNotesState {
  notes: LongNote[]
  loading: boolean
  error: string
  active: LongNoteDraft | null
  title: string
  creating: boolean
  saving: boolean
  createKind: 'book' | 'topic'
  drafts: NoteDraft[]
  draftBusyId: string | null
  history: LongNoteHistory[]
  historyOpen: boolean
  historyBusy: boolean
  exporting: boolean
  exportStatus: string
  clearExportStatus: () => void
  externalBusy: boolean
  confirmMessage: string
  settleConfirm: (ok: boolean) => void
  setTitle: (value: string) => void
  open: (note: LongNote) => Promise<void>
  beginCreate: (kind: 'book' | 'topic') => void
  create: () => Promise<void>
  cancelCreate: () => void
  close: () => void
  remove: () => Promise<void>
  reload: () => Promise<void>
  applyDraft: (draft: NoteDraft) => Promise<void>
  rejectDraft: (draft: NoteDraft) => Promise<void>
  toggleHistory: () => void
  restoreHistory: (entry: LongNoteHistory) => Promise<void>
  removeHistory: (entry: LongNoteHistory) => Promise<void>
  clearHistory: () => Promise<void>
  exportNotes: (save: boolean) => Promise<void>
  openExternal: () => Promise<void>
  applyExternalNote: (value: any) => void
}
