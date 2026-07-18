import type { APIRoute } from 'astro'
import { bucket } from '../../../lib/firebase-server'
import { SAFE_IMAGE_CONTENT_TYPES } from '../../../lib/image-sniff'

export const GET: APIRoute = async ({ params }) => {
  const { key } = params

  if (!key) {
    return new Response('Missing key', { status: 400 })
  }

  try {
    // Use async getProjectId() to ensure db is initialized before accessing
    const projectId = await bucket.getProjectId()
    const bucketName = `${projectId}.firebasestorage.app`

    const file = await bucket.downloadFile(bucketName, key)

    if (!file) {
      return new Response('Not found', { status: 404 })
    }

    const metadata = await bucket.getFileMetadata(bucketName, key)
    const storedType = metadata?.contentType || 'application/octet-stream'

    // Only serve known-safe raster image types inline. Anything else (including
    // pre-fix uploads of arbitrary types, and never-inline SVG) is forced to download
    // so it cannot execute in our origin. `nosniff` stops the browser from second-
    // guessing the declared type.
    const isSafeInline = SAFE_IMAGE_CONTENT_TYPES.has(storedType.toLowerCase())
    const headers: Record<string, string> = {
      'Content-Type': isSafeInline ? storedType : 'application/octet-stream',
      'X-Content-Type-Options': 'nosniff',
      'Cache-Control': 'public, max-age=31536000',
      ETag: metadata?.etag || '',
    }
    if (!isSafeInline) {
      headers['Content-Disposition'] = 'attachment'
    }

    return new Response(file, { status: 200, headers })
  } catch (e) {
    console.error('Download Error', e)
    return new Response('Error fetching image', { status: 500 })
  }
}
