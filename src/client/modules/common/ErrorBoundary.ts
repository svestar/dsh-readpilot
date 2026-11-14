import { React, h } from '../../runtime.ts'

export function createReaderErrorBoundary(): any {
  if (typeof React.Component !== 'function') {
    return function ReaderErrorBoundaryPassthrough({ children }: { children?: any }) {
      return children
    }
  }
  const Base: new (...args: any[]) => any = React.Component
  return class ReaderErrorBoundary extends Base {
    declare state: { error: any }
    declare props: { children?: any }

    constructor(props: any) {
      super(props)
      this.state = { error: null }
    }

    static getDerivedStateFromError(error: any) {
      return { error }
    }

    componentDidCatch(error: any, info: any) {
      console.error('dsh-readpilot: render failed', error, info)
    }

    render() {
      if (this.state.error) {
        return h('div', {
          className: 'dsh-readpilot-error',
          style: { padding: 20, whiteSpace: 'pre-wrap', fontFamily: 'monospace' },
        }, `阅读器渲染失败\n${String(this.state.error?.stack ?? this.state.error)}`)
      }
      return this.props.children
    }
  }
}
