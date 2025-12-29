import type { APIRoute } from 'astro'
import { db, bucket } from '../../lib/firebase-server'

export const GET: APIRoute = async ({ cookies }) => {
  const emailCookie = cookies.get('site_email')
  const email = emailCookie?.value

  const adminEmailsEnv = import.meta.env.ADMIN_EMAILS || ''
  const adminEmails = adminEmailsEnv.split(',').map((e: string) => e.trim().toLowerCase())

  if (!email || !adminEmails.includes(email.toLowerCase())) {
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
    let screenshot: string | null = null
    try {
      screenshot = await uploadToStorage(id, 'screenshot', feedback.screenshot)
    } catch (uploadErr) {
      console.error('Screenshot upload failed, storing error:', uploadErr)
      screenshot = `upload_error:${(uploadErr as Error).message}`
    }

    // NUCLEAR OPTION: Store complex data as JSON strings to completely avoid nested entity errors
    // Firestore REST API is extremely strict about nested structures

    // Stringify logs entirely - no nested arrays at all
    let logsJson = '[]'
    try {
      const rawLogs = typeof feedback.logs === 'string' ? JSON.parse(feedback.logs) : feedback.logs
      logsJson = JSON.stringify(rawLogs || [])
    } catch {
      logsJson = '[]'
    }

    // Stringify context entirely - no nested objects at all
    let contextJson = '{}'
    try {
      const rawContext =
        typeof feedback.context === 'string' ? JSON.parse(feedback.context) : feedback.context
      contextJson = JSON.stringify(rawContext || {})
    } catch {
      contextJson = '{}'
    }

    // Store ONLY primitive string values - no nested structures whatsoever
    const newFeedback = {
      id: String(id),
      type: String(feedback.type || ''),
      description: String(feedback.description || ''),
      expected: String(feedback.expected || ''),
      actual: String(feedback.actual || ''),
      screenshot: screenshot ? String(screenshot) : null,
      logs: logsJson, // Already a JSON string
      context: contextJson, // Already a JSON string
      timestamp: String(feedback.timestamp || new Date().toISOString()),
      status: 'open',
    }

    await db.createDocument('feedback', String(id), newFeedback)

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
  const emailCookie = cookies.get('site_email')
  const email = emailCookie?.value

  const adminEmailsEnv = import.meta.env.ADMIN_EMAILS || ''
  const adminEmails = adminEmailsEnv.split(',').map((e: string) => e.trim().toLowerCase())

  if (!email || !adminEmails.includes(email.toLowerCase())) {
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
