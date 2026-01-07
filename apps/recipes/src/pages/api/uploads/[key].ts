import type { APIRoute } from 'astro'
import { bucket } from '../../../lib/firebase-server'

export const GET: APIRoute = async ({ params }) => {
  const { key } = params

  if (!key) {
    return new Response('Missing key', { status: 400 })
  }

  try {
    // The previous implementation assumed default bucket.
    // We can get bucket name from service account or hardcode default
    // Using hardcoded default from firebase-server init logic which constructed it
    // But REST service needs explicit bucket name or we add it to the service class

    // Use async getProjectId() to ensure db is initialized before accessing
    const projectId = await bucket.getProjectId()
    const bucketName = `${projectId}.firebasestorage.app`

    const file = await bucket.downloadFile(bucketName, key)

    if (!file) {
      return new Response('Not found', { status: 404 })
    }

    // We need metadata too for Content-Type
    const metadata = await bucket.getFileMetadata(bucketName, key)

    return new Response(file, {
      status: 200,
      headers: {
        'Content-Type': metadata?.contentType || 'application/octet-stream',
        'Cache-Control': 'public, max-age=31536000',
        ETag: metadata?.etag || '',
      },
    })
  } catch (e) {
    console.error('Download Error', e)
    return new Response('Error fetching image', { status: 500 })
  }
}
