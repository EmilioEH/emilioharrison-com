import type { APIRoute } from 'astro'
import type { Feedback } from '../../lib/types'

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

    if (!runtime || !runtime.env || !runtime.env.SESSION) {
      return new Response(JSON.stringify({ error: 'KV configuration error' }), { status: 500 })
    }
    const { env } = runtime

    const data = await env.SESSION.get('feedback:active', 'json')

    return new Response(JSON.stringify(data || []), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('KV Error:', err)
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

    if (!runtime || !runtime.env || !runtime.env.SESSION) {
      throw new Error('KV binding missing')
    }

    const { env } = runtime

    // Get existing feedback
    const existingData = (await env.SESSION.get<Feedback[]>('feedback:active', 'json')) || []

    // Append new feedback
    const updatedData = [feedback, ...existingData]

    // Save to KV (limited list size to avoid overwhelming KV value limits)
    // We only keep the last 50 reports locally; others should be synced to repo.
    await env.SESSION.put('feedback:active', JSON.stringify(updatedData.slice(0, 50)))

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('KV Error:', err)
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
