import { React } from '../../runtime.ts'
import type { StateSetter } from '../../runtime.ts'
import type { Selection } from '../../lib/types.ts'
import { selectionAnchor } from '../markdown/render.ts'

interface ContentSelectionOptions {
  contentRef: { current: HTMLDivElement | null }
  setSelection: StateSetter<Selection | null>
}

export function useContentSelection({ contentRef, setSelection }: ContentSelectionOptions) {
  return React.useCallback(() => {
    const active = window.getSelection()
    const container = contentRef.current
    if (!active || active.isCollapsed || active.rangeCount === 0 || !container) {
      setSelection(null)
      return
    }
    const range = active.getRangeAt(0)
    if (!container.contains(range.commonAncestorContainer)) {
      setSelection(null)
      return
    }
    const text = active.toString().trim()
    if (!text) {
      setSelection(null)
      return
    }
    const rect = range.getBoundingClientRect()
    const anchor = selectionAnchor(range, container)
    setSelection({
      text: text.slice(0, 2000),
      x: Math.min(Math.max(rect.left + rect.width / 2, 120), window.innerWidth - 120),
      y: rect.top,
      blockIndex: anchor ? anchor.blockIndex : null,
      offset: anchor ? anchor.offset : 0,
    })
  }, [contentRef, setSelection])
}
