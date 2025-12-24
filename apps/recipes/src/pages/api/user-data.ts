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
    // Access KV from locals (Cloudflare)
    // In dev (platformProxy), it's locals.runtime.env.SESSION
    // In prod, it's locals.runtime.env.SESSION
    // @ts-expect-error - Runtime env type missing from Locals interface in dev
    const { env } = locals.runtime
    const data = await env.SESSION.get(`user:${user}`, 'json')

    return new Response(JSON.stringify(data || {}), {
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
    const body = await request.json()
    // @ts-expect-error - Runtime env type missing from Locals interface in dev
    const { env } = locals.runtime

    // Save to KV
    await env.SESSION.put(`user:${user}`, JSON.stringify(body))

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
