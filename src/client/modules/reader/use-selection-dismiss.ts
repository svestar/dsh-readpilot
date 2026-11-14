import { React } from '../../runtime.ts'
import type { StateSetter } from '../../runtime.ts'
import type { MutableRef, Selection } from '../../lib/types.ts'

/** Whether a pointer gesture dismisses the floating selection toolbar. */
export function dismissesSelection(target: EventTarget | null): boolean {
  const element = target && typeof (target as Element).closest === 'function'
    ? target as Element
    : null
  return element === null || element.closest('.dsh-readpilot-selection') === null
}

/**
 * Close the selection toolbar on a pointer gesture outside it.
 * @param selection - current selection; the listeners exist only while it is set.
 * @param setSelection - selection setter to clear.
 * @param frameRef - EPUB iframe whose document gets the same listener.
 */
export function useSelectionDismiss(
  selection: Selection | null,
  setSelection: StateSetter<Selection | null>,
  frameRef: MutableRef<HTMLIFrameElement | null>,
): void {
  React.useEffect(() => {
    if (!selection) return
    const dismiss = (event: Event) => {
      if (dismissesSelection(event.target)) setSelection(null)
    }
    const frameDoc = frameRef.current?.contentDocument ?? null
    document.addEventListener('pointerdown', dismiss, true)
    frameDoc?.addEventListener('pointerdown', dismiss, true)
    return () => {
      document.removeEventListener('pointerdown', dismiss, true)
      frameDoc?.removeEventListener('pointerdown', dismiss, true)
    }
  }, [frameRef, selection, setSelection])
}
