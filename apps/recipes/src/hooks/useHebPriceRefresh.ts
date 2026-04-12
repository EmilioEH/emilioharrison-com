import { useEffect, useRef } from 'react'
import { useStore } from '@nanostores/react'
import { $hebStore } from '../lib/userPreferences'
import type { ShoppableIngredient, HebProduct } from '../lib/types'

const STALENESS_MS = 12 * 60 * 60 * 1000 // 12 hours
const STARTUP_DELAY_MS = 3000 // wait 3s after render before starting
const BETWEEN_REQUESTS_MS = 800 // 800ms between each refresh

function isStale(hebRefreshedAt?: string): boolean {
  if (!hebRefreshedAt) return true
  return Date.now() - new Date(hebRefreshedAt).getTime() > STALENESS_MS
}

/**
 * Silently refreshes HEB price/availability data for grocery list items in the background.
 *
 * - Waits 3s after mount so it doesn't compete with initial list render
 * - Only processes items that have a hebProductId and stale/missing hebRefreshedAt (>12h)
 * - Uses the user's saved HEB store ID for pricing context
 * - Serial queue with 800ms between requests to avoid rate limiting
 * - Aborts on any HEB error so we never hammer a failing endpoint
 * - All writes (PATCH item + POST override) are fire-and-forget, no UI state changes
 */
export function useHebPriceRefresh(
  ingredients: ShoppableIngredient[],
  weekStartDate: string | undefined,
  userId: string | undefined,
  baseUrl: string,
) {
  const hebStore = useStore($hebStore)
  const abortRef = useRef<AbortController | null>(null)
  const startupTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const queueTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!weekStartDate || !userId) return

    const staleItems = ingredients.filter((ing) => ing.hebProductId && isStale(ing.hebRefreshedAt))

    if (staleItems.length === 0) return

    const storeId = hebStore?.storeId

    // Run after startup delay so the list has fully rendered first
    startupTimerRef.current = setTimeout(() => {
      let index = 0
      let aborted = false

      const processNext = () => {
        if (aborted || index >= staleItems.length) return

        const item = staleItems[index]
        index++

        const controller = new AbortController()
        abortRef.current = controller

        const params = new URLSearchParams({ productId: item.hebProductId! })
        if (storeId) params.set('storeId', storeId)

        fetch(`${baseUrl}api/grocery/heb-refresh?${params.toString()}`, {
          signal: controller.signal,
        })
          .then((res) => res.json())
          .then((data: { product?: HebProduct; error?: string }) => {
            if (data.error === 'heb_error') {
              // HEB is unhappy — stop the entire queue for this session
              aborted = true
              return
            }

            const product = data.product
            if (!product) return

            const now = new Date().toISOString()

            const updates: Partial<ShoppableIngredient> = {
              ...(product.price !== undefined && {
                hebPrice: product.salePrice ?? product.price,
              }),
              ...(product.priceUnit && { hebPriceUnit: product.priceUnit }),
              ...(product.unitPrice !== undefined && { hebUnitPrice: product.unitPrice }),
              ...(product.unitPriceUnit && { hebUnitPriceUnit: product.unitPriceUnit }),
              ...(product.size && { hebSize: product.size }),
              ...(product.imageUrl && { imageUrl: product.imageUrl }),
              ...(product.storeLocation && { storeLocation: product.storeLocation }),
              ...(product.category && { category: product.category }),
              hebRefreshedAt: now,
            }

            // Patch the grocery list item silently
            fetch(`${baseUrl}api/grocery/items`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ weekStartDate, userId, itemName: item.name, updates }),
            }).catch(() => {
              // Best-effort
            })

            // Update the product override so future lists get fresh data
            const override = {
              name: item.name,
              hebProductId: item.hebProductId,
              hebProductUrl: item.hebProductUrl,
              imageUrl: updates.imageUrl ?? item.imageUrl,
              hebPrice: updates.hebPrice,
              hebPriceUnit: updates.hebPriceUnit,
              hebUnitPrice: updates.hebUnitPrice,
              hebUnitPriceUnit: updates.hebUnitPriceUnit,
              hebSize: updates.hebSize ?? item.hebSize,
              category: updates.category ?? item.category,
              storeLocation: updates.storeLocation ?? item.storeLocation,
              updatedAt: now,
            }
            fetch(`${baseUrl}api/grocery/overrides`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ override }),
            }).catch(() => {
              // Best-effort
            })
          })
          .catch((err: unknown) => {
            if (err instanceof DOMException && err.name === 'AbortError') return
            // Network error — stop the queue
            aborted = true
          })
          .finally(() => {
            if (!aborted && index < staleItems.length) {
              queueTimerRef.current = setTimeout(processNext, BETWEEN_REQUESTS_MS)
            }
          })
      }

      processNext()
    }, STARTUP_DELAY_MS)

    return () => {
      if (startupTimerRef.current) clearTimeout(startupTimerRef.current)
      if (queueTimerRef.current) clearTimeout(queueTimerRef.current)
      abortRef.current?.abort()
    }
    // Run once when the ingredient list is first loaded — not on every re-render
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekStartDate, userId])
}
