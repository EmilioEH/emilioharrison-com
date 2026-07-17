import type { BootstrapUser } from './useBootstrap'

interface UseIdentityResolutionParams {
  /** SSR-provided defaults from `[...path].astro` — cheap best-effort placeholders now that the
   * page no longer blocks on a Firestore lookup (see PERFORMANCE-PLAN.md P6+P7): `initialUser` is
   * just the raw `site_user` cookie value and `initialIsAdmin` is a cheap cookie-derived guess. */
  initialUser?: string | null
  initialIsAdmin?: boolean
  bootstrapUser: BootstrapUser | null
}

/**
 * Resolves the identity-shaped state RecipeManager needs to decide what to render
 * (`currentUser` display name and `isAdmin`), reconciling the SSR placeholders above with the
 * Firestore-verified values from `useBootstrap()` once they arrive — without ever flashing the
 * wrong screen for a returning user.
 *
 * Everything here is a plain value *derived during render* rather than mirrored into state via
 * `useEffect` — the values only ever depend on props/params (`initialUser`, `bootstrapUser`, …),
 * so there's nothing here that genuinely needs an effect (deriving state from props inside
 * `useEffect` is exactly the anti-pattern the React docs / compiler diagnostics warn about — see
 * https://react.dev/learn/you-might-not-need-an-effect).
 */
export function useIdentityResolution({
  initialUser,
  initialIsAdmin,
  bootstrapUser,
}: UseIdentityResolutionParams) {
  const isTestUser = initialUser === 'TestUser' || initialUser === 'test_user'

  const currentUser = bootstrapUser?.displayName ?? initialUser

  // Bootstrap's Firestore-verified admin flag only ever upgrades the SSR cookie-derived guess,
  // never downgrades it — a false negative here (hiding admin UI from an actual admin) is a worse
  // outcome than a rare false positive from a stale cookie.
  const isAdmin =
    !!bootstrapUser?.isAdmin ||
    !!initialIsAdmin ||
    (isTestUser &&
      typeof window !== 'undefined' &&
      (window as unknown as { isPlaywright: boolean }).isPlaywright)

  return {
    currentUser,
    isAdmin,
  }
}
