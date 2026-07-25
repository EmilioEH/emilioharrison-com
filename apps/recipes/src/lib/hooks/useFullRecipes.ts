import { useEffect, useRef, useState } from 'react'
import type { Recipe } from '../types'

/**
 * Fetches the *complete* recipe documents for a set of ids.
 *
 * The library list endpoint (`GET /api/recipes`) deliberately projects recipes down to just the
 * fields the list view renders — see `toListRecipe` — which excludes `structuredIngredients`.
 * That projection is right for a 400-recipe list, but the grocery list needs the structured
 * ingredients (clean name, numeric amount, unit, category) that only exist on the full document.
 *
 * Without this, the Raw grocery view silently fell back to parsing free-text display ingredients:
 * every row landed in "Other", the whole verbose ingredient sentence became the row label, and
 * short entries printed their amount twice ("½ Tsp ½ Tsp Sea Salt"). The clean data was in
 * Firestore the entire time, just never requested.
 *
 * Only a week's worth of recipes (typically a handful) is ever fetched, and results are cached
 * per id for the lifetime of the hook, so switching weeks back and forth doesn't refetch.
 */
export function useFullRecipes(ids: string[]): { recipes: Recipe[]; loading: boolean } {
  const [cache, setCache] = useState<Record<string, Recipe>>({})
  const [loading, setLoading] = useState(false)
  // Ids currently in flight or already resolved — prevents a re-render storm from refetching.
  const requested = useRef<Set<string>>(new Set())

  const key = ids.join(',')

  useEffect(() => {
    const missing = ids.filter((id) => id && !requested.current.has(id))
    if (missing.length === 0) return

    missing.forEach((id) => requested.current.add(id))
    let cancelled = false
    setLoading(true)

    const baseUrl = import.meta.env.BASE_URL.endsWith('/')
      ? import.meta.env.BASE_URL
      : `${import.meta.env.BASE_URL}/`

    Promise.all(
      missing.map(async (id) => {
        try {
          const res = await fetch(`${baseUrl}api/recipes/${id}`)
          if (!res.ok) return null
          const data = await res.json()
          return (data.recipe || data) as Recipe
        } catch {
          // A failed fetch just means this recipe keeps using its list-shaped data, which still
          // renders — degraded, not broken. Allow a later attempt to retry it.
          requested.current.delete(id)
          return null
        }
      }),
    ).then((results) => {
      if (cancelled) return
      const next: Record<string, Recipe> = {}
      for (const r of results) {
        if (r?.id) next[r.id] = r
      }
      if (Object.keys(next).length > 0) setCache((prev) => ({ ...prev, ...next }))
      setLoading(false)
    })

    return () => {
      cancelled = true
    }
    // `key` is the stable serialisation of `ids`; depending on the array itself would refire on
    // every render since the caller rebuilds it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  return { recipes: ids.map((id) => cache[id]).filter((r): r is Recipe => !!r), loading }
}
