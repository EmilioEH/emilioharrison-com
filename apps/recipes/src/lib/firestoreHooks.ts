import { useEffect, useState } from 'react'
import { doc, collection, onSnapshot, getFirestore } from 'firebase/firestore'
import { onAuthStateChanged, type User } from 'firebase/auth'
import { app, auth } from './firebase-client'

const db = app ? getFirestore(app) : null

/**
 * Subscribe to one Firestore document.
 *
 * Three states, not two. `loading` says a subscription is in flight; `resolved` says a snapshot
 * has actually arrived for the *current* path, and only then does `data: null` mean "this document
 * does not exist". Without that distinction there is a window on every page open — Firebase auth
 * restores asynchronously, so `currentUser` is null for the first render or two — where a caller
 * sees `data: null, loading: false` and concludes the document is missing when nobody has looked
 * yet. That window is what made the grocery list rebuild itself (and overwrite the cook's work)
 * on reload.
 */
export function useFirestoreDocument<T>(path: string | null) {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(!!(path && db && auth?.currentUser))
  const [resolved, setResolved] = useState(false)
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

    // Nothing has been read for this path yet, and — until a snapshot arrives — nothing can be
    // concluded from `data` either. A path change (e.g. the grocery list's scope flipping from
    // the user's own id to the family's once the family loads) puts us back here.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setResolved(false)

    // Only subscribe if we have an authenticated user
    if (!currentUser) {
      console.log('[Firestore] Skipping subscription - no authenticated user for:', path)
      // Only set loading to false if it was true - usage of setTimeout avoids "set-state-in-effect" rule
      setTimeout(() => setLoading((prev) => (prev ? false : prev)), 0)
      return
    }

    setLoading(true)
    setError(null) // Clear previous error when starting new subscription

    const docRef = doc(db, path)

    console.log('[Firestore] Subscribing to:', path, 'with uid:', currentUser.uid)

    const unsubscribe = onSnapshot(
      docRef,
      (snapshot) => {
        setLoading(false)
        setResolved(true)
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
        // A failed read is a definite answer about the read, not about the document — callers
        // that only act on a *known* absence must not act on this one.
        setResolved(false)
      },
    )

    return () => unsubscribe()
  }, [path, currentUser])

  return { data, loading, resolved, error }
}

export function useFirestoreCollection<T>(path: string | null) {
  const [data, setData] = useState<T[]>([])
  const [loading, setLoading] = useState(!!(path && db && auth?.currentUser))
  const [error, setError] = useState<Error | null>(null)
  const [currentUser, setCurrentUser] = useState<User | null>(auth?.currentUser || null)

  useEffect(() => {
    if (!auth) return
    const unsubscribe = onAuthStateChanged(auth, (user) => setCurrentUser(user))
    return () => unsubscribe()
  }, [])

  useEffect(() => {
    if (!path || !db) return

    if (!currentUser) {
      setTimeout(() => setLoading((prev) => (prev ? false : prev)), 0)
      return
    }

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true)
    setError(null)

    const colRef = collection(db, path)

    const unsubscribe = onSnapshot(
      colRef,
      (snapshot) => {
        setLoading(false)
        setError(null)
        const docs = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as T)
        setData(docs)
      },
      (err) => {
        console.error('[Firestore] Collection subscription error for', path, ':', err.code)
        setError(err)
        setLoading(false)
      },
    )

    return () => unsubscribe()
  }, [path, currentUser])

  return { data, loading, error }
}
