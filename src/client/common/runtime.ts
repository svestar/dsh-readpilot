export type StateSetter<T> = (value: T | ((previous: T) => T)) => void

export interface ReactRuntime {
  createElement: (...args: any[]) => any
  useState: <T>(initial: T | (() => T)) => [T, StateSetter<T>]
  useRef: <T>(initial: T) => { current: T }
  useCallback: <T extends (...args: any[]) => any>(callback: T, deps?: readonly unknown[]) => T
  useMemo: <T>(factory: () => T, deps?: readonly unknown[]) => T
  useEffect: (effect: () => void | (() => void), deps?: readonly unknown[]) => void
  useSyncExternalStore: <T>(subscribe: (onStoreChange: () => void) => () => void, getSnapshot: () => T) => T
  Component: any
}

export let React!: ReactRuntime
export let h!: (...args: any[]) => any
export let createPortal!: (children: any, container: Element) => any
export let Modal!: any
export let Tooltip!: any
export let Toast!: any
export let useVirtualizer: any

export function bindRuntime(require: (name: string) => any): void {
  React = require('react')
  h = React.createElement
  createPortal = require('react-dom').createPortal
  const primitives = require('@deepseek-ai/dsh-client-ui-primitives')
  Modal = primitives.Modal
  Tooltip = primitives.Tooltip
  Toast = primitives.Toast
  try {
    useVirtualizer = require('@tanstack/react-virtual').useVirtualizer
  } catch {
    // The host may omit the optional virtualizer module; TOC falls back to a plain list.
    useVirtualizer = null
  }
}

