import { useState, useEffect, useRef } from 'react'

const getBaseUrl = () => {
  const base = import.meta.env.BASE_URL
  return base.endsWith('/') ? base : `${base}/`
}

export const useRecipes = () => {
  const [recipes, setRecipes] = useState([])
  const [loading, setLoading] = useState(true)
  const mounted = useRef(true)

  const refreshRecipes = async (showLoading = true) => {
    // Only set loading true if explicitly requested and component is mounted
    if (showLoading && mounted.current) setLoading(true)

    try {
      const res = await fetch(`${getBaseUrl()}api/recipes`)
      if (res.ok) {
        const data = await res.json()
        if (mounted.current) setRecipes(data.recipes || [])
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
