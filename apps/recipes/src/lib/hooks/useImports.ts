import { useCallback, useEffect, useRef, useState } from 'react'
import { fetchImports, EMPTY_IMPORTS, type ImportsSnapshot } from '../services/imports-api'

/** While a batch is being worked on. Fast enough to feel live if the user stays, cheap enough to
 * leave running: the endpoint is one indexed Firestore query. */
const ACTIVE_POLL_MS = 8_000

/**
 * Watches the user's outstanding photo imports.
 *
 * The whole point of the feature is that the user starts a batch and leaves, so the two moments
 * that matter most are "the app was reopened" and "the tab came back to the foreground" — both
 * refetch immediately. Continuous polling only runs while something is actually in progress; once
 * everything has finished there is nothing to poll for.
 */
export function useImports(enabled: boolean = true) {
  const [snapshot, setSnapshot] = useState<ImportsSnapshot>(EMPTY_IMPORTS)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // Kept in a ref so the polling effect doesn't tear down and rebuild on every refresh.
  const inProgress = useRef(0)

  const refresh = useCallback(async () => {
    if (!enabled) return
    setLoading(true)
    try {
      const next = await fetchImports()
      setSnapshot(next)
      inProgress.current = next.summary.inProgress
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load your imports.')
    } finally {
      setLoading(false)
    }
  }, [enabled])

  useEffect(() => {
    if (!enabled) return
    void refresh()

    const onVisible = () => {
      if (document.visibilityState === 'visible') void refresh()
    }
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('focus', onVisible)

    const timer = setInterval(() => {
      if (inProgress.current > 0 && document.visibilityState === 'visible') void refresh()
    }, ACTIVE_POLL_MS)

    return () => {
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('focus', onVisible)
      clearInterval(timer)
    }
  }, [enabled, refresh])

  return { jobs: snapshot.jobs, summary: snapshot.summary, loading, error, refresh }
}
