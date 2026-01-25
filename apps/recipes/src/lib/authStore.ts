import { atom } from 'nanostores'
import { auth } from './firebase-client'
import { onAuthStateChanged } from 'firebase/auth'
import type { User } from 'firebase/auth'
import { useEffect, useState } from 'react'

export const $user = atom<User | null>(auth?.currentUser || null)

if (auth) {
  onAuthStateChanged(auth, (user) => {
    $user.set(user)
  })
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(auth?.currentUser || null)
  const [loading, setLoading] = useState(!auth?.currentUser && !!auth)

  useEffect(() => {
    if (!auth) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (loading) setLoading(false)
      return
    }
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u)
      setLoading(false)
    })
    return () => unsubscribe()
  }, [])

  return { user, loading }
}
