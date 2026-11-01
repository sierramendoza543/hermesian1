// Lightweight protection for routes that spend paid AI/API quota.
// In-memory and per-instance: good enough to blunt casual abuse, not a
// substitute for a shared store (Redis/Upstash) on a multi-instance deploy.

const buckets = new Map<string, { count: number; resetAt: number }>()

export function clientKey(request: Request): string {
  const fwd = request.headers.get('x-forwarded-for')
  return fwd?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'unknown'
}

export function rateLimited(request: Request, scope: string, limit = 20, windowMs = 60_000): boolean {
  const key = `${scope}:${clientKey(request)}`
  const now = Date.now()
  const bucket = buckets.get(key)
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs })
    if (buckets.size > 5000) {
      for (const [k, v] of buckets) if (v.resetAt <= now) buckets.delete(k)
    }
    return false
  }
  bucket.count++
  return bucket.count > limit
}

// Strip control characters and quotes so user text can't break out of the
// quoted slot it is interpolated into, and cap the length.
export function sanitizeShortText(value: unknown, max = 200): string {
  if (typeof value !== 'string') return ''
  return value.replace(/[\u0000-\u001f\u007f"`]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max)
}

import { lookup } from 'node:dns/promises'
import { isIP } from 'node:net'

function isPrivateAddress(ip: string): boolean {
  if (ip.includes(':')) {
    const v = ip.toLowerCase()
    if (v.startsWith('::ffff:')) return isPrivateAddress(v.slice(7))
    return v === '::1' || v === '::' || v.startsWith('fc') || v.startsWith('fd') || v.startsWith('fe8') || v.startsWith('fe9') || v.startsWith('fea') || v.startsWith('feb')
  }
  const [a, b] = ip.split('.').map(Number)
  return (
    a === 0 || a === 10 || a === 127 ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 100 && b >= 64 && b <= 127) ||
    a >= 224
  )
}

// Throws unless the URL is http(s) and resolves only to public addresses.
// Guards server-side fetches of user-supplied URLs against SSRF.
export async function assertPublicHttpUrl(raw: string): Promise<URL> {
  const url = new URL(raw)
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error('Only http(s) URLs are allowed')
  }
  const host = url.hostname.replace(/^\[|\]$/g, '')
  if (host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.internal')) {
    throw new Error('URL not allowed')
  }
  const addrs = isIP(host) ? [{ address: host }] : await lookup(host, { all: true })
  if (addrs.length === 0 || addrs.some(a => isPrivateAddress(a.address))) {
    throw new Error('URL not allowed')
  }
  return url
}
