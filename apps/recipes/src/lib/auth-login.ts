import { db } from './firebase-server'
import type { User } from './types'

interface FirebaseUser {
  localId: string
  email?: string
  displayName?: string
}

export async function verifyFirebaseToken(idToken: string, apiKey: string): Promise<FirebaseUser> {
  const verifyRes = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken }),
    },
  )

  if (!verifyRes.ok) {
    const errorText = await verifyRes.text()
    throw new Error(`Firebase verification failed: ${verifyRes.status} - ${errorText}`)
  }

  const data = await verifyRes.json()
  const user = data.users[0]

  return {
    localId: user.localId,
    email: user.email,
    displayName: user.displayName,
  }
}

export async function processPendingInvites(email: string, userId: string): Promise<string | null> {
  const normalizedEmail = email.toLowerCase()
  // Since our key is btoa(email), we can look it up directly.
  const inviteId = btoa(normalizedEmail).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const invite: any = await db.getDocument('pending_invites', inviteId)

    // Ensure invite exists and is pending
    if (invite && invite.status !== 'accepted') {
      console.log(`Auto-approving invited user: ${email} for family ${invite.familyId}`)

      // 1. Add user to family
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const familyDoc: any = await db.getDocument('families', invite.familyId)
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
        // Proceed anyway
      }

      // 2. Mark invite as accepted
      try {
        await db.updateDocument('pending_invites', inviteId, {
          status: 'accepted',
          acceptedBy: userId,
          acceptedAt: new Date().toISOString(),
        })
      } catch (delErr) {
        console.warn('Failed to update invite status:', delErr)
      }

      return invite.familyId
    }
  } catch {
    // Verify failed or no invite found
  }

  return null
}

export async function upsertUser(
  userId: string,
  email: string | undefined,
  name: string,
  status: 'approved' | 'pending' | 'rejected',
  familyIdToJoin: string | null,
): Promise<void> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const existingUser: any = await db.getDocument('users', userId)

    if (existingUser) {
      // Update existing user
      const updateData: Partial<User> = {
        email: email || existingUser.email,
        displayName: name,
      }
      if (familyIdToJoin) {
        updateData.familyId = familyIdToJoin
        updateData.status = 'approved'
      }
      await db.updateDocument('users', userId, updateData)
    } else {
      // Create new user document
      await db.setDocument('users', userId, {
        id: userId,
        email: email || '',
        displayName: name,
        joinedAt: new Date().toISOString(),
        status: status,
        hasOnboarded: false,
        familyId: familyIdToJoin || null,
      })
    }
  } catch (dbError) {
    console.error('Failed to create/update user document:', dbError)
    throw dbError
  }
}

export async function getUserStatus(userId: string): Promise<string> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const userDoc: any = await db.getDocument('users', userId)
    return userDoc?.status || 'pending'
  } catch {
    return 'pending'
  }
}
