'use client'

import { ReactNode, useState, useEffect } from 'react'

interface SafeAppProps {
  children: ReactNode
}

export default function SafeApp({ children }: SafeAppProps) {
  const [hasError, setHasError] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string>('')

  useEffect(() => {
    // Global error handler for unhandled client-side errors
    const handleError = (event: ErrorEvent) => {
      console.error('Client-side error caught:', event.error)
      setHasError(true)
      setErrorMessage(event.error?.message || 'Unknown error occurred')
    }

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      console.error('Unhandled promise rejection:', event.reason)
      setHasError(true)
      setErrorMessage(event.reason?.message || 'Service unavailable')
    }

    window.addEventListener('error', handleError)
    window.addEventListener('unhandledrejection', handleUnhandledRejection)

    return () => {
      window.removeEventListener('error', handleError)
      window.removeEventListener('unhandledrejection', handleUnhandledRejection)
    }
  }, [])

  if (hasError) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center">
          <div className="bg-gray-800 rounded-2xl p-8 border border-gray-700">
            <div className="text-red-400 text-4xl mb-4">⚠️</div>
            <h1 className="text-xl font-bold mb-4">Service Temporarily Unavailable</h1>
            <p className="text-gray-400 mb-6">
              We're experiencing technical difficulties. Please try again in a few moments.
            </p>
            <div className="space-y-3">
              <button
                onClick={() => window.location.reload()}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 rounded-xl transition-colors"
              >
                Refresh Page
              </button>
              <button
                onClick={() => {
                  setHasError(false)
                  setErrorMessage('')
                }}
                className="w-full bg-gray-700 hover:bg-gray-600 text-white font-medium py-3 rounded-xl transition-colors"
              >
                Try Again
              </button>
            </div>
            {process.env.NODE_ENV === 'development' && (
              <details className="mt-6 text-left">
                <summary className="text-sm text-gray-400 cursor-pointer">
                  Error Details (Dev Mode)
                </summary>
                <pre className="text-xs text-red-300 mt-2 bg-red-900/20 p-3 rounded-lg overflow-x-auto">
                  {errorMessage}
                </pre>
              </details>
            )}
          </div>
        </div>
      </div>
    )
  }

  return <>{children}</>
}