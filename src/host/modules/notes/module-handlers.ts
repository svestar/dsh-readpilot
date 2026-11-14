import type { RpcHandler } from '../../types.ts'
import { NOTES_ENDPOINTS } from '../../../shared/contracts/notes.ts'
import type { createNotesService } from './service.ts'

export function createNotesModuleHandlers(service: ReturnType<typeof createNotesService>): Record<string, RpcHandler> {
  return {
    [NOTES_ENDPOINTS.notes]: payload => service.handleNotes(payload),
    [NOTES_ENDPOINTS.noteFiles]: payload => service.handleNoteFiles(payload),
    [NOTES_ENDPOINTS.noteDrafts]: payload => service.noteDrafts(payload),
    [NOTES_ENDPOINTS.setNoteContext]: payload => service.setNoteContext(payload),
    [NOTES_ENDPOINTS.setAutoApplyNotes]: payload => service.setAutoApplyNotes(payload),
    [NOTES_ENDPOINTS.exportNotes]: payload => service.exportNotes(payload),
    [NOTES_ENDPOINTS.openNoteFile]: payload => service.openNoteFile(payload),
  }
}
