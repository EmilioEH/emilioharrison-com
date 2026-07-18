import { describe, it, expect } from 'vitest'
import {
  generateInviteCode,
  inviteExpiryFrom,
  isInviteExpired,
  isInviteRedeemable,
  INVITE_CODE_TTL_MS,
} from './invite-codes'

describe('generateInviteCode', () => {
  it('produces codes of the requested length from the safe alphabet', () => {
    const code = generateInviteCode()
    expect(code).toHaveLength(10)
    expect(code).toMatch(/^[0-9A-HJKMNP-TV-Z]+$/) // Crockford base32 (no I, L, O, U)
  })

  it('is effectively unique across many draws', () => {
    const seen = new Set(Array.from({ length: 2000 }, () => generateInviteCode()))
    expect(seen.size).toBe(2000)
  })
})

describe('inviteExpiryFrom / isInviteExpired', () => {
  it('expiry is TTL in the future and not yet expired', () => {
    const now = Date.now()
    const expiresAt = inviteExpiryFrom(now)
    expect(Date.parse(expiresAt)).toBe(now + INVITE_CODE_TTL_MS)
    expect(isInviteExpired({ expiresAt }, now)).toBe(false)
  })

  it('flags a code past its expiry', () => {
    const now = Date.now()
    const expiresAt = new Date(now - 1000).toISOString()
    expect(isInviteExpired({ expiresAt }, now)).toBe(true)
  })

  it('treats codes without expiresAt as non-expiring (back-compat)', () => {
    expect(isInviteExpired({}, Date.now())).toBe(false)
    expect(isInviteExpired({ expiresAt: null }, Date.now())).toBe(false)
  })
})

describe('isInviteRedeemable', () => {
  const now = Date.now()
  const future = inviteExpiryFrom(now)

  it('allows a pending, unexpired code', () => {
    expect(isInviteRedeemable({ status: 'pending', expiresAt: future }, now)).toBe(true)
  })

  it('rejects an already-accepted code (single use)', () => {
    expect(isInviteRedeemable({ status: 'accepted', expiresAt: future }, now)).toBe(false)
  })

  it('rejects a revoked code', () => {
    expect(isInviteRedeemable({ status: 'revoked', expiresAt: future }, now)).toBe(false)
  })

  it('rejects a pending but expired code', () => {
    const past = new Date(now - 1000).toISOString()
    expect(isInviteRedeemable({ status: 'pending', expiresAt: past }, now)).toBe(false)
  })

  it('treats a missing status as pending (back-compat)', () => {
    expect(isInviteRedeemable({ expiresAt: future }, now)).toBe(true)
  })
})
