import { useEffect, useState } from 'react'
import { doc, onSnapshot, getFirestore } from 'firebase/firestore'
import { onAuthStateChanged, type User } from 'firebase/auth'
import { app, auth } from './firebase-client'

const db = app ? getFirestore(app) : null

export function useFirestoreDocument<T>(path: string | null) {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(!!(path && db && auth?.currentUser))
  const [error, setError] = useState<Error | null>(null)
  const [currentUser, setCurrentUser] = useState<User | null>(auth?.currentUser || null)

  // Track auth state changes - this ensures we re-subscribe when auth changes
  useEffect(() => {
    if (!auth) return

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      console.log('[Firestore] Auth state changed:', user?.uid || 'signed out')
      setCurrentUser(user)
    })

    return () => unsubscribe()
  }, [])

  useEffect(() => {
    if (!path || !db) {
      return
    }

    // Only subscribe if we have an authenticated user
    if (!currentUser) {
      console.log('[Firestore] Skipping subscription - no authenticated user for:', path)
      // Only set loading to false if it was true - usage of setTimeout avoids "set-state-in-effect" rule
      setTimeout(() => setLoading((prev) => (prev ? false : prev)), 0)
      return
    }

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true)
    setError(null) // Clear previous error when starting new subscription

    const docRef = doc(db, path)

    console.log('[Firestore] Subscribing to:', path, 'with uid:', currentUser.uid)

    const unsubscribe = onSnapshot(
      docRef,
      (snapshot) => {
        setLoading(false)
        setError(null) // Clear any previous error on success
        if (snapshot.exists()) {
          setData({ id: snapshot.id, ...snapshot.data() } as T)
        } else {
          setData(null)
        }
      },
      (err) => {
        console.error('[Firestore] Subscription error for', path, ':', err.code, err.message)
        console.error('[Firestore] Current auth uid:', currentUser?.uid)
        setError(err)
        setLoading(false)
      },
    )

    return () => unsubscribe()
  }, [path, currentUser])

  return { data, loading, error }
}
