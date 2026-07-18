/**
 * Activation ("invite") code helpers.
 *
 * Activation codes grant full app access when redeemed (`api/auth/redeem-code.ts`), so they
 * must be unguessable, single-use, and time-limited. Generation stays open to any approved
 * user (the "invite a friend" feature), but the codes themselves are hardened here.
 */

// Crockford base32 — omits I, L, O, U to avoid transcription errors and profanity. 32 chars
// divides 256 evenly, so `byte % 32` has no modulo bias.
const CODE_ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ'
const DEFAULT_CODE_LENGTH = 10 // 10 × log2(32) = 50 bits of entropy

/** Days an activation code stays valid after creation. */
export const INVITE_CODE_TTL_DAYS = 7
export const INVITE_CODE_TTL_MS = INVITE_CODE_TTL_DAYS * 24 * 60 * 60 * 1000

/**
 * Generate a cryptographically-random activation code (replaces the old predictable
 * `Math.random().toString(36)` codes).
 */
export function generateInviteCode(length: number = DEFAULT_CODE_LENGTH): string {
  const bytes = new Uint8Array(length)
  crypto.getRandomValues(bytes)

  let code = ''
  for (let i = 0; i < length; i++) {
    code += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length]
  }
  return code
}

/** ISO timestamp for when a code created `now` should expire. */
export function inviteExpiryFrom(now: number = Date.now()): string {
  return new Date(now + INVITE_CODE_TTL_MS).toISOString()
}

/**
 * Whether an invite is expired. Codes issued before expiry tracking existed (no `expiresAt`)
 * are treated as non-expiring for backward compatibility.
 */
export function isInviteExpired(
  invite: { expiresAt?: string | null },
  now: number = Date.now(),
): boolean {
  if (!invite.expiresAt) return false
  const expiresAt = Date.parse(invite.expiresAt)
  return Number.isFinite(expiresAt) && expiresAt < now
}

/**
 * Whether an invite may still be redeemed: it must be pending (not already accepted/revoked)
 * and not expired. A missing `status` is treated as pending for backward compatibility with
 * the earliest codes.
 */
export function isInviteRedeemable(
  invite: { status?: string | null; expiresAt?: string | null },
  now: number = Date.now(),
): boolean {
  const status = invite.status ?? 'pending'
  if (status !== 'pending') return false
  return !isInviteExpired(invite, now)
}
