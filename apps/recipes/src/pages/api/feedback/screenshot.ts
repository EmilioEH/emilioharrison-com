import type { APIRoute } from 'astro'
import { bucket } from '../../../lib/firebase-server'
import { getEnv } from '../../../lib/env'

export const GET: APIRoute = async (context) => {
  const { cookies } = context
  const emailCookie = cookies.get('site_email')
  const email = emailCookie?.value

  // Access Control: Only allow Admin
  const adminEmailsEnv = getEnv(context, 'ADMIN_EMAILS')
  const adminEmails = adminEmailsEnv.split(',').map((e: string) => e.trim().toLowerCase())

  if (!email || !adminEmails.includes(email.toLowerCase())) {
    return new Response('Unauthorized', { status: 401 })
  }

  try {
    // Get the file path from URL params
    const url = new URL(context.request.url)
    const path = url.searchParams.get('path')

    if (!path) {
      return new Response('Missing path parameter', { status: 400 })
    }

    // Get project ID for bucket name
    const projectId = bucket.projectId
    const bucketName = `${projectId}.firebasestorage.app`

    // Download the file from Firebase Storage
    const fileData = await bucket.downloadFile(bucketName, path)

    if (!fileData) {
      return new Response('File not found', { status: 404 })
    }

    // Return the image
    return new Response(fileData, {
      status: 200,
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=31536000',
      },
    })
  } catch (err) {
    console.error('Screenshot fetch error:', err)
    return new Response('Internal Server Error', { status: 500 })
  }
}
