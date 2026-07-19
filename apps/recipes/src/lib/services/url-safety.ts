/**
 * SSRF hardening for the AI import pipeline: `resolveInput`/`processImageInput` (ai-parser.ts)
 * take a `url`/`image` straight from the request body and fetch it server-side — both to read
 * page content and to re-fetch a photo. Without a check here, a crafted request could point
 * that fetch at an internal service or the cloud metadata endpoint. Cloudflare Workers already
 * restrict egress to private IP space at the platform level, but this is cheap, explicit
 * insurance rather than relying solely on that.
 *
 * This does NOT protect against DNS rebinding (resolving a public hostname to a private IP only
 * at fetch time) — that would need to pin the resolved IP, which isn't practical without a DNS
 * API in the Workers runtime. It does reject the common, cheap cases: literal private/loopback/
 * link-local IPs, `localhost`, and other non-routable hostnames.
 */

const BLOCKED_HOSTNAMES = new Set(['localhost', 'metadata.google.internal'])

function isPrivateOrLinkLocalIpv4(hostname: string): boolean {
  const match = hostname.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/)
  if (!match) return false

  const octets = match.slice(1).map(Number)
  if (octets.some((n) => n > 255)) return false
  const [a, b] = octets

  if (a === 10) return true // 10.0.0.0/8
  if (a === 172 && b >= 16 && b <= 31) return true // 172.16.0.0/12
  if (a === 192 && b === 168) return true // 192.168.0.0/16
  if (a === 127) return true // 127.0.0.0/8 loopback
  if (a === 169 && b === 254) return true // 169.254.0.0/16 link-local (incl. cloud metadata)
  if (a === 0) return true // 0.0.0.0/8
  return false
}

function isPrivateOrLinkLocalIpv6(hostname: string): boolean {
  // Bracketed literals (as they appear in a parsed URL's `hostname`) come through with the
  // brackets stripped by the URL parser, but strip defensively in case of direct callers.
  const host = hostname.replace(/(^\[)|(\]$)/g, '').toLowerCase()
  if (host === '::1') return true // loopback
  if (host.startsWith('fe80:')) return true // link-local
  if (host.startsWith('fc') || host.startsWith('fd')) return true // unique local (fc00::/7)
  return false
}

/**
 * Throws if `rawUrl` isn't safe for the server to fetch on the caller's behalf: non-http(s)
 * schemes, and hostnames that are localhost, `.local`/`.internal`, or a private/loopback/
 * link-local IP literal.
 */
export function assertSafeExternalUrl(rawUrl: string): void {
  let parsed: URL
  try {
    parsed = new URL(rawUrl)
  } catch {
    throw new Error('Invalid URL')
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error('This URL cannot be fetched')
  }

  const hostname = parsed.hostname.toLowerCase()
  if (
    BLOCKED_HOSTNAMES.has(hostname) ||
    hostname.endsWith('.local') ||
    hostname.endsWith('.internal')
  ) {
    throw new Error('This URL cannot be fetched')
  }

  if (isPrivateOrLinkLocalIpv4(hostname) || isPrivateOrLinkLocalIpv6(hostname)) {
    throw new Error('This URL cannot be fetched')
  }
}
