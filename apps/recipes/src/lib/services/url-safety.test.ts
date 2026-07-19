/* eslint-disable sonarjs/no-clear-text-protocols -- this file's whole point is exercising
   rejection of literal-IP http:// URLs (SSRF targets); the fixtures ARE the risky input. */
import { describe, it, expect } from 'vitest'
import { assertSafeExternalUrl } from './url-safety'

describe('assertSafeExternalUrl', () => {
  it('allows ordinary public https URLs', () => {
    expect(() => assertSafeExternalUrl('https://www.allrecipes.com/recipe/123')).not.toThrow()
  })

  it('allows ordinary public http URLs', () => {
    expect(() => assertSafeExternalUrl('http://example.com/recipe')).not.toThrow()
  })

  it('rejects an invalid URL', () => {
    expect(() => assertSafeExternalUrl('not a url')).toThrow(/Invalid URL/)
  })

  it('rejects non-http(s) schemes', () => {
    expect(() => assertSafeExternalUrl('file:///etc/passwd')).toThrow()
    expect(() => assertSafeExternalUrl('ftp://example.com/file')).toThrow()
    expect(() => assertSafeExternalUrl('gopher://example.com')).toThrow()
  })

  it('rejects localhost and internal-looking hostnames', () => {
    expect(() => assertSafeExternalUrl('http://localhost/admin')).toThrow()
    expect(() => assertSafeExternalUrl('http://localhost:8080/admin')).toThrow()
    expect(() => assertSafeExternalUrl('http://printer.local/')).toThrow()
    expect(() => assertSafeExternalUrl('http://service.internal/')).toThrow()
    expect(() => assertSafeExternalUrl('http://metadata.google.internal/')).toThrow()
  })

  it('rejects private/loopback/link-local IPv4 literals', () => {
    expect(() => assertSafeExternalUrl('http://127.0.0.1/')).toThrow()
    expect(() => assertSafeExternalUrl('http://10.0.0.5/')).toThrow()
    expect(() => assertSafeExternalUrl('http://172.16.0.1/')).toThrow()
    expect(() => assertSafeExternalUrl('http://172.31.255.255/')).toThrow()
    expect(() => assertSafeExternalUrl('http://192.168.1.1/')).toThrow()
    // Cloud metadata endpoint (AWS/GCP/Azure) — link-local range.
    expect(() => assertSafeExternalUrl('http://169.254.169.254/latest/meta-data/')).toThrow()
    expect(() => assertSafeExternalUrl('http://0.0.0.0/')).toThrow()
  })

  it('does not reject a public IPv4 address that merely starts with a private octet', () => {
    // 172.32.x.x is outside the 172.16.0.0/12 range (16-31) and should not be blocked.
    expect(() => assertSafeExternalUrl('http://172.32.0.1/')).not.toThrow()
    // 11.x.x.x is outside 10.0.0.0/8.
    expect(() => assertSafeExternalUrl('http://11.0.0.1/')).not.toThrow()
  })

  it('rejects private/loopback/link-local IPv6 literals', () => {
    expect(() => assertSafeExternalUrl('http://[::1]/')).toThrow()
    expect(() => assertSafeExternalUrl('http://[fe80::1]/')).toThrow()
    expect(() => assertSafeExternalUrl('http://[fc00::1]/')).toThrow()
    expect(() => assertSafeExternalUrl('http://[fd12:3456::1]/')).toThrow()
  })
})
