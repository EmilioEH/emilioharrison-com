import { useState } from 'react'
import { $recipesInitialized } from '../../../lib/recipeStore'
import type { BootstrapUser } from './useBootstrap'

interface UseIdentityResolutionParams {
  /** SSR-provided defaults from `[...path].astro` — cheap best-effort placeholders now that the
   * page no longer blocks on a Firestore lookup (see PERFORMANCE-PLAN.md P6+P7): `initialUser` is
   * just the raw `site_user` cookie value, `initialIsAdmin` is a cheap cookie-derived guess, and
   * `initialHasOnboarded` is usually `undefined` (unknown) outside of test mode. */
  initialUser?: string | null
  initialIsAdmin?: boolean
  initialHasOnboarded?: boolean
  bootstrapped: boolean
  bootstrapUser: BootstrapUser | null
}

/**
 * Resolves the three identity-shaped pieces of state RecipeManager needs to decide what to
 * render (`currentUser` display name, `isAdmin`, and the onboarding-complete gate), reconciling
 * the SSR placeholders above with the Firestore-verified values from `useBootstrap()` once they
 * arrive — without ever flashing the wrong screen for a returning user.
 *
 * Everything here is a plain value *derived during render* rather than mirrored into state via
 * `useEffect` — the values only ever depend on props/params (`initialUser`, `bootstrapUser`, …)
 * or a one-off external snapshot (`$recipesInitialized.get()`), so there's nothing here that
 * genuinely needs an effect (deriving state from props inside `useEffect` is exactly the
 * anti-pattern the React docs / compiler diagnostics warn about — see
 * https://react.dev/learn/you-might-not-need-an-effect). The only *real* React state is the two
 * genuine user-initiated events that must override the derived value once they happen: manually
 * completing onboarding (`OnboardingFlow`'s `onComplete`) and manually updating the display name
 * (Settings → `handleUpdateProfile`).
 *
 * `isOnboardingComplete` is `null` ("not yet known") only when there's truly no cheaper signal
 * available yet: it resolves immediately (no waiting on the network) for test users, the
 * `force_onboarding`/`skip_onboarding` query-param overrides, and warm launches (a persisted
 * recipe cache already implies a previously-onboarded user — see recipeStore.ts P2); otherwise it
 * waits for `bootstrapped`.
 */
export function useIdentityResolution({
  initialUser,
  initialIsAdmin,
  initialHasOnboarded,
  bootstrapped,
  bootstrapUser,
}: UseIdentityResolutionParams) {
  const isTestUser = initialUser === 'TestUser' || initialUser === 'test_user'

  // Real state only for genuine user-initiated overrides — never mirrors a prop/derived value.
  const [manualDisplayName, setManualDisplayName] = useState<string | null>(null)
  const [manuallyOnboarded, setManuallyOnboarded] = useState(false)

  const currentUser = manualDisplayName ?? bootstrapUser?.displayName ?? initialUser

  // Bootstrap's Firestore-verified admin flag only ever upgrades the SSR cookie-derived guess,
  // never downgrades it — a false negative here (hiding admin UI from an actual admin) is a worse
  // outcome than a rare false positive from a stale cookie.
  const isAdmin =
    !!bootstrapUser?.isAdmin ||
    !!initialIsAdmin ||
    (isTestUser &&
      typeof window !== 'undefined' &&
      (window as unknown as { isPlaywright: boolean }).isPlaywright)

  let isOnboardingComplete: boolean | null = null
  if (manuallyOnboarded) {
    isOnboardingComplete = true
  } else if (
    typeof window !== 'undefined' &&
    window.location.search.includes('force_onboarding=true')
  ) {
    isOnboardingComplete = false
  } else if (
    typeof window !== 'undefined' &&
    window.location.search.includes('skip_onboarding=true')
  ) {
    isOnboardingComplete = true
  } else if (isTestUser) {
    isOnboardingComplete = true
  } else if (bootstrapped) {
    isOnboardingComplete = bootstrapUser?.hasOnboarded ?? initialHasOnboarded ?? true
  } else if ($recipesInitialized.get()) {
    isOnboardingComplete = true
  }

  return {
    currentUser,
    setCurrentUser: setManualDisplayName,
    isAdmin,
    isOnboardingComplete,
    setIsOnboardingComplete: setManuallyOnboarded,
  }
}
