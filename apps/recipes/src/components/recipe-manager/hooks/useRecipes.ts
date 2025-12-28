import { useState, useEffect, useRef } from 'react'
import type { Recipe } from '../../../lib/types'

const getBaseUrl = (): string => {
  const base = import.meta.env.BASE_URL
  return base.endsWith('/') ? base : `${base}/`
}

export const useRecipes = () => {
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const mounted = useRef<boolean>(true)

  const refreshRecipes = async (showLoading = true): Promise<void> => {
    // Only set loading true if explicitly requested and component is mounted
    if (showLoading && mounted.current) setLoading(true)

    try {
      const res = await fetch(`${getBaseUrl()}api/recipes`)
      if (res.ok) {
        const data = await res.json()
        if (mounted.current) setRecipes((data.recipes as Recipe[]) || [])
      }
    } catch (err) {
      console.error('Failed to load recipes', err)
    } finally {
      // Always clear loading state if it was set, provided component is mounted
      if (showLoading && mounted.current) setLoading(false)
    }
  }

  useEffect(() => {
    mounted.current = true
    refreshRecipes()
    return () => {
      mounted.current = false
    }
  }, [])

  return { recipes, setRecipes, loading, refreshRecipes, getBaseUrl }
}
