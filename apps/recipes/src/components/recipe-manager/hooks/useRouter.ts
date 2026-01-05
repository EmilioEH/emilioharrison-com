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
    return {
      view: (params.get('view') as ViewMode) || 'library',
      activeRecipeId: params.get('recipe'),
      searchQuery: params.get('q') || '',
    }
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
        setState({
          view: (params.get('view') as ViewMode) || 'library',
          activeRecipeId: params.get('recipe'),
          searchQuery: params.get('q') || '',
        })
      }
    }

    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  return {
    ...state,
    setRecipe: (id: string | null) => updateRoute({ activeRecipeId: id }),
    setView: (view: ViewMode) => updateRoute({ view }),
    setSearch: (query: string) => updateRoute({ searchQuery: query }),
    setRoute: updateRoute,
  }
}
