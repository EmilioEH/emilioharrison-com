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
    const parsedResults = (results as unknown as FeedbackRow[]).map((row) => ({
      ...row,
      logs: row.logs ? JSON.parse(row.logs) : [],
      context: row.context ? JSON.parse(row.context) : {},
    }))

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
    })

    const runtime = locals.runtime

    if (!runtime || !runtime.env || !runtime.env.DB) {
      console.error('[Feedback API] Missing runtime or DB binding:', {
        hasRuntime: !!runtime,
        hasEnv: !!runtime?.env,
        hasDB: !!runtime?.env?.DB,
      })
      return new Response(
        JSON.stringify({
          error: 'Database not configured',
          details: 'DB binding is missing from runtime environment',
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } },
      )
    }

    const { env } = runtime

    let screenshotVal = feedback.screenshot

    // Debug logging for bindings
    console.log('[Feedback API] Runtime env keys:', Object.keys(env))
    console.log('[Feedback API] BUCKET binding present:', !!env.BUCKET)

    // Offload screenshot to R2 if present and is base64
    if (feedback.screenshot && feedback.screenshot.startsWith('data:image')) {
      if (env.BUCKET) {
        try {
          console.log('[Feedback API] Attempting R2 upload...')
          const base64Data = feedback.screenshot.replace(/^data:image\/\w+;base64,/, '')
          // Convert base64 to Uint8Array using Buffer (nodejs_compat enabled)
          const buffer = Buffer.from(base64Data, 'base64')
          const bytes = new Uint8Array(buffer)

          const key = `feedback/${feedback.id}.png`
          await env.BUCKET.put(key, bytes, {
            httpMetadata: { contentType: 'image/png' },
          })

          // Store the R2 key instead of the massive base64 string
          screenshotVal = key
          console.log('[Feedback API] Uploaded screenshot to R2:', key)
        } catch (r2Error) {
          console.error('[Feedback API] Failed to upload screenshot to R2:', r2Error)
          // Fallback: Check size, if too big, drop it
          if (feedback.screenshot.length > 100000) {
            console.warn('[Feedback API] Screenshot too large for D1 fallback, dropping it.')
            screenshotVal = '[Image Upload Failed - Too Large for DB]'
          }
        }
      } else {
        console.warn('[Feedback API] BUCKET binding missing, skipping R2 upload')
        // Fail-safe: If image is too large for D1 (approx > 100KB is risky if limit is 1MB but let's be safe)
        // Actually D1 limit is 100MB for DB size but statement size is 1MB/100MB depending on plan.
        // Let's assume 1MB. 1MB chars is roughly 1MB bytes.

        if (feedback.screenshot.length > 500000) {
          // ~500KB safety limit
          console.warn(
            '[Feedback API] Screenshot too large for default D1 storage (missing R2), dropping it.',
          )
          screenshotVal = '[Image Too Large - R2 Missing]'
        }
      }
    }

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
      JSON.stringify(feedback.logs),
      JSON.stringify(feedback.context),
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
