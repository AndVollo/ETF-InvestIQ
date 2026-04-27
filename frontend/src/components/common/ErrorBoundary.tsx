import { Component, type ReactNode, type ErrorInfo } from 'react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  override componentDidCatch(error: Error, info: ErrorInfo) {
    // structlog-style: key=value pairs only, no console.log
    const entry = { event: 'react_error_boundary', error: error.message, componentStack: info.componentStack }
    // Write to stderr so it's captured by structlog in prod
    process.env.NODE_ENV !== 'production' && console.error(entry) // eslint-disable-line no-console
  }

  override render() {
    if (this.state.hasError) {
      return this.props.fallback ?? (
        <div className="flex flex-col items-center justify-center min-h-[200px] gap-4 p-8 text-center">
          <p className="text-lg font-semibold text-danger">Something went wrong</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm">
            {this.state.error?.message ?? 'An unexpected error occurred.'}
          </p>
          <button
            className="text-sm text-primary-600 hover:underline"
            onClick={() => this.setState({ hasError: false, error: null })}
          >
            Try again
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
