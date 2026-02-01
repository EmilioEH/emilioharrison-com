import { useState, useEffect } from 'react'
import { auth } from '../../lib/firebase-client'
import { sendSignInLinkToEmail, isSignInWithEmailLink, signInWithEmailLink } from 'firebase/auth'
import { Mail, ArrowRight, CheckCircle, AlertCircle, Key } from 'lucide-react'

const EMAIL_STORAGE_KEY = 'emailForSignIn'

const getActionCodeSettings = () => ({
  url: `${window.location.origin}/protected/recipes/login`,
  handleCodeInApp: true,
})

export const EmailLinkSignIn = () => {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [status, setStatus] = useState<
    'idle' | 'sending' | 'link_sent' | 'verifying' | 'pending_approval' | 'denied'
  >('idle')
  const [tempToken, setTempToken] = useState<string | null>(null)

  // Invite Code State (for pending/denied flows)
  const [inviteCode, setInviteCode] = useState('')
  const [redeemLoading, setRedeemLoading] = useState(false)
  const [requestLoading, setRequestLoading] = useState(false)

  // Check if returning from email link
  useEffect(() => {
    const checkEmailLink = async () => {
      if (!auth) return

      // Check if this is a sign-in link
      if (isSignInWithEmailLink(auth, window.location.href)) {
        setStatus('verifying')

        // Get email from localStorage
        let storedEmail = window.localStorage.getItem(EMAIL_STORAGE_KEY)

        // If email not in storage, prompt user
        if (!storedEmail) {
          storedEmail = window.prompt('Please provide your email for confirmation')
          if (!storedEmail) {
            setError('Email is required to complete sign-in')
            setStatus('idle')
            return
          }
        }

        try {
          const result = await signInWithEmailLink(auth, storedEmail, window.location.href)
          window.localStorage.removeItem(EMAIL_STORAGE_KEY)

          // Get token and complete login
          const idToken = await result.user.getIdToken()
          setTempToken(idToken)
          await attemptLogin(idToken)

          // Clean up URL
          window.history.replaceState({}, '', '/protected/recipes/login')
        } catch (e: unknown) {
          console.error('[EmailLink] Verification error:', e)
          const firebaseError = e as { code?: string; message?: string }

          if (firebaseError.code === 'auth/invalid-action-code') {
            setError('This link has expired or already been used. Please request a new one.')
          } else if (firebaseError.code === 'auth/invalid-email') {
            setError('The email address does not match. Please try again.')
          } else {
            setError(firebaseError.message || 'Failed to verify email link')
          }
          setStatus('idle')
        }
      }
    }

    checkEmailLink()
  }, [])

  const handleSendLink = async () => {
    if (!email.trim()) {
      setError('Please enter your email address')
      return
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address')
      return
    }

    setStatus('sending')
    setError('')

    try {
      if (!auth) {
        setError('Firebase Auth not initialized. Check your configuration.')
        setStatus('idle')
        return
      }

      await sendSignInLinkToEmail(auth, email, getActionCodeSettings())

      // Save email for verification
      window.localStorage.setItem(EMAIL_STORAGE_KEY, email)
      setStatus('link_sent')
    } catch (e: unknown) {
      console.error('[EmailLink] Send error:', e)
      const firebaseError = e as { code?: string; message?: string }

      if (firebaseError.code === 'auth/invalid-email') {
        setError('Invalid email address format')
      } else if (firebaseError.code === 'auth/missing-continue-uri') {
        setError('Configuration error. Please contact support.')
      } else {
        setError(firebaseError.message || 'Failed to send magic link')
      }
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

  // Pending approval state
  if (status === 'pending_approval') {
    return (
      <div className="flex flex-col items-center gap-4 text-center animate-in fade-in">
        <div className="rounded-full bg-amber-100 p-4 text-amber-600">
          <AlertCircle className="h-8 w-8" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200">Access Pending</h3>
          <p className="max-w-xs text-gray-600 dark:text-gray-400">
            Your request has been sent to the administrator. You will be able to log in once
            approved.
          </p>
        </div>

        <div className="flex w-full max-w-xs flex-col gap-2">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-gray-300 dark:border-gray-600" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-2 text-gray-500 dark:bg-zinc-800 dark:text-gray-400">
                Or redeem invite
              </span>
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
                className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-9 pr-3 uppercase focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-zinc-700 dark:text-white"
              />
            </div>
            <button
              onClick={handleRedeemCode}
              disabled={redeemLoading || !inviteCode}
              className="rounded-lg bg-gray-800 px-4 font-bold text-white transition-colors hover:bg-gray-900 disabled:opacity-50 dark:bg-gray-700 dark:hover:bg-gray-600"
            >
              {redeemLoading ? '...' : 'Redeem'}
            </button>
          </div>
        </div>

        <button
          onClick={() => window.location.reload()}
          className="mt-2 text-sm text-blue-600 hover:underline dark:text-blue-400"
        >
          Check Status
        </button>
      </div>
    )
  }

  // Access denied state
  if (status === 'denied') {
    return (
      <div className="flex w-full flex-col gap-6 animate-in fade-in">
        <div className="text-center">
          <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200">Access Restricted</h3>
          <p className="mb-4 text-sm text-gray-600 dark:text-gray-400">{error}</p>

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
            <span className="w-full border-t border-gray-300 dark:border-gray-600" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-white px-2 text-gray-500 dark:bg-zinc-800 dark:text-gray-400">
              Or redeem invite
            </span>
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
              className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-9 pr-3 uppercase focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-zinc-700 dark:text-white"
            />
          </div>
          <button
            onClick={handleRedeemCode}
            disabled={redeemLoading || !inviteCode}
            className="rounded-lg bg-gray-800 px-4 font-bold text-white transition-colors hover:bg-gray-900 disabled:opacity-50 dark:bg-gray-700 dark:hover:bg-gray-600"
          >
            {redeemLoading ? '...' : 'Redeem'}
          </button>
        </div>

        <button
          onClick={() => setStatus('idle')}
          className="text-center text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
        >
          Back to Login
        </button>
      </div>
    )
  }

  // Link sent success state
  if (status === 'link_sent') {
    return (
      <div className="flex flex-col items-center gap-4 text-center animate-in fade-in">
        <div className="rounded-full bg-green-100 p-4 text-green-600 dark:bg-green-900 dark:text-green-400">
          <CheckCircle className="h-8 w-8" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200">Check Your Email</h3>
          <p className="max-w-xs text-gray-600 dark:text-gray-400">
            We sent a magic link to{' '}
            <strong className="text-gray-800 dark:text-gray-200">{email}</strong>. Click the link to
            sign in.
          </p>
        </div>
        <button
          onClick={() => {
            setStatus('idle')
            setEmail('')
          }}
          className="mt-2 text-sm text-blue-600 hover:underline dark:text-blue-400"
        >
          Use a different email
        </button>
      </div>
    )
  }

  // Verifying state
  if (status === 'verifying') {
    return (
      <div className="flex flex-col items-center gap-4 text-center animate-in fade-in">
        <span className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600"></span>
        <p className="text-gray-600 dark:text-gray-400">Verifying your email...</p>
      </div>
    )
  }

  // Default: email input form
  return (
    <div className="flex flex-col gap-4">
      {error && (
        <div className="rounded-md bg-red-100 p-3 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-400">
          {error}
        </div>
      )}

      <div className="relative">
        <Mail className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
        <input
          type="email"
          placeholder="Enter your email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSendLink()
          }}
          disabled={status === 'sending'}
          className="w-full rounded-full border border-gray-300 bg-white py-4 pl-12 pr-6 text-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-70 dark:border-gray-600 dark:bg-zinc-700 dark:text-white dark:placeholder-gray-400"
        />
      </div>

      <button
        onClick={handleSendLink}
        disabled={status === 'sending' || !email.trim()}
        className="group flex w-full items-center justify-center gap-3 rounded-full bg-gray-800 px-6 py-4 text-lg font-bold text-white shadow-md transition-all hover:bg-gray-900 hover:shadow-lg active:scale-95 disabled:opacity-70 dark:bg-zinc-700 dark:hover:bg-zinc-600"
      >
        {status === 'sending' ? (
          <span className="h-6 w-6 animate-spin rounded-full border-2 border-gray-500 border-t-white"></span>
        ) : (
          <Mail className="h-6 w-6" />
        )}
        <span>{status === 'sending' ? 'Sending...' : 'Send Magic Link'}</span>
      </button>
    </div>
  )
}
