import { useEffect, useState } from 'react'
import { doc, onSnapshot, getFirestore } from 'firebase/firestore'
import { app } from './firebase-client'

const db = app ? getFirestore(app) : null

export function useFirestoreDocument<T>(path: string | null) {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(!!(path && db))
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    if (!path || !db) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (loading) setLoading(false)
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
  }, [path])

  return { data, loading, error }
}
