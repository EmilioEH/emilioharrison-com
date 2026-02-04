import { useState, useEffect, useCallback } from 'react'

// Define the shape of our route state
export type ViewMode =
  | 'library'
  | 'detail'
  | 'edit'
  | 'grocery'
  | 'week'
  | 'settings'
  | 'feedback-dashboard'
  | 'bulk-import'
  | 'family-settings'
  | 'admin-dashboard'
  | 'invite'
  | 'notifications'

export interface RouteState {
  view: ViewMode
  activeRecipeId: string | null
  searchQuery: string
}

export function useRouter() {
  // Initialize state from URL if present
  const [state, setState] = useState<RouteState>(() => {
    if (typeof window === 'undefined') {
      return { view: 'library', activeRecipeId: null, searchQuery: '' }
    }

    const params = new URLSearchParams(window.location.search)
    let view = (params.get('view') as ViewMode) || 'library'
    const activeRecipeId = params.get('recipe')
    const searchQuery = params.get('q') || ''

    // Auto-correct inconsistent state: if we have a recipe but no view, set view to detail
    if (activeRecipeId && view === 'library') {
      view = 'detail'

      // Update URL to fix the inconsistency
      const correctedParams = new URLSearchParams()
      correctedParams.set('view', 'detail')
      correctedParams.set('recipe', activeRecipeId)
      if (searchQuery) correctedParams.set('q', searchQuery)
      const newUrl = `${window.location.pathname}?${correctedParams.toString()}`
      window.history.replaceState({ view, activeRecipeId, searchQuery }, '', newUrl)
    }

    return { view, activeRecipeId, searchQuery }
  })

  // Sync state to URL and History
  const updateRoute = useCallback((updates: Partial<RouteState>) => {
    setState((prev) => {
      const next = { ...prev, ...updates }

      // Construct new URL
      const params = new URLSearchParams()
      if (next.view !== 'library') params.set('view', next.view)
      if (next.activeRecipeId) params.set('recipe', next.activeRecipeId)
      if (next.searchQuery) params.set('q', next.searchQuery)

      const newUrl = `${window.location.pathname}${params.toString() ? '?' + params.toString() : ''}`

      // Push to history if relevant state changed (e.g. opening a recipe)
      // Replace history if just typing in search
      if (prev.activeRecipeId !== next.activeRecipeId || prev.view !== next.view) {
        window.history.pushState(next, '', newUrl)
      } else {
        window.history.replaceState(next, '', newUrl)
      }

      return next
    })
  }, [])

  // Listen for browser back/forward events
  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      if (event.state) {
        setState(event.state)
      } else {
        // Fallback to parsing URL if state is null (e.g. initial load)
        const params = new URLSearchParams(window.location.search)
        const newState = {
          view: (params.get('view') as ViewMode) || 'library',
          activeRecipeId: params.get('recipe'),
          searchQuery: params.get('q') || '',
        }
        setState(newState)
      }
    }

    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  // Memoize the setter functions to prevent re-creating them on every render
  // This is critical for preventing infinite loops when these are used in useEffect dependencies
  const setRecipe = useCallback(
    (id: string | null) => updateRoute({ activeRecipeId: id }),
    [updateRoute],
  )
  const setView = useCallback((view: ViewMode) => updateRoute({ view }), [updateRoute])
  const setSearch = useCallback((query: string) => updateRoute({ searchQuery: query }), [updateRoute])

  return {
    ...state,
    setRecipe,
    setView,
    setSearch,
    setRoute: updateRoute,
  }
}
