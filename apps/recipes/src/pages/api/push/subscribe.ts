import type { APIRoute } from 'astro'
import { db } from '../../../lib/firebase-server'
import { getAuthUser, unauthorizedResponse } from '../../../lib/api-helpers'

export const POST: APIRoute = async ({ request, cookies }) => {
  const userId = getAuthUser(cookies)

  if (!userId) {
    return unauthorizedResponse()
  }

  try {
    const subscription = await request.json()

    if (!subscription || !subscription.endpoint || !subscription.keys) {
      return new Response(JSON.stringify({ error: 'Invalid subscription data' }), {
        status: 400,
      })
    }

    // Use a deterministic ID based on the endpoint to allow overwrites (upsert)
    const id = btoa(subscription.endpoint).replace(/\//g, '_').replace(/\+/g, '-').replace(/=/g, '')

    const docData = {
      id,
      userId,
      userAgent: request.headers.get('user-agent') || 'unknown',
      endpoint: subscription.endpoint,
      keys: subscription.keys,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    // Store in a subcollection for efficient retrieval by user
    // Use setDocument for UPSERT behavior (create if missing, update if exists)
    await db.setDocument(`users/${userId}/push_subscriptions`, id, docData)

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error: unknown) {
    console.error('Subscription Error:', error)
    return new Response(JSON.stringify({ error: 'Failed to save subscription' }), {
      status: 500,
    })
  }
}
