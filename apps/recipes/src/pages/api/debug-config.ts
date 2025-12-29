import type { APIRoute } from 'astro'
import { db } from '../../lib/firebase-server'
import { getEnv } from '../../lib/env'

export const GET: APIRoute = async (context) => {
  const { cookies } = context
  const emailCookie = cookies.get('site_email')
  const email = emailCookie?.value

  // Access Control: Only allow Admin
  const adminEmailsEnv = getEnv(context, 'ADMIN_EMAILS')
  const adminEmails = adminEmailsEnv.split(',').map((e: string) => e.trim().toLowerCase())

  if (!email || !adminEmails.includes(email.toLowerCase())) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // Safe Debug Info
  const projectId = db.projectId || 'Unknown (Not Initialized)'

  // Try to inspect the service account source (safely)
  const envVar = getEnv(context, 'FIREBASE_SERVICE_ACCOUNT')
  const hasEnvVar = !!envVar
  const envVarLength = envVar ? envVar.length : 0

  return new Response(
    JSON.stringify(
      {
        projectId,
        hasServiceAccountEnv: hasEnvVar,
        serviceAccountLength: envVarLength,
        adminEmailsConfigured: adminEmails.length,
        currentUser: email,
        timestamp: new Date().toISOString(),
      },
      null,
      2,
    ),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    },
  )
}
