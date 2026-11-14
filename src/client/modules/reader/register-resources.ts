import { messageOf } from '../../lib/helpers.ts'
import { buildReaderResource, parseReaderResource } from './resource.ts'
import { parseReaderJumpUrl } from '../../../shared/jump-url.ts'
import { mainReaderNavigation } from './navigation-bridge.ts'
import { parseNoteResource } from '../notes/note-resource.ts'
import type { CallRpc } from '../../lib/types.ts'

interface ReaderTarget {
  bookId: string
  chapterId: string
  offset?: number
}

/** Note resources and the jump links the Agent emits into chat. */
export function registerResources(ctx: any, call: CallRpc): {
  openReaderResource?: (address: string) => void
  openReaderTargetFromAddress: (address: string) => void
} {
  const resources = typeof ctx.get === 'function' ? ctx.get('resources') : undefined
  if (resources && typeof resources.register === 'function') {
    ctx.effect(() => resources.register({
      protocol: 'dsh-readpilot-note',
      async *open(address: string, options: any) {
        const target = parseNoteResource(address)
        if (!target) return
        const signal = options?.signal
        let lastHash = ''
        while (!signal?.aborted) {
          try {
            const value = await call('noteFiles.read', { bookId: target.bookId, id: target.noteId })
            if (value.hash !== lastHash) {
              lastHash = value.hash
              yield { ok: true, value }
            }
          } catch (error) {
            yield { ok: false, error: { code: 'note-resource', message: messageOf(error) } }
            return
          }
          await new Promise<void>(resolve => {
            const timer = window.setTimeout(resolve, 2000)
            signal?.addEventListener('abort', () => {
              window.clearTimeout(timer)
              resolve()
            }, { once: true })
          })
        }
      },
    }), 'dsh-readpilot: note resource')
  }

  const openReaderResource = typeof ctx.sidebarRight?.openResource === 'function'
    ? (address: string) => {
      try {
        ctx.sidebarRight.openResource(address, { params: { address } })
      } catch (error) {
        console.warn('dsh-readpilot: could not open reader resource', error)
      }
    }
    : undefined
  const openReaderTarget = (target: ReaderTarget) => {
    if (mainReaderNavigation?.bookId === target.bookId) {
      mainReaderNavigation.jump(target)
      return
    }
    openReaderResource?.(buildReaderResource(target.bookId, target.chapterId, target.offset))
  }
  const openReaderTargetFromAddress = (address: string) => {
    const target = parseReaderResource(address)
    if (!target) return
    if (target.chapterId) openReaderTarget({ bookId: target.bookId, chapterId: target.chapterId, offset: target.offset })
    else openReaderResource?.(address)
  }

  if (typeof document !== 'undefined' && openReaderResource) {
    const onJumpClick = (event: MouseEvent) => {
      const anchor = (event.target as Element | null)?.closest?.('a[href*="dsh-readpilot.invalid/jump"]') as HTMLAnchorElement | null
      if (!anchor) return
      if (document.querySelector('.dsh-readpilot-reader, .dsh-readpilot-sidebar-reader-root')) return
      const target = parseReaderJumpUrl(anchor.href)
      if (!target) return
      event.preventDefault()
      event.stopImmediatePropagation()
      if (target.offset === undefined && target.q) {
        const query = target.q
        void (async () => {
          try {
            const result = await call('search', { bookId: target.bookId, query, limit: 20 })
            const match = result.matches.find((item: any) => item.chapterId === target.chapterId)
            openReaderTarget(match
              ? { bookId: target.bookId, chapterId: match.chapterId, offset: match.offset }
              : { bookId: target.bookId, chapterId: target.chapterId })
          } catch (error) {
            console.warn('dsh-readpilot: jump search failed', error)
          }
        })()
        return
      }
      openReaderTarget({ bookId: target.bookId, chapterId: target.chapterId, offset: target.offset })
    }
    document.addEventListener('click', onJumpClick, true)
    ctx.effect(() => () => document.removeEventListener('click', onJumpClick, true), 'dsh-readpilot: global jump links')
  }

  return { openReaderResource, openReaderTargetFromAddress }
}
