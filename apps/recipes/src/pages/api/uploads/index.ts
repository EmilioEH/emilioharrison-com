import type { APIRoute } from 'astro'
import { bucket } from '../../../lib/firebase-server'

export const POST: APIRoute = async ({ request }) => {
  const formData = await request.formData()
  const file = formData.get('file')

  if (!file || !(file instanceof File)) {
    return new Response(JSON.stringify({ error: 'No file provided' }), {
      status: 400,
    })
  }

  const key = `${Date.now()}-${file.name}`
  const projectId = bucket.projectId
  const bucketName = `${projectId}.firebasestorage.app`

  try {
    const buffer = await file.arrayBuffer()
    await bucket.uploadFile(bucketName, key, buffer, file.type)

    return new Response(JSON.stringify({ key, url: `api/uploads/${key}` }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    })
  } catch (e) {
    console.error('Upload Error', e)
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
    })
  }
}
