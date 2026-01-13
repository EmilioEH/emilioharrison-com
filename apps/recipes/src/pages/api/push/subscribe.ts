import type { APIRoute } from 'astro'
import { db } from '../../../lib/firebase-server'

export const POST: APIRoute = async (context) => {
  const { request, cookies } = context

  // Optional: Check auth (though allowing unauthenticated devices might be useful for login alerts later)
  // For now, let's allow it but maybe associate with a user if logged in
  const emailCookie = cookies.get('site_email')
  const email = emailCookie?.value || 'anonymous'

  try {
    const subscription = await request.json()

    if (!subscription || !subscription.endpoint || !subscription.keys) {
      return new Response(JSON.stringify({ error: 'Invalid subscription data' }), {
        status: 400,
      })
    }

    // Hash the endpoint to create a stable ID (prevent duplicates)
    // We can just use the endpoint URL itself as ID since Firestore keys handle strings well
    // But hashing is cleaner if the URL is super long. Firestore IDs limit is 1500 bytes.
    // Let's just use a simplified Base64 safety replacement or just encodeURIComponent
    // Actually, converting to a clean ID is better.
    // Let's use crypto.subtle if available (Cloudflare) or simple string replacement
    // Simple approach: Use sha-256 if possible, or just generate a random ID and query by endpoint?
    // Query by endpoint is better for "upsert".

    // Ideally we want idempotent saves.
    // Let's query by endpoint first.
    const endpoint = subscription.endpoint

    // We will use a deterministic ID based on the endpoint to allow overwrites
    // But since we don't have crypto easily here without async, let's query.
    // Actually, we can use the last segment of the endpoint if it's unique, but not guaranteed.

    // Strategy: Search for existing subscription with this endpoint.
    // Since we don't have a robust "find by field" setup in our firebase-rest helper (it gets all),
    // and we expect few subscriptions per user, but potentially many total.

    // Let's just create a new document with random ID for now, and rely on the client to manage it?
    // No, duplicates are bad.

    // Better: use the endpoint as the key if we can sanitized it.
    // Base64 encode the endpoint to make it safe as a document ID
    const id = btoa(endpoint).replace(/\//g, '_').replace(/\+/g, '-').replace(/=/g, '')

    const docData = {
      id,
      userId: email, // Associate with current user
      userAgent: request.headers.get('user-agent') || 'unknown',
      endpoint: subscription.endpoint,
      keys: subscription.keys,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    await db.createDocument('push_subscriptions', id, docData)

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
