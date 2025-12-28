import { useEffect, useRef } from 'react'

export const useUrlSync = (view, setView, recipes, selectedRecipe, setSelectedRecipe, loading) => {
  const isPopState = useRef(false)
  const initialLoadDone = useRef(false)

  // 1. Listen for Back/Forward buttons (Popstate)
  useEffect(() => {
    const handlePopState = () => {
      isPopState.current = true
      const params = new URLSearchParams(window.location.search)
      const v = params.get('view') || 'library'
      const id = params.get('id')

      setView(v)

      // If we have an ID and recipes are loaded, select it
      if (id && recipes.length > 0) {
        // handle number/string legacy
        const found = recipes.find((r) => r.id === id) || recipes.find((r) => r.id === Number(id))
        if (found) setSelectedRecipe(found)
      } else if (!id) {
        setSelectedRecipe(null)
      }
    }

    window.addEventListener('popstate', handlePopState)

    // Initial Load: Check URL once when recipes first load to restore deep link
    // Only run this ONCE when the app first loads with data, not every time recipes change
    if (!initialLoadDone.current && !loading && recipes.length > 0) {
      initialLoadDone.current = true
      const params = new URLSearchParams(window.location.search)
      if (params.get('view') || params.get('id')) {
        handlePopState()
      }
    }

    return () => window.removeEventListener('popstate', handlePopState)
  }, [loading, recipes, setView, setSelectedRecipe])

  // 2. Push State when View/Recipe changes
  useEffect(() => {
    if (isPopState.current) {
      isPopState.current = false
      return
    }

    const params = new URLSearchParams(window.location.search)
    const currentView = params.get('view') || 'library'
    const currentId = params.get('id')

    // Don't push if nothing changed (avoids duplicates)
    if (currentView === view && currentId === (selectedRecipe?.id?.toString() || undefined)) {
      return
    }

    const newParams = new URLSearchParams()
    if (view !== 'library') newParams.set('view', view)
    if (selectedRecipe && selectedRecipe.id) newParams.set('id', selectedRecipe.id)

    const search = newParams.toString()
    const newUrl = search ? `?${search}` : window.location.pathname

    window.history.pushState({}, '', newUrl)
  }, [view, selectedRecipe])
}
