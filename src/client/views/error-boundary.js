import { React, h } from '../runtime.js'

export function createReaderErrorBoundary() {
  if (typeof React.Component !== 'function') {
    return function ReaderErrorBoundaryPassthrough({ children }) {
      return children
    }
  }
  return class ReaderErrorBoundary extends React.Component {
    constructor(props) {
      super(props)
      this.state = { error: null }
    }

    static getDerivedStateFromError(error) {
      return { error }
    }

    componentDidCatch(error, info) {
      console.error('dsh-reader: render failed', error, info)
    }

    render() {
      if (this.state.error) {
        return h('div', {
          className: 'dsh-reader-error',
          style: { padding: 20, whiteSpace: 'pre-wrap', fontFamily: 'monospace' },
        }, `阅读器渲染失败\n${String(this.state.error?.stack ?? this.state.error)}`)
      }
      return this.props.children
    }
  }
}

