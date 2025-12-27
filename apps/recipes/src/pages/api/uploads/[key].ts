import type { APIRoute } from 'astro'

export const GET: APIRoute = async ({ locals, params }) => {
  const { key } = params
  const bucket = locals.runtime.env.BUCKET

  if (!key) {
    return new Response('Missing key', { status: 400 })
  }

  try {
    const object = await bucket.get(key)
    if (!object) {
      return new Response('Not found', { status: 404 })
    }

    const headers = new Headers()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    object.writeHttpMetadata(headers as any)
    headers.set('etag', object.httpEtag)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return new Response(object.body as any, {
      headers,
    })
  } catch {
    return new Response('Error fetching image', { status: 500 })
  }
}
