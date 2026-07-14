import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useIdentityResolution } from './useIdentityResolution'
import type { BootstrapUser } from './useBootstrap'
import {
  $recipes,
  $recipesLoading,
  $recipesInitialized,
  $recipesError,
} from '../../../lib/recipeStore'

interface Props {
  initialUser?: string | null
  initialIsAdmin?: boolean
  initialHasOnboarded?: boolean
  bootstrapped: boolean
  bootstrapUser: BootstrapUser | null
}

function resetRecipeStore() {
  $recipes.set([])
  $recipesLoading.set(true)
  $recipesInitialized.set(false)
  $recipesError.set(null)
}

function setSearch(search: string) {
  window.history.replaceState({}, '', `/protected/recipes${search}`)
}

describe('useIdentityResolution', () => {
  beforeEach(() => {
    resetRecipeStore()
    setSearch('')
  })

  afterEach(() => {
    resetRecipeStore()
    setSearch('')
    vi.restoreAllMocks()
  })

  it('cold launch, unknown identity: onboarding status starts null (waits for bootstrap)', () => {
    const { result } = renderHook(() =>
      useIdentityResolution({
        initialUser: 'real-user-1',
        initialIsAdmin: false,
        initialHasOnboarded: undefined,
        bootstrapped: false,
        bootstrapUser: null,
      }),
    )

    expect(result.current.isOnboardingComplete).toBeNull()
    expect(result.current.currentUser).toBe('real-user-1')
    expect(result.current.isAdmin).toBe(false)
  })

  it('warm launch (persisted recipe cache already present): treats onboarding as complete immediately', () => {
    $recipesInitialized.set(true)

    const { result } = renderHook(() =>
      useIdentityResolution({
        initialUser: 'real-user-1',
        bootstrapped: false,
        bootstrapUser: null,
      }),
    )

    expect(result.current.isOnboardingComplete).toBe(true)
  })

  it('force_onboarding=true always wins, even for a warm launch', () => {
    $recipesInitialized.set(true)
    setSearch('?force_onboarding=true')

    const { result } = renderHook(() =>
      useIdentityResolution({
        initialUser: 'real-user-1',
        bootstrapped: false,
        bootstrapUser: null,
      }),
    )

    expect(result.current.isOnboardingComplete).toBe(false)
  })

  it('skip_onboarding=true always wins', () => {
    setSearch('?skip_onboarding=true')

    const { result } = renderHook(() =>
      useIdentityResolution({
        initialUser: 'real-user-1',
        bootstrapped: false,
        bootstrapUser: null,
      }),
    )

    expect(result.current.isOnboardingComplete).toBe(true)
  })

  it('test users are always treated as onboarded, without waiting for bootstrap', () => {
    const { result } = renderHook(() =>
      useIdentityResolution({
        initialUser: 'TestUser',
        bootstrapped: false,
        bootstrapUser: null,
      }),
    )

    expect(result.current.isOnboardingComplete).toBe(true)
  })

  it('once bootstrap resolves, adopts the Firestore-verified hasOnboarded/displayName/isAdmin', () => {
    const { result, rerender } = renderHook<ReturnType<typeof useIdentityResolution>, Props>(
      (props) => useIdentityResolution(props),
      {
        initialProps: {
          initialUser: 'real-user-1',
          initialIsAdmin: false,
          initialHasOnboarded: undefined,
          bootstrapped: false,
          bootstrapUser: null,
        },
      },
    )

    expect(result.current.isOnboardingComplete).toBeNull()

    rerender({
      initialUser: 'real-user-1',
      initialIsAdmin: false,
      initialHasOnboarded: undefined,
      bootstrapped: true,
      bootstrapUser: { displayName: 'Emilio Harrison', isAdmin: true, hasOnboarded: false },
    })

    expect(result.current.isOnboardingComplete).toBe(false)
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
          bootstrapped: false,
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
      bootstrapped: true,
      bootstrapUser: { displayName: 'X', isAdmin: false, hasOnboarded: true },
    })

    expect(result.current.isAdmin).toBe(true)
  })

  it('when bootstrap never returns a user (e.g. its own 401), falls back to the SSR hasOnboarded default', () => {
    const { result, rerender } = renderHook<ReturnType<typeof useIdentityResolution>, Props>(
      (props) => useIdentityResolution(props),
      {
        initialProps: {
          initialUser: 'real-user-1',
          initialHasOnboarded: undefined,
          bootstrapped: false,
          bootstrapUser: null,
        },
      },
    )

    rerender({
      initialUser: 'real-user-1',
      initialHasOnboarded: undefined,
      bootstrapped: true,
      bootstrapUser: null,
    })

    // No signal at all (SSR default was undefined, bootstrap never resolved a user) — defaults to
    // treating the user as onboarded rather than forcing onboarding on a network hiccup.
    expect(result.current.isOnboardingComplete).toBe(true)
  })
})
