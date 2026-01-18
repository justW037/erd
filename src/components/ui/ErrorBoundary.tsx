import React from 'react'

interface ErrorBoundaryState {
  hasError: boolean
  error?: Error
}

export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    // eslint-disable-next-line no-console
    console.error('Uncaught error in ERD Designer:', error, info)
  }

  render(): React.ReactNode {
    if (this.state.hasError) {
      return (
        <div className="h-screen flex flex-col items-center justify-center bg-slate-950 text-slate-100">
          <h1 className="text-lg font-semibold mb-2">Something went wrong.</h1>
          <p className="text-sm text-slate-400 mb-4">
            Please refresh the page. If the problem persists, check the console for details.
          </p>
        </div>
      )
    }
    return this.props.children
  }
}

export default ErrorBoundary

