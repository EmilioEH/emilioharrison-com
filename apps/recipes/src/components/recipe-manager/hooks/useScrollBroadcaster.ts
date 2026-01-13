import { useState, useEffect } from 'react'

export function useScrollBroadcaster() {
  const [scrollContainer, setScrollContainer] = useState<HTMLElement | Window | null>(() =>
    typeof window !== 'undefined' ? window : null,
  )

  useEffect(() => {
    const target = scrollContainer || (typeof window !== 'undefined' ? window : null)
    if (!target) return

    const handleScroll = () => {
      const scrollTop =
        target instanceof Window ? window.scrollY : (target as HTMLElement).scrollTop

      window.dispatchEvent(
        new CustomEvent('recipe-scroll', {
          detail: { scrollTop },
        }),
      )
    }

    target.addEventListener('scroll', handleScroll, { passive: true })
    return () => target.removeEventListener('scroll', handleScroll)
  }, [scrollContainer])

  return { scrollContainer, setScrollContainer }
}
