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
    const runtime = locals.runtime

    if (!runtime || !runtime.env || !runtime.env.DB) {
      throw new Error('DB binding missing')
    }

    const { env } = runtime

    await env.DB.prepare(
      `INSERT INTO feedback (id, type, description, expected, actual, screenshot, logs, context, timestamp)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
      .bind(
        feedback.id,
        feedback.type,
        feedback.description,
        feedback.expected,
        feedback.actual,
        feedback.screenshot,
        JSON.stringify(feedback.logs),
        JSON.stringify(feedback.context),
        feedback.timestamp,
      )
      .run()

    return new Response(JSON.stringify({ success: true }), {
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
