import { React } from '../runtime.ts'
import { PAGE_ASPECT, pageWidthForHeight } from '../paging.ts'
import type { MutableRef } from '../types.ts'

export interface PageWidthOptions {
  enabled: boolean
  containerRef: MutableRef<HTMLDivElement | null>
}

function paddingOf(value: string): number {
  const parsed = Number.parseFloat(value)
  return Number.isFinite(parsed) ? parsed : 0
}

export function usePageWidth({ enabled, containerRef }: PageWidthOptions): number {
  const [width, setWidth] = React.useState(0)

  React.useEffect(() => {
    if (!enabled) {
      setWidth(0)
      return
    }
    const view = typeof window === 'undefined' ? null : window
    let rafId = 0

    const measure = () => {
      rafId = 0
      const container = containerRef.current
      if (!container || !container.isConnected || !view) return
      const style = view.getComputedStyle(container)
      const contentWidth = container.clientWidth - paddingOf(style.paddingLeft) - paddingOf(style.paddingRight)
      const contentHeight = container.clientHeight - paddingOf(style.paddingTop) - paddingOf(style.paddingBottom)
      setWidth(pageWidthForHeight(contentHeight, contentWidth, PAGE_ASPECT))
    }

    const schedule = () => {
      if (rafId) return
      if (typeof requestAnimationFrame === 'function') {
        rafId = requestAnimationFrame(measure)
        return
      }
      measure()
    }

    const container = containerRef.current
    let observer: ResizeObserver | null = null
    if (container && typeof ResizeObserver === 'function') {
      observer = new ResizeObserver(schedule)
      observer.observe(container)
    }
    view?.addEventListener('resize', schedule)
    schedule()

    return () => {
      if (rafId && typeof cancelAnimationFrame === 'function') cancelAnimationFrame(rafId)
      observer?.disconnect()
      view?.removeEventListener('resize', schedule)
    }
  }, [enabled, containerRef])

  return enabled ? width : 0
}
