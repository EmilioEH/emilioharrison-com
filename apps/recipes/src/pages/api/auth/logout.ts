import type { APIRoute } from 'astro'

export const POST: APIRoute = async ({ cookies }) => {
  cookies.delete('site_auth', { path: '/' })
  cookies.delete('site_user', { path: '/' })

  return new Response(JSON.stringify({ success: true }), { status: 200 })
}
