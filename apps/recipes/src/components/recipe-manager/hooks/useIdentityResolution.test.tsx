import { describe, it, expect, afterEach, vi } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useIdentityResolution } from './useIdentityResolution'
import type { BootstrapUser } from './useBootstrap'

interface Props {
  initialUser?: string | null
  initialIsAdmin?: boolean
  bootstrapUser: BootstrapUser | null
}

describe('useIdentityResolution', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('cold launch: falls back to the SSR placeholders until bootstrap resolves', () => {
    const { result } = renderHook(() =>
      useIdentityResolution({
        initialUser: 'real-user-1',
        initialIsAdmin: false,
        bootstrapUser: null,
      }),
    )

    expect(result.current.currentUser).toBe('real-user-1')
    expect(result.current.isAdmin).toBe(false)
  })

  it('once bootstrap resolves, adopts the Firestore-verified displayName/isAdmin', () => {
    const { result, rerender } = renderHook<ReturnType<typeof useIdentityResolution>, Props>(
      (props) => useIdentityResolution(props),
      {
        initialProps: {
          initialUser: 'real-user-1',
          initialIsAdmin: false,
          bootstrapUser: null,
        },
      },
    )

    expect(result.current.currentUser).toBe('real-user-1')

    rerender({
      initialUser: 'real-user-1',
      initialIsAdmin: false,
      bootstrapUser: { displayName: 'Emilio Harrison', isAdmin: true },
    })

    expect(result.current.currentUser).toBe('Emilio Harrison')
    expect(result.current.isAdmin).toBe(true)
  })

  it('bootstrap admin flag only ever upgrades, never downgrades, the SSR cookie-derived guess', () => {
    const { result, rerender } = renderHook<ReturnType<typeof useIdentityResolution>, Props>(
      (props) => useIdentityResolution(props),
      {
        initialProps: {
          initialUser: 'real-user-1',
          initialIsAdmin: true, // SSR cookie check already said admin
          bootstrapUser: null,
        },
      },
    )

    expect(result.current.isAdmin).toBe(true)

    // Bootstrap's Firestore-verified check disagrees (e.g. stale cookie) — we don't downgrade,
    // since a false negative here would be a worse UX regression than a rare false positive.
    rerender({
      initialUser: 'real-user-1',
      initialIsAdmin: true,
      bootstrapUser: { displayName: 'X', isAdmin: false },
    })

    expect(result.current.isAdmin).toBe(true)
  })
})
