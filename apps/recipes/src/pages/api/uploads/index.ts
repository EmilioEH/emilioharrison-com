import type { APIRoute } from 'astro'
import { uploadImage } from '../../../lib/r2'

export const POST: APIRoute = async ({ request, locals }) => {
  const formData = await request.formData()
  const file = formData.get('file')

  if (!file || !(file instanceof File)) {
    return new Response(JSON.stringify({ error: 'No file provided' }), {
      status: 400,
    })
  }

  const bucket = locals.runtime.env.BUCKET
  const key = `${Date.now()}-${file.name}`

  try {
    await uploadImage(bucket, key, file)
    return new Response(JSON.stringify({ key, url: `/api/uploads/${key}` }), {
      // URL depends on how we serve it. For now returning key.
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    })
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
    })
  }
}
