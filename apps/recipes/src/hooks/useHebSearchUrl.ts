import { useStore } from '@nanostores/react'
import { $hebStore } from '../lib/userPreferences'

/**
 * Build the HEB search URL with the user's preferred store ID.
 */
export function useHebSearchUrl() {
  const hebStore = useStore($hebStore)

  const buildUrl = (query: string, baseUrl: string) => {
    const params = new URLSearchParams({ q: query })
    if (hebStore?.storeId) {
      params.set('storeId', hebStore.storeId)
    }
    return `${baseUrl}api/grocery/heb-search?${params.toString()}`
  }

  return { buildUrl, storeId: hebStore?.storeId }
}
