import { useEffect, useState, useRef } from 'react'
import { signInWithCustomToken, onAuthStateChanged } from 'firebase/auth'
import { auth } from './firebase-client'

type AuthSyncState = 'idle' | 'syncing' | 'synced' | 'error' | 'no-session'

/**
 * Syncs server-side session auth with Firebase client SDK.
 * This enables Firestore security rules to work with real-time subscriptions.
 *
 * Call this once at the app root level to ensure Firebase Auth is synced
 * before any Firestore subscriptions are created.
 */
export function useFirebaseAuthSync() {
  const [state, setState] = useState<AuthSyncState>('idle')
  const [error, setError] = useState<Error | null>(null)
  const attemptedRef = useRef(false)

  useEffect(() => {
    if (!auth || attemptedRef.current) return

    // Check if already authenticated
    if (auth.currentUser) {
      setState('synced')
      return
    }

    // Listen for auth state changes first
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setState('synced')
      }
    })

    const syncAuth = async () => {
      attemptedRef.current = true
      setState('syncing')

      try {
        const baseUrl = import.meta.env.BASE_URL.endsWith('/')
          ? import.meta.env.BASE_URL
          : `${import.meta.env.BASE_URL}/`

        const response = await fetch(`${baseUrl}api/auth/firebase-token`, {
          credentials: 'include', // Include cookies
        })

        if (response.status === 401) {
          // Not logged in on server side - this is expected for unauthenticated users
          console.log('[AuthSync] No server session, skipping Firebase auth')
          setState('no-session')
          return
        }

        if (!response.ok) {
          throw new Error(`Failed to get token: ${response.statusText}`)
        }

        const { token } = await response.json()

        // Sign in to Firebase with the custom token
        const userCredential = await signInWithCustomToken(auth, token)
        console.log('[AuthSync] Signed in with uid:', userCredential.user.uid)
        setState('synced')
      } catch (err) {
        console.error('Firebase auth sync failed:', err)
        setError(err instanceof Error ? err : new Error(String(err)))
        setState('error')
      }
    }

    syncAuth()

    return () => unsubscribe()
  }, [])

  return {
    /** Current sync state */
    state,
    /** Whether auth is ready (synced or no server session) */
    isReady: state === 'synced' || state === 'no-session' || state === 'error',
    /** Whether user is authenticated with Firebase */
    isAuthenticated: state === 'synced',
    /** Any error that occurred during sync */
    error,
  }
}
