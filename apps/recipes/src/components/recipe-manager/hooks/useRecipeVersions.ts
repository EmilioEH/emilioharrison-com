import { useState, useCallback } from 'react'
import type { RecipeVersion, Recipe } from '../../../lib/types'

interface UseRecipeVersionsResult {
  versions: RecipeVersion[] // Metadata list
  isLoading: boolean
  error: string | null
  fetchVersions: (recipeId: string) => Promise<void>
  createSnapshot: (
    recipeId: string,
    changeType: RecipeVersion['changeType'],
    data: Partial<Recipe>,
  ) => Promise<boolean>
  restoreVersion: (recipeId: string, versionId: string) => Promise<boolean>
}

export function useRecipeVersions(): UseRecipeVersionsResult {
  const [versions, setVersions] = useState<RecipeVersion[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchVersions = useCallback(async (recipeId: string) => {
    setIsLoading(true)
    setError(null)
    try {
      const res = await fetch(`/protected/recipes/api/recipes/${recipeId}/versions`)
      if (!res.ok) throw new Error('Failed to fetch versions')
      const data = await res.json()
      if (data.success) {
        setVersions(data.versions)
      }
    } catch (err) {
      console.error(err)
      setError('Could not load history')
    } finally {
      setIsLoading(false)
    }
  }, [])

  const createSnapshot = useCallback(
    async (recipeId: string, changeType: RecipeVersion['changeType'], data: Partial<Recipe>) => {
      try {
        const res = await fetch(`/protected/recipes/api/recipes/${recipeId}/versions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ changeType, data }),
        })
        return res.ok
      } catch (err) {
        console.error('Snapshot failed', err)
        return false
      }
    },
    [],
  )

  const restoreVersion = useCallback(async (recipeId: string, versionId: string) => {
    try {
      const res = await fetch(`/protected/recipes/api/recipes/${recipeId}/restore`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ versionId }),
      })
      return res.ok
    } catch (err) {
      console.error('Restore failed', err)
      return false
    }
  }, [])

  return {
    versions,
    isLoading,
    error,
    fetchVersions,
    createSnapshot,
    restoreVersion,
  }
}
