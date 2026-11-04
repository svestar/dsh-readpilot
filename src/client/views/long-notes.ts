import { h } from '../runtime.ts'
import { diffLines, formatSize } from '../helpers.ts'
import { MarkdownMessage } from './markdown.ts'
import type { NoteContextToggle, TextFn } from '../types.ts'
import type { LongNotesState } from '../hooks/use-long-notes.ts'

interface LongNotesProps {
  t: TextFn
  state: LongNotesState
  noteContext?: NoteContextToggle
}

export function LongNotes({ t, state, noteContext }: LongNotesProps) {
  const editing = Boolean(state.active || state.creating)
  const kind = state.active?.note.kind ?? state.createKind
  const emptyState = (title: string, hint: string) => h('div', { className: 'dsh-readpilot-empty-state' },
    h('div', { className: 'dsh-readpilot-empty-icon' }, '▤'),
    h('div', { className: 'dsh-readpilot-empty-title' }, title),
    hint ? h('div', { className: 'dsh-readpilot-empty-hint' }, hint) : null)
  return h('section', { className: 'dsh-readpilot-long-notes dsh-readpilot-page' },
    h('header', { className: 'dsh-readpilot-page-head dsh-readpilot-long-notes-head' },
      h('div', { className: 'dsh-readpilot-page-heading' },
        h('div', { className: 'dsh-readpilot-page-title-row' },
          h('h3', null, t('longNotes')),
          h('span', { className: 'dsh-readpilot-page-count' }, String(state.notes.length))),
        h('p', { className: 'dsh-readpilot-page-subtitle' }, t('longNotesPageHint'))),
      editing
        ? null
        : h('div', { className: 'dsh-readpilot-page-actions' },
          h('button', {
            type: 'button',
            className: 'dsh-readpilot-note-jump dsh-readpilot-pill',
            onClick: () => state.start('book'),
          }, t('bookNote')),
          h('button', {
            type: 'button',
            className: 'dsh-readpilot-note-jump dsh-readpilot-pill',
            onClick: () => state.start('topic'),
          }, t('newTopicNote')))),
    h('div', { className: 'dsh-readpilot-page-toolbar' },
      h('button', {
        type: 'button',
        className: 'dsh-readpilot-note-jump dsh-readpilot-tool-btn',
        disabled: state.exporting,
        onClick: () => void state.exportNotes(false),
      }, t('exportNotes')),
      h('button', {
        type: 'button',
        className: 'dsh-readpilot-note-jump dsh-readpilot-tool-btn',
        disabled: state.exporting,
        onClick: () => void state.exportNotes(true),
      }, t('exportSave')),
      state.exportStatus
        ? h('span', { className: 'dsh-readpilot-long-hint' }, state.exportStatus)
        : null),
    noteContext
      ? h('button', {
        type: 'button',
        className: 'dsh-readpilot-note-context',
        'data-on': noteContext.enabled ? 'true' : 'false',
        disabled: noteContext.busy,
        title: t('noteContextHint'),
        onClick: noteContext.toggle,
      },
      h('span', {
        className: 'dsh-readpilot-note-context-switch',
        'data-on': noteContext.enabled ? 'true' : 'false',
      }),
      h('span', { className: 'dsh-readpilot-note-context-label' }, t('noteContext')),
      h('span', { className: 'dsh-readpilot-note-context-state' },
        noteContext.enabled ? t('noteContextOn') : t('noteContextOff')),
      noteContext.enabled && noteContext.characters > 0
        ? h('span', { className: 'dsh-readpilot-note-context-chars' },
          `${noteContext.characters} ${t('noteContextChars')}`)
        : null)
      : null,
    state.drafts.length > 0
      ? h('div', { className: 'dsh-readpilot-card dsh-readpilot-drafts' },
        h('div', { className: 'dsh-readpilot-section-head' },
          h('h4', null, t('noteDrafts')),
          h('span', { className: 'dsh-readpilot-section-count' }, String(state.drafts.length))),
        state.drafts.map(draft => {
          const lines = diffLines(draft.baseBody, draft.body)
          const added = lines.filter(line => line.type === 'add').length
          const removed = lines.filter(line => line.type === 'del').length
          return h('div', { key: draft.id, className: 'dsh-readpilot-draft' },
            h('div', { className: 'dsh-readpilot-draft-head' },
              h('span', { className: 'dsh-readpilot-long-kind' },
                draft.action === 'create'
                  ? t('draftCreate')
                  : draft.action === 'append' ? t('draftAppend') : t('draftEdit')),
              h('span', { className: 'dsh-readpilot-long-title' }, draft.title),
              h('span', { className: 'dsh-readpilot-long-meta' }, `+${added} −${removed}`)),
            h('pre', { className: 'dsh-readpilot-diff' },
              lines.slice(0, 80).map((line, index) => h('div', {
                key: `${draft.id}-${index}`,
                className: `dsh-readpilot-diff-line dsh-readpilot-diff-${line.type}`,
              }, `${line.type === 'add' ? '+ ' : line.type === 'del' ? '- ' : '  '}${line.text}`))),
            lines.length > 80
              ? h('div', { className: 'dsh-readpilot-long-hint' }, t('draftDiffTruncated'))
              : null,
            h('div', { className: 'dsh-readpilot-long-editor-actions' },
              h('button', {
                type: 'button',
                className: 'dsh-readpilot-chat-send',
                disabled: state.draftBusyId === draft.id,
                onClick: () => void state.applyDraft(draft),
              }, t('applyDraft')),
              h('button', {
                type: 'button',
                className: 'dsh-readpilot-note-jump',
                disabled: state.draftBusyId === draft.id,
                onClick: () => void state.rejectDraft(draft),
              }, t('rejectDraft'))))
        }))
      : null,
    state.error ? h('div', { className: 'dsh-readpilot-chat-error' }, state.error) : null,
    editing
      ? h('div', { className: 'dsh-readpilot-card dsh-readpilot-long-editor dsh-readpilot-editor-card' },
        h('div', { className: 'dsh-readpilot-long-editor-head' },
          h('input', {
            value: state.title,
            placeholder: t('longNoteTitle'),
            spellCheck: false,
            onChange: (event: any) => state.setTitle(event.target.value),
          }),
          h('span', { className: 'dsh-readpilot-long-kind' },
            kind === 'book' ? t('bookNote') : t('noteKindTopic'))),
        h('textarea', {
          value: state.draft,
          placeholder: t('notePlaceholder'),
          rows: 10,
          spellCheck: false,
          onChange: (event: any) => state.setDraft(event.target.value),
          onKeyDown: (event: any) => {
            if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
              event.preventDefault()
              void state.save()
            }
          },
        }),
        state.conflict
          ? h('div', { className: 'dsh-readpilot-long-conflict' },
            h('span', null, t('longNoteConflict')),
            h('button', {
              type: 'button',
              className: 'dsh-readpilot-note-jump',
              onClick: () => void state.reload(),
            }, t('reload')))
          : null,
        h('div', { className: 'dsh-readpilot-long-editor-actions' },
          h('button', {
            type: 'button',
            className: 'dsh-readpilot-chat-send',
            disabled: state.saving || !state.draft.trim(),
            onClick: () => void state.save(),
          }, state.saving ? t('noteSaving') : t('save')),
          h('button', {
            type: 'button',
            className: 'dsh-readpilot-note-jump',
            onClick: state.cancel,
          }, t('cancel')),
          state.active
            ? h('button', {
              type: 'button',
              className: 'dsh-readpilot-note-delete',
              disabled: state.saving,
              onClick: () => void state.remove(),
            }, t('delete'))
            : null,
          state.active
            ? h('button', {
              type: 'button',
              className: 'dsh-readpilot-note-jump',
              disabled: state.historyBusy,
              onClick: state.toggleHistory,
            }, t('history'))
            : null,
          state.active
            ? h('button', {
              type: 'button',
              className: 'dsh-readpilot-note-jump',
              disabled: state.externalBusy,
              title: t('openExternalHint'),
              onClick: () => void state.openExternal(),
            }, t('openExternal'))
            : null),
        state.active && state.historyOpen
          ? h('div', { className: 'dsh-readpilot-history' },
            h('div', { className: 'dsh-readpilot-drafts-head' }, t('history')),
            state.history.length === 0
              ? h('div', { className: 'dsh-readpilot-chat-empty' }, t('historyEmpty'))
              : state.history.map(entry => h('div', { key: entry.id, className: 'dsh-readpilot-history-row' },
                h('span', { className: 'dsh-readpilot-long-meta' }, new Date(entry.createdAt).toLocaleString()),
                h('span', { className: 'dsh-readpilot-long-meta' },
                  `${entry.characters} ${t('noteContextChars')}`),
                h('button', {
                  type: 'button',
                  className: 'dsh-readpilot-note-jump',
                  disabled: state.historyBusy,
                  onClick: () => void state.restoreHistory(entry),
                }, t('historyRestore')))),
            h('button', {
              type: 'button',
              className: 'dsh-readpilot-note-jump',
              onClick: state.toggleHistory,
            }, t('historyClose')))
          : null,
        h('details', { className: 'dsh-readpilot-long-preview' },
          h('summary', null, t('longNotePreview')),
          h(MarkdownMessage, { text: state.draft, prefix: 'long-note' })))
      : state.loading
        ? emptyState(t('loading'), '')
        : state.notes.length === 0
          ? emptyState(t('longNoteEmpty'), t('longNotesHint'))
          : h('div', { className: 'dsh-readpilot-long-list' },
            h('div', { className: 'dsh-readpilot-list-head' },
              h('span', null, t('allNotes')),
              h('span', { className: 'dsh-readpilot-section-count' }, String(state.notes.length))),
            state.notes.map(note => h('button', {
              key: note.id,
              type: 'button',
              className: 'dsh-readpilot-long-note',
              'data-kind': note.kind,
              onClick: () => void state.open(note),
            },
            h('span', { className: 'dsh-readpilot-long-kind' },
              note.kind === 'book' ? t('bookNote') : t('noteKindTopic')),
            h('span', { className: 'dsh-readpilot-long-title' }, note.title),
            h('span', { className: 'dsh-readpilot-long-meta' },
              `${formatSize(note.size)} · ${new Date(note.updatedAt).toLocaleDateString()}`)))))
}
