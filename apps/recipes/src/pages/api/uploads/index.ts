import type { APIRoute, APIContext } from 'astro'
import { bucket } from '../../../lib/firebase-server'
import { getAuthUser, unauthorizedResponse } from '../../../lib/api-helpers'
import { setRequestContext } from '../../../lib/request-context'
import { sniffImageType } from '../../../lib/image-sniff'

/** Reject anything larger than this — images only, keeps storage abuse bounded. */
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024 // 10 MB

export const POST: APIRoute = async (context: APIContext) => {
  setRequestContext(context)
  const { request, cookies } = context

  // Uploads require an authenticated session — the endpoint is no longer public.
  const userId = getAuthUser(cookies)
  if (!userId) {
    return unauthorizedResponse()
  }

  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return new Response(JSON.stringify({ error: 'Expected multipart form data' }), {
      status: 400,
    })
  }
  const file = formData.get('file')

  if (!file || !(file instanceof File)) {
    return new Response(JSON.stringify({ error: 'No file provided' }), {
      status: 400,
    })
  }

  if (file.size > MAX_UPLOAD_BYTES) {
    return new Response(JSON.stringify({ error: 'File too large (max 10 MB)' }), {
      status: 413,
    })
  }

  const buffer = await file.arrayBuffer()

  // Trust the bytes, not the client-supplied type/filename: only real raster images may
  // be stored, so nothing scriptable (HTML/SVG) can ever be served from our origin.
  const sniffed = sniffImageType(new Uint8Array(buffer.slice(0, 16)))
  if (!sniffed) {
    return new Response(JSON.stringify({ error: 'Unsupported file type (images only)' }), {
      status: 415,
    })
  }

  // Server-generated, collision-resistant key with a normalized extension — the client
  // filename never reaches storage.
  const key = `${userId}-${Date.now()}-${crypto.randomUUID()}.${sniffed.ext}`

  try {
    const projectId = await bucket.getProjectId()
    const bucketName = `${projectId}.firebasestorage.app`

    await bucket.uploadFile(bucketName, key, buffer, sniffed.mime)

    return new Response(JSON.stringify({ key, url: `/api/uploads/${key}` }), {
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
