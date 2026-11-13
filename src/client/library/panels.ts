import { React, h } from '../common/runtime.ts'
import type { TextFn } from '../common/types.ts'
import type { BackupExportResult, BackupRestoreResult } from '../../backup/index.ts'

export function PanelIcon({ size = 20, active }: { size?: number; active?: boolean }) {
  return h('svg', {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    'aria-hidden': true,
    style: { display: 'block' },
  },
  h('path', {
    d: 'M4 6.5A2.5 2.5 0 0 1 6.5 4H11v15H6.5A2.5 2.5 0 0 0 4 21.5z',
    fill: active ? 'currentColor' : 'none',
    stroke: 'currentColor',
    strokeWidth: 1.6,
    strokeLinejoin: 'round',
    opacity: active ? 0.9 : 1,
  }),
  h('path', {
    d: 'M20 6.5A2.5 2.5 0 0 0 17.5 4H13v15h4.5A2.5 2.5 0 0 1 20 21.5z',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.6,
    strokeLinejoin: 'round',
  }),
  h('path', { d: 'M12 4v15.5', stroke: 'currentColor', strokeWidth: 1.2, opacity: 0.55 }))
}

interface BackupPanelProps {
  t: TextFn
  defaultLibraryPath: string
  onPick: (setPath: (value: string) => void) => void
  onExport: () => Promise<BackupExportResult>
  onRestore: (archivePath: string, libraryPath: string) => Promise<BackupRestoreResult & { state: unknown }>
}

function BackupPanel({ t, defaultLibraryPath, onPick, onExport, onRestore }: BackupPanelProps) {
  const [archivePath, setArchivePath] = React.useState('')
  const [libraryPath, setLibraryPath] = React.useState(defaultLibraryPath)
  const [busy, setBusy] = React.useState(false)
  const [confirming, setConfirming] = React.useState(false)
  const [message, setMessage] = React.useState('')
  const [error, setError] = React.useState('')

  React.useEffect(() => {
    setLibraryPath(defaultLibraryPath)
  }, [defaultLibraryPath])

  const exportNow = async () => {
    if (busy) return
    setBusy(true)
    setError('')
    setMessage('')
    try {
      const result = await onExport()
      setArchivePath(result.path)
      setMessage(`${t('backupExported')}：${result.path}`)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause))
    } finally {
      setBusy(false)
    }
  }

  const restoreNow = async () => {
    if (busy || !archivePath.trim() || !libraryPath.trim()) return
    if (!confirming) {
      setConfirming(true)
      setError('')
      return
    }
    setBusy(true)
    setError('')
    setMessage('')
    try {
      const result = await onRestore(archivePath.trim(), libraryPath.trim())
      setMessage(`${t('backupRestored')}：${t('backupMatched')} ${result.matched}，${t('backupSkipped')} ${result.skipped}，${t('backupNotes')} ${result.notes}，${t('backupLongNotes')} ${result.longNotes}。${t('backupSnapshot')}：${result.snapshotPath}`)
      setConfirming(false)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause))
      setConfirming(false)
    } finally {
      setBusy(false)
    }
  }

  return h('section', { className: 'dsh-readpilot-backup' },
    h('h3', null, t('backupTitle')),
    h('p', { className: 'dsh-readpilot-backup-hint' }, t('backupHint')),
    h('div', { className: 'dsh-readpilot-backup-actions' },
      h('button', {
        type: 'button',
        className: 'dsh-readpilot-secondary',
        disabled: busy,
        onClick: () => void exportNow(),
      }, busy ? t('loading') : t('exportBackup'))),
    h('label', { className: 'dsh-readpilot-backup-field' },
      h('span', null, t('backupArchive')),
      h('input', {
        value: archivePath,
        placeholder: t('backupArchivePlaceholder'),
        spellCheck: false,
        onChange: (event: any) => {
          setArchivePath(event.target.value)
          setConfirming(false)
        },
      })),
    h('label', { className: 'dsh-readpilot-backup-field' },
      h('span', null, t('backupTarget')),
      h('div', { className: 'dsh-readpilot-path-row' },
        h('input', {
          value: libraryPath,
          placeholder: t('pathPlaceholder'),
          spellCheck: false,
          onChange: (event: any) => {
            setLibraryPath(event.target.value)
            setConfirming(false)
          },
        }),
        h('button', {
          type: 'button',
          className: 'dsh-readpilot-secondary',
          onClick: () => onPick(setLibraryPath),
        }, t('chooseDir')))),
    h('button', {
      type: 'button',
      className: confirming ? 'dsh-readpilot-primary' : 'dsh-readpilot-secondary',
      disabled: busy || !archivePath.trim() || !libraryPath.trim(),
      onClick: () => void restoreNow(),
    }, confirming ? t('backupRestoreConfirm') : t('restoreBackup')),
    confirming ? h('p', { className: 'dsh-readpilot-backup-warning' }, t('backupWarning')) : null,
    message ? h('p', { className: 'dsh-readpilot-backup-result' }, message) : null,
    error ? h('p', { className: 'dsh-readpilot-backup-error' }, error) : null)
}

interface SetupProps {
  t: TextFn
  initialPath?: string
  busy: boolean
  onConfigure: (path: string) => void | Promise<void>
  onPick: (setPath: (value: string) => void) => void
  onCancel?: (() => void) | null
  onBackupExport: () => Promise<BackupExportResult>
  onBackupRestore: (archivePath: string, libraryPath: string) => Promise<BackupRestoreResult & { state: unknown }>
}

export function Setup({ t, initialPath, busy, onConfigure, onPick, onCancel, onBackupExport, onBackupRestore }: SetupProps) {
  const [path, setPath] = React.useState(initialPath ?? '')
  const row = h('div', { className: 'dsh-readpilot-path-row' },
    h('input', {
      value: path,
      placeholder: t('pathPlaceholder'),
      spellCheck: false,
      onChange: (event: any) => setPath(event.target.value),
    }),
    h('button', {
      type: 'button',
      className: 'dsh-readpilot-secondary',
      onClick: () => onPick(setPath),
    }, t('chooseDir')))
  const actions = h('div', { className: 'dsh-readpilot-setup-actions' },
    h('button', {
      type: 'button',
      className: 'dsh-readpilot-primary',
      disabled: busy || !path.trim(),
      onClick: () => onConfigure(path.trim()),
    }, busy ? t('loading') : t('create')),
    onCancel
      ? h('button', {
        type: 'button',
        className: 'dsh-readpilot-secondary',
        onClick: onCancel,
      }, t('cancel'))
      : null)
  return h('div', { className: 'dsh-readpilot-setup' },
    h('div', { className: 'dsh-readpilot-setup-card' },
      h('h2', null, t('setupTitle')),
      h('p', null, t('setupHint')),
      row,
      actions,
      h(BackupPanel, { t, defaultLibraryPath: path, onPick, onExport: onBackupExport, onRestore: onBackupRestore })))
}
