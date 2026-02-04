'use client'

import { Component, ErrorInfo, ReactNode } from 'react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error?: Error
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <div className="min-h-screen bg-[var(--background)] text-[var(--text)] flex items-center justify-center px-4">
            <div className="max-w-md w-full text-center">
              <div className="bg-[var(--surface)] rounded-2xl p-8 border border-white/10">
                <div className="text-red-400 text-4xl mb-4">⚠️</div>
                <h1 className="text-xl font-bold mb-4">Something went wrong</h1>
                <p className="text-[var(--text-muted)] mb-6">
                  We encountered an unexpected error. Please try refreshing the page.
                </p>
                <div className="space-y-3">
                  <button
                    onClick={() => window.location.reload()}
                    className="w-full bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white font-medium py-3 rounded-xl transition-colors"
                  >
                    Refresh Page
                  </button>
                  <button
                    onClick={() => this.setState({ hasError: false })}
                    className="w-full bg-white/10 hover:bg-white/20 text-white font-medium py-3 rounded-xl transition-colors"
                  >
                    Try Again
                  </button>
                </div>
                {process.env.NODE_ENV === 'development' && this.state.error && (
                  <details className="mt-6 text-left">
                    <summary className="text-sm text-[var(--text-muted)] cursor-pointer">
                      Error Details
                    </summary>
                    <pre className="text-xs text-red-300 mt-2 bg-red-900/20 p-3 rounded-lg overflow-x-auto">
                      {this.state.error.toString()}
                    </pre>
                  </details>
                )}
              </div>
            </div>
          </div>
        )
      )
    }

    return this.props.children
  }
}