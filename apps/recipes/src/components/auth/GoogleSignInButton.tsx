import { useState } from 'react'
import { auth, googleProvider } from '../../lib/firebase-client'
import { signInWithPopup } from 'firebase/auth'

export const GoogleSignInButton = () => {
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleGoogleLogin = async () => {
    setLoading(true)
    setError('')
    try {
      const result = await signInWithPopup(auth, googleProvider)
      const idToken = await result.user.getIdToken()

      // Verify token with backend
      const response = await fetch('/protected/recipes/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ idToken }),
      })

      if (response.ok) {
        window.location.replace('/protected/recipes')
      } else {
        const data = await response.json()
        const errorMsg = data.error || 'Login failed'
        setError(errorMsg)

        // Log the detailed error to our global logger
        import('../../lib/logger').then(({ logger }) => {
          logger.error('Backend Login Failed', {
            status: response.status,
            error: data.error,
            details: data.details,
          })
        })
      }
    } catch (e: unknown) {
      console.error(e)
      const errorMsg = e instanceof Error ? e.message : 'Something went wrong'
      setError(errorMsg)

      import('../../lib/logger').then(({ logger }) => {
        logger.error('Client Login Exception', {
          error: errorMsg,
          stack: e instanceof Error ? e.stack : undefined,
        })
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {error && <div className="mb-4 rounded-md bg-red-100 p-3 text-sm text-red-700">{error}</div>}

      <button
        onClick={handleGoogleLogin}
        disabled={loading}
        className="group flex w-full items-center justify-center gap-3 rounded-full bg-white px-6 py-4 text-lg font-bold text-gray-700 shadow-md transition-all hover:bg-gray-50 hover:shadow-lg active:scale-95 disabled:opacity-70 dark:bg-zinc-800 dark:text-white dark:hover:bg-zinc-700"
      >
        {loading ? (
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
