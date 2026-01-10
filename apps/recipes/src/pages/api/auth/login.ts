import type { APIRoute } from 'astro'
import { getEnv, getEmailList } from '../../../lib/env'
import type { User } from '../../../lib/types'
import { db } from '../../../lib/firebase-server'

export const POST: APIRoute = async (context) => {
  const { request, cookies } = context
  try {
    const { idToken } = await request.json()

    if (!idToken) {
      return new Response(JSON.stringify({ error: 'Missing ID token' }), { status: 400 })
    }

    // Verify the token using Firebase Auth REST API
    // This is the correct endpoint for Firebase ID Tokens (tokeninfo is for Google OAuth tokens)
    const apiKey = getEnv(context, 'PUBLIC_FIREBASE_API_KEY')
    if (!apiKey) {
      throw new Error('Missing PUBLIC_FIREBASE_API_KEY')
    }

    const verifyRes = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ idToken }),
      },
    )

    if (!verifyRes.ok) {
      const errorText = await verifyRes.text()
      console.error(`Token verification failed: ${verifyRes.status} ${errorText}`)
      return new Response(
        JSON.stringify({
          error: 'Invalid token',
          details: `Firebase verification failed: ${verifyRes.status} - ${errorText}`,
        }),
        { status: 401 },
      )
    }

    const data = await verifyRes.json()
    const user = data.users[0]
    const userId = user.localId // Firebase Auth UID

    // Use email or provider ID as name since display name might be missing
    const name = user.displayName || user.email || 'Chef'
    const email = user.email

    // Validate email against whitelist (only if whitelist is configured)
    // Validate email against whitelist (only if whitelist is configured)
    const allowedEmails = getEmailList(context, 'ALLOWED_EMAILS')

    // Check if user is in the legacy allowed list (Super Admin / Legacy Access)
    const isWhitelisted =
      allowedEmails.length > 0 && email && allowedEmails.includes(email.toLowerCase())

    // Fetch existing user to check status
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let userDoc: any = null
    try {
      userDoc = await db.getDocument('users', userId)
    } catch {
      // Ignore if not found
    }

    // Access Control Logic
    // 1. If whitelisted -> Always Allow (and auto-approve if needed)
    // 2. If existing user -> Check status ('approved')
    // 3. If new user -> Deny (must request access)

    let isAllowed = false
    let status = userDoc?.status || 'pending'

    if (isWhitelisted) {
      isAllowed = true
      status = 'approved' // Auto-approve whitelisted users
    } else if (userDoc && userDoc.status === 'approved') {
      isAllowed = true
    }

    // Auto-authorization: Check for pending family invite
    // This allows invited users to bypass the waitlist/request flow
    let familyIdToJoin: string | null = null

    if (!isAllowed && email) {
      const normalizedEmail = email.toLowerCase()
      const inviteId = btoa(normalizedEmail)
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '')

      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const invite: any = await db.getDocument('pending_invites', inviteId)
        if (invite) {
          console.log(`Auto-approving invited user: ${email} for family ${invite.familyId}`)
          isAllowed = true
          status = 'approved'
          familyIdToJoin = invite.familyId

          // 1. Add user to family
          try {
            const familyDoc = await db.getDocument('families', invite.familyId)
            if (familyDoc) {
              const members = (familyDoc.members as string[]) || []
              if (!members.includes(userId)) {
                await db.updateDocument('families', invite.familyId, {
                  members: [...members, userId],
                })
              }
            }
          } catch (famErr) {
            console.error('Failed to add user to family members list:', famErr)
            // Proceed anyway, they have the familyId on their user doc so it should benefit from creator-centric visibility
          }

          // 2. Delete the invite (it's consumed)
          try {
            await db.deleteDocument('pending_invites', inviteId)
          } catch (delErr) {
            console.warn('Failed to delete consumed invite:', delErr)
          }
        }
      } catch {
        // Verify failed or no invite found, harmless
      }
    }

    if (!isAllowed) {
      console.error(`Login blocked. Email: ${email}, Status: ${status}`)

      // Determine error details based on state
      let errorDetails = 'Access denied.'
      if (status === 'pending') {
        errorDetails = 'Your access request is pending approval.'
      } else if (status === 'rejected') {
        errorDetails = 'Your access request has been denied.'
      } else {
        errorDetails = 'You do not have access to this application.'
      }

      return new Response(
        JSON.stringify({
          error: 'Unauthorized',
          details: errorDetails,
          code: status === 'pending' ? 'auth/pending' : 'auth/denied',
        }),
        { status: 403 },
      )
    }

    // Create or update user document in Firestore (enables family invites to find this user)
    try {
      const existingUser = await db.getDocument('users', userId)
      if (existingUser) {
        // Update existing user with latest email/displayName (in case they changed)
        const updateData: Partial<User> = {
          email: email || existingUser.email,
          displayName: name,
        }
        if (familyIdToJoin) {
          updateData.familyId = familyIdToJoin
          updateData.status = 'approved' // Ensure status is updated if they were previously pending/rejected
        }
        await db.updateDocument('users', userId, updateData)
      } else {
        // Create new user document
        await db.setDocument('users', userId, {
          id: userId,
          email: email || '',
          displayName: name,
          joinedAt: new Date().toISOString(),
          status: status, // Persist the determined status
          hasOnboarded: false,
          familyId: familyIdToJoin || null,
        })
      }
    } catch (dbError) {
      // Log but don't fail login if user doc creation fails
      console.error('Failed to create/update user document:', dbError)
    }

    const cookieOptions = {
      path: '/',
      httpOnly: true,
      secure: import.meta.env.PROD,
      maxAge: 60 * 60 * 24 * 30, // 30 days
      sameSite: 'lax' as const,
    }

    // Auth token
    cookies.set('site_auth', 'true', cookieOptions)

    // Store email for access control (httpOnly)
    if (email) {
      cookies.set('site_email', email, cookieOptions)
    }

    // User identity (site_user should be ID for backend logic)
    cookies.set('site_user', userId, {
      ...cookieOptions,
      httpOnly: false,
    })

    // Optional: Store display name in a separate cookie if frontend needs it
    cookies.set('site_username', name, {
      ...cookieOptions,
      httpOnly: false,
    })

    return new Response(JSON.stringify({ success: true, name }), { status: 200 })
  } catch (error) {
    console.error('Login error:', error)
    return new Response(
      JSON.stringify({
        error: 'Internal Server Error',
        details: error instanceof Error ? error.message : String(error),
      }),
      { status: 500 },
    )
  }
}
