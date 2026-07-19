import React from 'react'
import { AlertCircle } from 'lucide-react'

interface LazyViewErrorBoundaryProps {
  children: React.ReactNode
  /** Called when the user taps Retry — typically clears whatever caused the failed chunk load. */
  onRetry?: () => void
}

interface LazyViewErrorBoundaryState {
  hasError: boolean
}

/**
 * Catches failures in a lazily-loaded view chunk (e.g. a dropped connection mid-fetch of
 * RecipeDetail's code-split bundle) so a broken navigation shows a visible error with a retry
 * button instead of a dead tap — previously an uncaught chunk-load error here left the screen
 * exactly as it was, with no feedback that anything had gone wrong ("I tapped View Recipe and
 * nothing happened").
 */
export class LazyViewErrorBoundary extends React.Component<
  LazyViewErrorBoundaryProps,
  LazyViewErrorBoundaryState
> {
  constructor(props: LazyViewErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(): LazyViewErrorBoundaryState {
    return { hasError: true }
  }

  componentDidCatch(error: unknown) {
    console.error('[LazyViewErrorBoundary] Failed to load view:', error)
  }

  handleRetry = () => {
    this.setState({ hasError: false })
    this.props.onRetry?.()
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-full flex-col items-center justify-center gap-4 bg-card p-6 text-center">
          <div className="rounded-full bg-destructive/10 p-4">
            <AlertCircle className="h-8 w-8 text-destructive" />
          </div>
          <h2 className="text-xl font-bold text-foreground">This page didn't load</h2>
          <p className="max-w-md text-muted-foreground">
            Something went wrong loading this screen. Please try again.
          </p>
          <button
            onClick={this.handleRetry}
            className="rounded-lg bg-primary px-4 py-2 font-semibold text-primary-foreground hover:bg-primary/90"
          >
            Retry
          </button>
        </div>
      )
    }

    return this.props.children
  }
}
