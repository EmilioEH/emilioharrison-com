import { useState, useEffect } from 'react'
import { auth, googleProvider } from '../../lib/firebase-client'
import { signInWithPopup, getRedirectResult } from 'firebase/auth'
import { AlertCircle, ArrowRight, Key } from 'lucide-react'

// Simple mobile detection check
const isMobileDevice = () => {
  if (typeof window === 'undefined') return false
  const ua = navigator.userAgent.toLowerCase()
  return /iphone|ipad|ipod|android|mobile/.test(ua)
}

const isStandalone = () => {
  if (typeof window === 'undefined') return false
  return (
    (window.navigator as Navigator & { standalone?: boolean }).standalone ||
    window.matchMedia('(display-mode: standalone)').matches
  )
}

export const GoogleSignInButton = () => {
  const [error, setError] = useState('')
  const [status, setStatus] = useState<
    'idle' | 'loading' | 'pending_approval' | 'denied' | 'checking_redirect'
  >('idle')
  const [tempToken, setTempToken] = useState<string | null>(null)
  const [missingEnv, setMissingEnv] = useState<string[]>([])

  // Invite Code State
  const [inviteCode, setInviteCode] = useState('')
  const [redeemLoading, setRedeemLoading] = useState(false)
  const [requestLoading, setRequestLoading] = useState(false)

  // Test Helper & Redirect Result Handling
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(window as any).simulateGoogleLogin = (token: string) => {
        setTempToken(token)
        attemptLogin(token)
      }
    }

    // Check for missing environment variables
    const checkEnv = () => {
      const required = [
        'PUBLIC_FIREBASE_API_KEY',
        'PUBLIC_FIREBASE_AUTH_DOMAIN',
        'PUBLIC_FIREBASE_PROJECT_ID',
        'PUBLIC_FIREBASE_STORAGE_BUCKET',
        'PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
        'PUBLIC_FIREBASE_APP_ID',
      ]
      const missing = required.filter((key) => !import.meta.env[key])
      if (missing.length > 0) {
        setMissingEnv(missing)
        setError('Missing required environment variables.')
        return true
      }
      return false
    }
    checkEnv()

    // Check for redirect result (mobile flow)
    const checkRedirect = async () => {
      if (!auth) return
      // Only show "checking" if we are on a mobile device and might be returning from a redirect
      const isMobile = isMobileDevice()
      if (isMobile) setStatus('checking_redirect')

      try {
        console.log('[Auth] Checking getRedirectResult...')
        const result = await getRedirectResult(auth)

        if (result) {
          console.log('[Auth] Redirect result found for:', result.user.email)
          setStatus('loading')
          const idToken = await result.user.getIdToken()
          setTempToken(idToken)
          await attemptLogin(idToken)
        } else {
          console.log('[Auth] No redirect result found.')
          if (isMobile) setStatus('idle')
        }
      } catch (e: unknown) {
        console.error('[Auth] Redirect login error:', e)
        const errorMsg = e instanceof Error ? e.message : 'Login failed'
        setError(errorMsg)
        setStatus('idle')
      }
    }
    checkRedirect()
  }, [])

  const handleGoogleLogin = async () => {
    setStatus('loading')
    setError('')

    // Check if we are in a restricted environment (In-App Browser)
    const isMobile = isMobileDevice()
    const standalone = isStandalone()
    console.log('[Auth] Attempting Login. Mobile:', isMobile, 'Standalone:', standalone)

    try {
      // Primary: signInWithPopup
      // This is generally more reliable on iOS Safari IF it's a direct user click.
      // Firebase will try to open a popup, and if blocked, will often show an
      // internal redirect handler IF it's configured for it.
      console.log('[Auth] Attempting signInWithPopup')
      if (!auth) {
        setError('Firebase Auth not initialized. Check your configuration.')
        setStatus('idle')
        return
      }
      const result = await signInWithPopup(auth, googleProvider)
      const idToken = await result.user.getIdToken()
      setTempToken(idToken)
      await attemptLogin(idToken)
    } catch (e: unknown) {
      console.error('[Auth] Login error:', e)
      const firebaseError = e as { code?: string; message?: string }

      // If it's a blocked popup or a "missing initial state" style error,
      // we suggest opening in Safari or provide guidance.
      if (
        firebaseError.code === 'auth/popup-blocked' ||
        firebaseError.code === 'auth/cancelled-popup-request'
      ) {
        setError(
          'Sign-in popup blocked. Please tap again, or open this page directly in Safari if the problem persists.',
        )
        setStatus('idle')
        return
      }

      // If we are on mobile and popup failed (but not a cancel), we can TRY redirect
      // as a fallback if the user is in a context that supports it.
      if (isMobile && firebaseError.code === 'auth/popup-closed-by-user') {
        setStatus('idle')
        return
      }

      // Special case: Missing initial state error handler
      if (firebaseError.message?.includes('missing initial state')) {
        setError(
          'Login failed due to browser restrictions. Please try opening this link directly in Safari or Chrome instead of via text message.',
        )
        setStatus('idle')
        return
      }

      const errorMsg = e instanceof Error ? e.message : 'Something went wrong'
      setError(errorMsg)
      setStatus('idle')
    }
  }

  const attemptLogin = async (idToken: string) => {
    try {
      const response = await fetch('/protected/recipes/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      })

      if (response.ok) {
        window.location.replace('/protected/recipes')
      } else {
        const data = await response.json()
        const errorMsg = data.details || data.error || 'Login failed'
        setError(errorMsg)

        if (data.code === 'auth/pending') {
          setStatus('pending_approval')
        } else if (data.code === 'auth/denied') {
          setStatus('denied')
        } else {
          setStatus('idle')
        }
      }
    } catch {
      console.error('Connection failed')
      setError('Connection failed')
      setStatus('idle')
    }
  }

  const handleRequestAccess = async () => {
    if (!tempToken) return
    setRequestLoading(true)
    try {
      const res = await fetch('/protected/recipes/api/auth/request-access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken: tempToken }),
      })
      if (res.ok) {
        setStatus('pending_approval')
        setError('Access requested successfully. Pending approval.')
      } else {
        const data = await res.json()
        setError(data.error || 'Failed to request access')
      }
    } catch {
      setError('Failed to request access')
    } finally {
      setRequestLoading(false)
    }
  }

  const handleRedeemCode = async () => {
    if (!tempToken || !inviteCode.trim()) return
    setRedeemLoading(true)
    try {
      const res = await fetch('/protected/recipes/api/auth/redeem-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken: tempToken, code: inviteCode.trim() }),
      })
      const data = await res.json()

      if (res.ok) {
        // Retry login immediately
        await attemptLogin(tempToken)
      } else {
        setError(data.error || 'Invalid code')
      }
    } catch {
      setError('Failed to redeem code')
    } finally {
      setRedeemLoading(false)
    }
  }

  if (status === 'pending_approval') {
    return (
      <div className="flex flex-col items-center gap-4 text-center animate-in fade-in">
        <div className="rounded-full bg-amber-100 p-4 text-amber-600">
          <AlertCircle className="h-8 w-8" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-gray-800">Access Pending</h3>
          <p className="max-w-xs text-gray-600">
            Your request has been sent to the administrator. You will be able to log in once
            approved.
          </p>
        </div>

        <div className="flex w-full max-w-xs flex-col gap-2">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-gray-300" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-2 text-gray-500">Or redeem invite</span>
            </div>
          </div>

          <div className="flex gap-2">
            <div className="relative flex-1">
              <Key className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Enter code"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                className="w-full rounded-lg border border-gray-300 py-2 pl-9 pr-3 uppercase focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button
              onClick={handleRedeemCode}
              disabled={redeemLoading || !inviteCode}
              className="rounded-lg bg-gray-800 px-4 font-bold text-white transition-colors hover:bg-gray-900 disabled:opacity-50"
            >
              {redeemLoading ? '...' : 'Redeem'}
            </button>
          </div>
        </div>

        <button
          onClick={() => window.location.reload()}
          className="mt-2 text-sm text-blue-600 hover:underline"
        >
          Check Status
        </button>
      </div>
    )
  }

  if (status === 'denied') {
    return (
      <div className="flex w-full flex-col gap-6 animate-in fade-in">
        <div className="text-center">
          <h3 className="text-lg font-bold text-gray-800">Access Restricted</h3>
          <p className="mb-4 text-sm text-gray-600">{error}</p>

          <button
            onClick={handleRequestAccess}
            disabled={requestLoading}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-3 font-bold text-white transition-colors hover:bg-blue-700"
          >
            {requestLoading ? 'Sending...' : 'Request Access'}
            {!requestLoading && <ArrowRight className="h-4 w-4" />}
          </button>
        </div>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-gray-300" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-white px-2 text-gray-500">Or redeem invite</span>
          </div>
        </div>

        <div className="flex gap-2">
          <div className="relative flex-1">
            <Key className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Enter code"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
              className="w-full rounded-lg border border-gray-300 py-2 pl-9 pr-3 uppercase focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            onClick={handleRedeemCode}
            disabled={redeemLoading || !inviteCode}
            className="rounded-lg bg-gray-800 px-4 font-bold text-white transition-colors hover:bg-gray-900 disabled:opacity-50"
          >
            {redeemLoading ? '...' : 'Redeem'}
          </button>
        </div>

        <button
          onClick={() => setStatus('idle')}
          className="text-center text-xs text-gray-400 hover:text-gray-600"
        >
          Back to Login
        </button>
      </div>
    )
  }

  if (missingEnv.length > 0) {
    return (
      <div className="flex flex-col gap-4 rounded-xl border border-red-200 bg-red-50 p-6 text-red-800 animate-in fade-in slide-in-from-bottom-2">
        <div className="flex items-center gap-3">
          <AlertCircle className="h-6 w-6 text-red-600" />
          <h3 className="text-lg font-bold">Configuration Error</h3>
        </div>
        <p className="text-sm">
          The application is missing required Firebase configuration in <code>.env.local</code>:
        </p>
        <ul className="list-inside list-disc font-mono text-xs opacity-80">
          {missingEnv.map((key) => (
            <li key={key}>{key}</li>
          ))}
        </ul>
        <div className="mt-2 text-xs leading-relaxed opacity-70">
          Please check the <code>.env.local.example</code> file and ensure all keys are correctly
          populated. The dev server must be restarted after updating environment variables.
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {error && <div className="mb-4 rounded-md bg-red-100 p-3 text-sm text-red-700">{error}</div>}

      <button
        onClick={handleGoogleLogin}
        disabled={status === 'loading'}
        className="group flex w-full items-center justify-center gap-3 rounded-full bg-white px-6 py-4 text-lg font-bold text-gray-700 shadow-md transition-all hover:bg-gray-50 hover:shadow-lg active:scale-95 disabled:opacity-70 dark:bg-zinc-800 dark:text-white dark:hover:bg-zinc-700"
      >
        {status === 'loading' ? (
          <span className="h-6 w-6 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600"></span>
        ) : (
          <svg className="h-6 w-6" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              fill="#4285F4"
            />
            <path
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              fill="#34A853"
            />
            <path
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              fill="#FBBC05"
            />
            <path
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              fill="#EA4335"
            />
          </svg>
        )}
        <span>Sign in with Google</span>
      </button>
    </div>
  )
}
