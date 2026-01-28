import { useEffect, useState } from 'react'
import { doc, onSnapshot, getFirestore } from 'firebase/firestore'
import { onAuthStateChanged } from 'firebase/auth'
import { app, auth } from './firebase-client'

const db = app ? getFirestore(app) : null

export function useFirestoreDocument<T>(path: string | null) {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(!!(path && db))
  const [error, setError] = useState<Error | null>(null)
  const [authReady, setAuthReady] = useState(false)

  // Wait for auth state to be determined before subscribing
  useEffect(() => {
    if (!auth) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setAuthReady(true) // No auth available, proceed anyway
      return
    }

    // Check if already authenticated
    if (auth.currentUser) {
      setAuthReady(true)
      return
    }

    // Wait for auth state change (either signed in or confirmed signed out)
    const unsubscribe = onAuthStateChanged(auth, () => {
      setAuthReady(true)
    })

    return () => unsubscribe()
  }, [])

  useEffect(() => {
    if (!path || !db || !authReady) {
      return
    }

    // Only subscribe if we have an authenticated user
    if (!auth?.currentUser) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLoading(false)
      return
    }

    setLoading(true)

    const docRef = doc(db, path)

    const unsubscribe = onSnapshot(
      docRef,
      (snapshot) => {
        setLoading(false)
        if (snapshot.exists()) {
          setData({ id: snapshot.id, ...snapshot.data() } as T)
        } else {
          setData(null)
        }
      },
      (err) => {
        console.error('Firestore subscription error', err)
        setError(err)
        setLoading(false)
      },
    )

    return () => unsubscribe()
  }, [path, authReady])

  return { data, loading, error }
}
