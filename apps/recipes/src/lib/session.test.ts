import { describe, it, expect, vi, afterEach } from 'vitest'
import type { AstroCookies } from 'astro'
import {
  createSessionToken,
  verifySessionToken,
  getSessionFromCookies,
  getSessionSecret,
  SESSION_COOKIE_NAME,
} from './session'

const SECRET = 'unit-test-secret'

function fakeCookies(values: Record<string, string>): AstroCookies {
  return {
    get: (name: string) => (values[name] !== undefined ? { value: values[name] } : undefined),
  } as unknown as AstroCookies
}

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('createSessionToken / verifySessionToken', () => {
  it('round-trips a signed payload', () => {
    const token = createSessionToken(SECRET, {
      uid: 'user-1',
      email: 'a@example.com',
      name: 'Alice',
    })
    const payload = verifySessionToken(SECRET, token)
    expect(payload).toMatchObject({ uid: 'user-1', email: 'a@example.com', name: 'Alice' })
    expect(payload!.exp * 1000).toBeGreaterThan(Date.now())
  })

  it('rejects a token whose payload was tampered with', () => {
    const token = createSessionToken(SECRET, { uid: 'user-1' })
    const [, signature] = token.split('.')
    const forged =
      Buffer.from(JSON.stringify({ uid: 'victim-uid', exp: Math.floor(Date.now() / 1000) + 999 }))
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '') + `.${signature}`
    expect(verifySessionToken(SECRET, forged)).toBeNull()
  })

  it('rejects a token signed with a different secret', () => {
    const token = createSessionToken('other-secret', { uid: 'user-1' })
    expect(verifySessionToken(SECRET, token)).toBeNull()
  })

  it('rejects an expired token', () => {
    const token = createSessionToken(SECRET, { uid: 'user-1' }, -10)
    expect(verifySessionToken(SECRET, token)).toBeNull()
  })

  it('rejects garbage tokens without throwing', () => {
    expect(verifySessionToken(SECRET, '')).toBeNull()
    expect(verifySessionToken(SECRET, 'no-dot')).toBeNull()
    expect(verifySessionToken(SECRET, 'abc.nothex!')).toBeNull()
    expect(verifySessionToken(SECRET, '.deadbeef')).toBeNull()
  })
})

describe('getSessionSecret', () => {
  it('prefers SESSION_SECRET when set', () => {
    vi.stubEnv('SESSION_SECRET', 'explicit-secret')
    expect(getSessionSecret()).toBe('explicit-secret')
  })

  it('falls back to the FIREBASE_SERVICE_ACCOUNT private key', () => {
    vi.stubEnv('SESSION_SECRET', '')
    vi.stubEnv(
      'FIREBASE_SERVICE_ACCOUNT',
      JSON.stringify({ private_key: 'sa-private-key', client_email: 'x@y.iam' }),
    )
    expect(getSessionSecret()).toBe('sa-private-key')
  })
})

describe('getSessionFromCookies', () => {
  it('resolves identity from a valid site_session cookie', () => {
    vi.stubEnv('SESSION_SECRET', SECRET)
    const token = createSessionToken(SECRET, { uid: 'user-1', email: 'a@example.com' })
    const session = getSessionFromCookies(fakeCookies({ [SESSION_COOKIE_NAME]: token }))
    expect(session?.uid).toBe('user-1')
  })

  it('ignores the legacy site_user cookie outside test mode', () => {
    vi.stubEnv('SESSION_SECRET', SECRET)
    vi.stubEnv('PUBLIC_TEST_MODE', '')
    const session = getSessionFromCookies(fakeCookies({ site_user: 'attacker-chosen-uid' }))
    expect(session).toBeNull()
  })

  it('rejects a site_session cookie signed for a different secret', () => {
    vi.stubEnv('SESSION_SECRET', SECRET)
    const token = createSessionToken('attacker-secret', { uid: 'victim' })
    expect(getSessionFromCookies(fakeCookies({ [SESSION_COOKIE_NAME]: token }))).toBeNull()
  })

  it('accepts forged legacy cookies only in PUBLIC_TEST_MODE', () => {
    vi.stubEnv('SESSION_SECRET', SECRET)
    vi.stubEnv('PUBLIC_TEST_MODE', 'true')
    const session = getSessionFromCookies(
      fakeCookies({ site_user: 'TestUser', site_email: 'test@example.com' }),
    )
    expect(session).toMatchObject({ uid: 'TestUser', email: 'test@example.com' })
  })
})
