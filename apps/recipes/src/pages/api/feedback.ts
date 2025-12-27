import type { APIRoute } from 'astro'

export const GET: APIRoute = async ({ cookies, locals }) => {
  const userCookie = cookies.get('site_user')
  const user = userCookie?.value

  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  try {
    const runtime = locals.runtime

    if (!runtime || !runtime.env || !runtime.env.DB) {
      return new Response(JSON.stringify({ error: 'DB configuration error' }), { status: 500 })
    }
    const { env } = runtime

    const { results } = await env.DB.prepare('SELECT * FROM feedback ORDER BY timestamp DESC').all()

    type FeedbackRow = {
      id: string
      type: 'bug' | 'idea'
      description: string
      expected?: string
      actual?: string
      screenshot?: string
      logs?: string
      context?: string
      timestamp: string
    }

    // Parse JSON fields
    // Note: If data was offloaded to R2, the field will contain "r2:..." string.
    // The frontend/consumer will need to handle fetching that content if needed.
    const parsedResults = (results as unknown as FeedbackRow[]).map((row) => {
      let logs: unknown = []
      let context: unknown = {}

      try {
        // Only parse if it looks like JSON and not an R2 reference or error message
        if (row.logs && !row.logs.startsWith('r2:') && !row.logs.startsWith('[')) {
          logs = JSON.parse(row.logs)
        } else if (typeof row.logs === 'string') {
          // Keep as string if it's an R2 reference or error message
          logs = row.logs
        }

        if (row.context && !row.context.startsWith('r2:') && !row.context.startsWith('[')) {
          context = JSON.parse(row.context)
        } else if (typeof row.context === 'string') {
          context = row.context
        }
      } catch (e) {
        console.warn('Failed to parse feedback row JSON', e)
      }

      return {
        ...row,
        logs,
        context,
      }
    })

    return new Response(JSON.stringify(parsedResults), {
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

/**
 * Helper to upload data to R2 if available, or return original data if small enough.
 * Returns the string to be stored in D1 (either original data, R2 key, or error placeholder).
 */
async function handleLargeData(
  env: App.Locals['runtime']['env'],
  id: string,
  field: string,
  data: string,
  contentType: string,
  maxD1Size = 20000, // 20KB safe limit for text in D1
): Promise<string> {
  if (!data) return data

  const isR2Available = !!env.BUCKET
  const size = data.length

  // If small enough for D1, keep it
  if (size <= maxD1Size) {
    return data
  }

  // If R2 is available, try to upload
  if (isR2Available) {
    try {
      const key = `feedback/${id}/${field}`
      // If it's a base64 image (screenshot), decode it first
      let body: string | Buffer = data
      let finalContentType = contentType

      if (field === 'screenshot' && data.startsWith('data:image')) {
        const base64Data = data.replace(/^data:image\/\w+;base64,/, '')
        body = Buffer.from(base64Data, 'base64')
        finalContentType = 'image/png'
      }

      await env.BUCKET.put(key, body, {
        httpMetadata: { contentType: finalContentType },
      })
      console.log(`[Feedback API] Offloaded ${field} (${size} chars) to R2: ${key}`)
      return `r2:${key}`
    } catch (err) {
      console.error(`[Feedback API] Failed to upload ${field} to R2:`, err)
      // Fall through to size check fallback
    }
  }

  // If R2 missing or failed, and still too big -> Truncate/Drop
  // We use a larger "absolute max" for D1 if we really have to, but 1MB is the hard row limit.
  // 100KB is a safer fallback limit.
  if (size > 100000) {
    console.warn(`[Feedback API] ${field} too large (${size}) and R2 unavailable/failed. Dropping.`)
    return `[${field} Too Large - R2 Missing]`
  }

  return data
}

export const POST: APIRoute = async ({ request, cookies, locals }) => {
  const userCookie = cookies.get('site_user')
  const user = userCookie?.value

  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  try {
    const feedback = await request.json()
    console.log('[Feedback API] Received feedback submission:', {
      id: feedback.id,
      type: feedback.type,
      hasScreenshot: !!feedback.screenshot,
      screenshotSize: feedback.screenshot?.length || 0,
      logsLength: JSON.stringify(feedback.logs).length,
      contextLength: JSON.stringify(feedback.context).length,
    })

    const runtime = locals.runtime

    if (!runtime || !runtime.env || !runtime.env.DB) {
      return new Response(
        JSON.stringify({
          error: 'Database not configured',
          details: 'DB binding is missing from runtime environment',
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } },
      )
    }

    const { env } = runtime

    // Process fields that might be large (screenshot, logs, context)
    const screenshotVal = await handleLargeData(
      env,
      feedback.id,
      'screenshot',
      feedback.screenshot,
      'image/png',
    )

    const logsStr = JSON.stringify(feedback.logs || [])
    const logsVal = await handleLargeData(
      env,
      feedback.id,
      'logs.json',
      logsStr,
      'application/json',
    )

    const contextStr = JSON.stringify(feedback.context || {})
    const contextVal = await handleLargeData(
      env,
      feedback.id,
      'context.json',
      contextStr,
      'application/json',
    )

    console.log('[Feedback API] Preparing D1 insert statement...')
    const stmt = env.DB.prepare(
      `INSERT INTO feedback (id, type, description, expected, actual, screenshot, logs, context, timestamp)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )

    console.log('[Feedback API] Binding values to statement...')
    const boundStmt = stmt.bind(
      feedback.id,
      feedback.type,
      feedback.description,
      feedback.expected,
      feedback.actual,
      screenshotVal,
      logsVal,
      contextVal,
      feedback.timestamp,
    )

    console.log('[Feedback API] Executing D1 statement...')
    await boundStmt.run()

    console.log('[Feedback API] Feedback saved successfully!')
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error'
    const errorStack = err instanceof Error ? err.stack : undefined

    console.error('[Feedback API] Fatal error:', {
      message: errorMessage,
      stack: errorStack,
      error: err,
    })

    return new Response(
      JSON.stringify({
        error: 'Internal Server Error',
        details: errorMessage,
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      },
    )
  }
}
