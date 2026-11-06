import { h } from '../runtime.ts'
import type { BookFormat } from '../../formats.ts'
import type { PageLayout, ReaderMode } from '../paging.ts'
import type { TextFn } from '../types.ts'

interface ReaderBarProps {
  t: TextFn
  format: BookFormat
  mode: ReaderMode
  layout: PageLayout
  chapterTitle: string
  chapterIndex: number
  chapterTotal: number
  pageStart: number
  pageEnd: number
  pageTotal: number
  percent?: number
  reflow?: boolean
  canPrev: boolean
  canNext: boolean
  onPrev: () => void
  onNext: () => void
  onToggleMode?: () => void
  onLayoutChange?: (layout: PageLayout) => void
  pageInput?: string
  setPageInput?: (value: string) => void
  onPageCommit?: (page: number) => void
  zoom?: number
  onZoom?: (delta: number) => void
}

export function ReaderBar({
  t,
  format,
  mode,
  layout,
  chapterTitle,
  chapterIndex,
  chapterTotal,
  pageStart,
  pageEnd,
  pageTotal,
  percent,
  reflow,
  canPrev,
  canNext,
  onPrev,
  onNext,
  onToggleMode,
  onLayoutChange,
  pageInput,
  setPageInput,
  onPageCommit,
  zoom,
  onZoom,
}: ReaderBarProps) {
  const paged = mode === 'paged'
  const prevLabel = t(paged ? 'pagePrev' : 'chapterPrev')
  const nextLabel = t(paged ? 'pageNext' : 'chapterNext')
  const modeLabel = t(paged ? 'scrollMode' : 'pagedMode')
  const numericPage = paged && Boolean(onPageCommit) && pageInput !== undefined
  const percentText = percent === undefined ? '' : ` · ${Math.round(percent)}%`
  const pdfOriginal = format === 'pdf' && !reflow
  const range = pageEnd > pageStart ? `–${pageEnd}` : ''
  const pagePosition = paged
    ? pdfOriginal
      ? `PDF ${pageStart}${range} / ${pageTotal}${percentText}`
      : `${pageStart}${range} / ${pageTotal}${percentText}`
    : `${chapterIndex + 1} / ${chapterTotal}${percentText}`

  return h('div', {
    className: 'dsh-readpilot-bar',
    'data-mode': mode,
    'data-format': format,
    'data-layout': layout,
  },
    h('div', { className: 'dsh-readpilot-bar-group dsh-readpilot-bar-nav' },
      h('button', {
        type: 'button',
        className: 'dsh-readpilot-secondary dsh-readpilot-bar-btn',
        title: prevLabel,
        'aria-label': prevLabel,
        disabled: !canPrev,
        onClick: onPrev,
      }, '‹'),
      h('button', {
        type: 'button',
        className: 'dsh-readpilot-secondary dsh-readpilot-bar-btn',
        title: nextLabel,
        'aria-label': nextLabel,
        disabled: !canNext,
        onClick: onNext,
      }, '›')),
    h('div', { className: 'dsh-readpilot-bar-title', title: chapterTitle }, chapterTitle),
    h('div', { className: 'dsh-readpilot-bar-group dsh-readpilot-bar-controls' },
      numericPage
        ? h('div', { className: 'dsh-readpilot-bar-group dsh-readpilot-bar-page' },
          h('input', {
            className: 'dsh-readpilot-page-input',
            type: 'number',
            min: 1,
            max: Math.max(1, pageTotal),
            value: pageInput,
            title: t('page'),
            'aria-label': t('page'),
            onChange: (event: any) => setPageInput?.(event.target.value),
            onKeyDown: (event: any) => {
              if (event.key !== 'Enter') return
              const page = Number(pageInput)
              if (Number.isFinite(page)) onPageCommit?.(page)
            },
          }),
          h('span', { className: 'dsh-readpilot-bar-position' }, `/ ${pageTotal}${percentText}`))
        : h('span', {
          className: 'dsh-readpilot-bar-position',
          title: t(paged ? 'page' : 'chapter'),
        }, pagePosition),
      onToggleMode
        ? h('button', {
          type: 'button',
          className: 'dsh-readpilot-secondary dsh-readpilot-bar-toggle',
          title: modeLabel,
          'aria-label': modeLabel,
          onClick: onToggleMode,
        }, modeLabel)
        : null,
      paged && onLayoutChange
        ? h('div', { className: 'dsh-readpilot-bar-group dsh-readpilot-bar-layout' },
          h('button', {
            type: 'button',
            className: 'dsh-readpilot-secondary dsh-readpilot-bar-toggle',
            title: t('singlePage'),
            'aria-label': t('singlePage'),
            'aria-pressed': layout === 'single' ? 'true' : 'false',
            'data-active': layout === 'single' ? 'true' : 'false',
            onClick: () => onLayoutChange('single'),
          }, t('singlePage')),
          h('button', {
            type: 'button',
            className: 'dsh-readpilot-secondary dsh-readpilot-bar-toggle',
            title: t('doublePage'),
            'aria-label': t('doublePage'),
            'aria-pressed': layout === 'double' ? 'true' : 'false',
            'data-active': layout === 'double' ? 'true' : 'false',
            onClick: () => onLayoutChange('double'),
          }, t('doublePage')))
        : null,
      zoom !== undefined && onZoom
        ? h('div', { className: 'dsh-readpilot-bar-group dsh-readpilot-bar-zoom' },
          h('button', {
            type: 'button',
            className: 'dsh-readpilot-secondary dsh-readpilot-bar-btn',
            title: t('zoomOut'),
            'aria-label': t('zoomOut'),
            onClick: () => onZoom(-0.25),
          }, '−'),
          h('span', { className: 'dsh-readpilot-bar-position' }, `${Math.round(zoom * 100)}%`),
          h('button', {
            type: 'button',
            className: 'dsh-readpilot-secondary dsh-readpilot-bar-btn',
            title: t('zoomIn'),
            'aria-label': t('zoomIn'),
            onClick: () => onZoom(0.25),
          }, '+'))
        : null))
}
