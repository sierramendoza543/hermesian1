import { resolveGoogleNewsUrl } from '@/lib/extract'
import { assertPublicHttpUrl } from '@/lib/apiGuard'

// Finds a lead image for a story by reading og:image from the first outlet
// page that cooperates. Results (including misses) are cached.

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36'

// Outlets whose pages are usually readable without a login
const FRIENDLY = ['theguardian.com', 'bbc.com', 'npr.org', 'cbsnews.com', 'apnews.com', 'abcnews.go.com', 'nbcnews.com', 'politico.com', 'thehill.com', 'usatoday.com', 'foxnews.com', 'aljazeera.com', 'cnn.com', 'axios.com', 'yahoo.com', 'reuters.com', 'washingtonexaminer.com', 'nypost.com', 'time.com', 'newsweek.com']

const cache = new Map<string, { at: number; url: string | null }>()
const inflight = new Map<string, Promise<string | null>>()
const TTL = 12 * 60 * 60 * 1000

function ogImage(html: string, base: string): string | null {
  const pick = (re: RegExp) => html.match(re)?.[1]
  const raw =
    pick(/<meta[^>]+property=["']og:image(?::url)?["'][^>]+content=["']([^"']+)["']/i) ||
    pick(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image(?::url)?["']/i) ||
    pick(/<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i) ||
    pick(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']twitter:image["']/i)
  if (!raw) return null
  try {
    const url = new URL(raw.replace(/&amp;/g, '&'), base).toString()
    return /^https:\/\//.test(url) && !/logo|favicon|default|placeholder|sprite/i.test(url) ? url : null
  } catch {
    return null
  }
}

async function fetchHead(url: string): Promise<string | null> {
  await assertPublicHttpUrl(url)
  const res = await fetch(url, {
    headers: { 'User-Agent': UA, Accept: 'text/html' },
    redirect: 'follow',
    signal: AbortSignal.timeout(7000),
    cache: 'no-store',
  })
  if (!res.ok || !res.body) return null
  // Only the <head> matters — read until it closes or 250KB
  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let html = ''
  while (html.length < 250_000) {
    const { done, value } = await reader.read()
    if (done) break
    html += decoder.decode(value, { stream: true })
    if (html.includes('</head>')) break
  }
  reader.cancel().catch(() => {})
  return ogImage(html, res.url || url)
}

export interface ImageSource {
  url: string
  domain: string
}

async function find(articles: ImageSource[]): Promise<string | null> {
  const ranked = [...articles].sort((a, b) => {
    const ra = FRIENDLY.findIndex((d) => a.domain.endsWith(d))
    const rb = FRIENDLY.findIndex((d) => b.domain.endsWith(d))
    return (ra === -1 ? 99 : ra) - (rb === -1 ? 99 : rb)
  })
  for (const a of ranked.slice(0, 3)) {
    try {
      const real = await resolveGoogleNewsUrl(a.url)
      if (real.includes('news.google.com')) continue
      const img = await fetchHead(real)
      if (img) return img
    } catch {}
  }
  return null
}

export async function getStoryImage(id: string, articles: ImageSource[]): Promise<string | null> {
  const hit = cache.get(id)
  if (hit && Date.now() - hit.at < TTL) return hit.url
  let p = inflight.get(id)
  if (!p) {
    p = find(articles)
      .then((url) => {
        cache.set(id, { at: Date.now(), url })
        if (cache.size > 1500) for (const k of [...cache.keys()].slice(0, 500)) cache.delete(k)
        return url
      })
      .finally(() => inflight.delete(id))
    inflight.set(id, p)
  }
  return p
}
