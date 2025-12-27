import { useState, useEffect } from 'react'

const getBaseUrl = () => {
  const base = import.meta.env.BASE_URL
  return base.endsWith('/') ? base : `${base}/`
}

export const useRecipes = () => {
  const [recipes, setRecipes] = useState([])
  const [loading, setLoading] = useState(true)

  const refreshRecipes = async () => {
    setLoading(true)
    try {
      const res = await fetch(`${getBaseUrl()}api/recipes`)
      if (res.ok) {
        const data = await res.json()
        setRecipes(data.recipes || [])
      }
    } catch (err) {
      console.error('Failed to load recipes', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    refreshRecipes()
  }, [])

  return { recipes, setRecipes, loading, refreshRecipes, getBaseUrl }
}
