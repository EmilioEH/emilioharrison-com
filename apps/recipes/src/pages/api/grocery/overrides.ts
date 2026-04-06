import type { APIRoute } from 'astro'
import { db } from '../../../lib/firebase-server'
import { getGroceryScopeId, unauthorizedResponse } from '../../../lib/api-helpers'
import { setRequestContext } from '../../../lib/request-context'
import type { ProductOverride } from '../../../lib/types'

/**
 * Product overrides CRUD.
 * Collection: product_overrides/{scopeId}/items/{normalizedName}
 * scopeId = familyId ?? userId (shared across family members)
 * Persists user-edited metadata (price, aisle, image, etc.) across grocery lists.
 */

function normalizeKey(name: string): string {
  return name.toLowerCase().trim().replace(/\s+/g, '-')
}

/**
 * GET: Fetch all overrides for a user, or a single override by name
 */
export const GET: APIRoute = async (context) => {
  setRequestContext(context)
  const scope = await getGroceryScopeId(context.cookies)
  if (!scope) return unauthorizedResponse()

  const itemName = context.url.searchParams.get('name')

  try {
    const collectionPath = `product_overrides/${scope.scopeId}/items`

    if (itemName) {
      const key = normalizeKey(itemName)
      const override = await db.getDocument<ProductOverride>(collectionPath, key)
      return new Response(JSON.stringify({ override: override || null }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const overrides = await db.getCollection<ProductOverride>(collectionPath)
    return new Response(JSON.stringify({ overrides }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Get overrides error:', error)
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Failed to fetch overrides',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    )
  }
}

/**
 * POST: Create or update a product override
 */
export const POST: APIRoute = async (context) => {
  setRequestContext(context)
  try {
    const scope = await getGroceryScopeId(context.cookies)
    if (!scope) return unauthorizedResponse()

    const { override } = (await context.request.json()) as {
      override: ProductOverride
    }

    if (!override?.name) {
      return new Response(JSON.stringify({ error: 'Missing override.name' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const collectionPath = `product_overrides/${scope.scopeId}/items`
    const key = normalizeKey(override.name)

    const data: ProductOverride = {
      ...override,
      updatedAt: new Date().toISOString(),
    }

    await db.setDocument(collectionPath, key, data)

    return new Response(JSON.stringify({ success: true, key }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Save override error:', error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Failed to save override' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    )
  }
}

/**
 * DELETE: Remove a product override
 */
export const DELETE: APIRoute = async (context) => {
  setRequestContext(context)
  try {
    const scope = await getGroceryScopeId(context.cookies)
    if (!scope) return unauthorizedResponse()

    const { name } = (await context.request.json()) as {
      name: string
    }

    if (!name) {
      return new Response(JSON.stringify({ error: 'Missing name' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const collectionPath = `product_overrides/${scope.scopeId}/items`
    const key = normalizeKey(name)

    await db.deleteDocument(collectionPath, key)

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Delete override error:', error)
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Failed to delete override',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    )
  }
}
