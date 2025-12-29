import type { APIRoute } from 'astro'
import { db, bucket } from '../../lib/firebase-server'
import type { Feedback } from '../../lib/types'

export const GET: APIRoute = async ({ cookies }) => {
  const userCookie = cookies.get('site_user')
  const user = userCookie?.value

  if (!user || user !== 'Emilio') {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  try {
    // REST API orderBy
    const feedbackList = await db.getCollection('feedback', 'timestamp', 'DESC')
    // Data already mapped

    return new Response(JSON.stringify(feedbackList), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('DB Error:', err)
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}

async function uploadToStorage(
  id: string,
  field: string,
  data: string, // Base64 or string content
): Promise<string> {
  if (!data) return data

  if (field === 'screenshot' && data.startsWith('data:image')) {
    const key = `feedback/${id}/${field}.png`

    // REST Upload
    const base64Data = data.replace(/^data:image\/\w+;base64,/, '')
    const buffer = Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0))

    // Assuming we can access uploadFile on bucket alias
    // We need to pass bucket name too? The service class implementation requires bucket name.
    // Hack: getting projectId from service to construct bucket name
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const projectId = (bucket as any).projectId
    const bucketName = `${projectId}.firebasestorage.app`

    await bucket.uploadFile(bucketName, key, buffer, 'image/png')

    return `storage:${key}`
  }

  return data
}

export const POST: APIRoute = async ({ request }) => {
  // Feedback submissions are allowed from any user, including unauthenticated users
  // The user info is captured in the client-side context object
  try {
    const feedback = await request.json()
    const id = feedback.id || crypto.randomUUID()

    // Upload screenshot if present
    const screenshot = await uploadToStorage(id, 'screenshot', feedback.screenshot)

    // Logs and Context are just JSON objects, Firestore handles them fine.
    const logs = typeof feedback.logs === 'string' ? JSON.parse(feedback.logs) : feedback.logs
    const context =
      typeof feedback.context === 'string' ? JSON.parse(feedback.context) : feedback.context

    // SANITIZATION: Aggressively flatten context to Map<String, String>
    // This strictly prevents "invalid nested entity" errors by ensuring NO nested objects/arrays exist.
    const safeContext: Record<string, string> = {}

    if (context && typeof context === 'object') {
      try {
        Object.entries(context).forEach(([key, value]) => {
          if (typeof value === 'string') {
            safeContext[key] = value
          } else if (value === null || value === undefined) {
            // Skip nulls or store as "null" string if preferred. Skipping is cleaner.
          } else {
            // Force everything else (Numbers, Objects, Arrays) to a JSON string representation
            safeContext[key] = JSON.stringify(value)
          }
        })
      } catch (e) {
        console.warn('Context flattening failed', e)
        safeContext['error'] = 'Context serialization failed'
      }
    }

    // Replace the original context with our safe version
    const finalContext = safeContext

    const newFeedback: Partial<Feedback> = {
      id,
      type: feedback.type,
      description: feedback.description,
      expected: feedback.expected,
      actual: feedback.actual,
      screenshot,
      logs,
      context: finalContext,
      timestamp: feedback.timestamp || new Date().toISOString(),
      status: 'open',
    }

    await db.createDocument('feedback', id, newFeedback)

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('Feedback POST Error:', err)
    return new Response(
      JSON.stringify({
        error: 'Internal Server Error',
        details: (err as Error).message,
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      },
    )
  }
}

export const PUT: APIRoute = async ({ request, cookies }) => {
  const userCookie = cookies.get('site_user')
  const user = userCookie?.value

  if (!user || user !== 'Emilio') {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  try {
    const { id, status } = await request.json()

    if (!id || !status) {
      return new Response(JSON.stringify({ error: 'Missing id or status' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const resolvedAt = status === 'fixed' || status === 'wont-fix' ? new Date().toISOString() : null

    await db.updateDocument('feedback', id, {
      status,
      resolved_at: resolvedAt,
    })

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('Feedback PUT Error:', err)
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
