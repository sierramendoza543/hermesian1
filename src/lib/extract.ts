import { assertPublicHttpUrl } from '@/lib/apiGuard'

// Fetches a news URL and pulls out readable article text. Handles Google News
// redirect links (which hide the real publisher URL) and refuses to fetch
// private/internal addresses.

const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36'

/** The publisher refused automated reading (paywall, login wall or bot protection). */
export class BlockedError extends Error {
  constructor(public status: number) {
    super(`blocked:${status}`)
  }
}

export interface ExtractedArticle {
  title: string
  text: string
  url: string
  siteName: string
  paywalled: boolean
}

function decodeEntities(s: string): string {
  return s
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&rsquo;|&#8217;/g, '’')
    .replace(/&lsquo;|&#8216;/g, '‘')
    .replace(/&rdquo;|&#8221;/g, '”')
    .replace(/&ldquo;|&#8220;/g, '“')
    .replace(/&mdash;|&#8212;/g, '—')
    .replace(/&ndash;|&#8211;/g, '–')
    .replace(/&hellip;|&#8230;/g, '…')
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
}

async function fetchPage(url: string): Promise<{ finalUrl: string; html: string; status: number }> {
  let current = url
  for (let hop = 0; hop < 5; hop++) {
    await assertPublicHttpUrl(current)
    const res = await fetch(current, {
      headers: { 'User-Agent': UA, Accept: 'text/html,application/xhtml+xml', 'Accept-Language': 'en-US,en;q=0.9' },
      redirect: 'manual',
      cache: 'no-store',
      signal: AbortSignal.timeout(12_000),
    })
    const location = res.headers.get('location')
    if (res.status >= 300 && res.status < 400 && location) {
      current = new URL(location, current).toString()
      continue
    }
    const html = (await res.text()).slice(0, 2_500_000)
    return { finalUrl: current, html, status: res.status }
  }
  throw new Error('Too many redirects')
}

/** Turns a news.google.com article link into the publisher's real URL. */
export async function resolveGoogleNewsUrl(link: string): Promise<string> {
  let u: URL
  try {
    u = new URL(link)
  } catch {
    return link
  }
  if (u.hostname !== 'news.google.com') return link
  const id = u.pathname.split('/').pop() || ''
  if (!id) return link

  try {
    const page = await fetch(`https://news.google.com/rss/articles/${id}`, {
      headers: { 'User-Agent': UA },
      signal: AbortSignal.timeout(10_000),
    })
    const html = await page.text()
    const sg = html.match(/data-n-a-sg="([^"]+)"/)?.[1]
    const ts = html.match(/data-n-a-ts="([^"]+)"/)?.[1]
    if (!sg || !ts) return link
    const inner = JSON.stringify([
      'garturlreq',
      [['X', 'X', ['X', 'X'], null, null, 1, 1, 'US:en', null, 1, null, null, null, null, null, 0, 1], 'X', 'X', 1, [1, 1, 1], 1, 1, null, 0, 0, null, 0],
      id,
      ts,
      sg,
    ])
    const body = `f.req=${encodeURIComponent(JSON.stringify([[['Fbv4je', inner]]]))}`
    const res = await fetch('https://news.google.com/_/DotsSplashUi/data/batchexecute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8', 'User-Agent': UA },
      body,
      signal: AbortSignal.timeout(10_000),
    })
    const text = await res.text()
    const parsed = JSON.parse(text.split('\n\n')[1])
    const data = JSON.parse(parsed[0][2])
    const real = data?.[1]
    return typeof real === 'string' && /^https?:\/\//.test(real) ? real : link
  } catch {
    return link
  }
}

const BOILERPLATE =
  /(subscribe|sign up for|newsletter|all rights reserved|advertisement|click here|read more:|cookie|follow us on|copyright ©|privacy policy|terms of (use|service)|already a subscriber|create a free account|©\s?\d{4})/i

function metaContent(html: string, key: string, attr: 'property' | 'name' = 'property'): string {
  const re1 = new RegExp(`<meta[^>]+${attr}=["']${key}["'][^>]+content=["']([^"']*)["']`, 'i')
  const re2 = new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+${attr}=["']${key}["']`, 'i')
  return decodeEntities((html.match(re1)?.[1] || html.match(re2)?.[1] || '').trim())
}

function jsonLdBody(html: string): string {
  const blocks = html.match(/<script[^>]+type=["']application\/ld\+json["'][^>]*>[\s\S]*?<\/script>/gi) || []
  let best = ''
  const visit = (node: any) => {
    if (!node || typeof node !== 'object') return
    if (Array.isArray(node)) return node.forEach(visit)
    if (typeof node.articleBody === 'string' && node.articleBody.length > best.length) best = node.articleBody
    if (node['@graph']) visit(node['@graph'])
  }
  for (const b of blocks) {
    const inner = b.replace(/^<script[^>]*>/i, '').replace(/<\/script>$/i, '')
    try {
      visit(JSON.parse(inner))
    } catch {}
  }
  return decodeEntities(best).replace(/\s+/g, ' ').trim()
}

function paragraphsFrom(html: string): string[] {
  const out: string[] = []
  const re = /<p[^>]*>([\s\S]*?)<\/p>/gi
  let m: RegExpExecArray | null
  while ((m = re.exec(html))) {
    const t = decodeEntities(m[1].replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim()
    if (t.length >= 50 && !BOILERPLATE.test(t)) out.push(t)
  }
  return out
}

export function extractFromHtml(html: string, url: string): ExtractedArticle {
  const cleaned = html
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<(script|style|noscript|svg|iframe|form|template)[\s\S]*?<\/\1>/gi, '')

  const title =
    metaContent(cleaned, 'og:title') ||
    metaContent(cleaned, 'twitter:title', 'name') ||
    decodeEntities(cleaned.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || '').trim()
  const siteName = metaContent(cleaned, 'og:site_name')

  const stripped = cleaned.replace(/<(nav|footer|header|aside)[\s\S]*?<\/\1>/gi, '')
  const articleHtml = stripped.match(/<article[\s\S]*?<\/article>/i)?.[0]
  let paras = articleHtml ? paragraphsFrom(articleHtml) : []
  if (paras.join(' ').length < 600) paras = paragraphsFrom(stripped)
  // de-duplicate repeated paragraphs (common in sites that render twice)
  paras = paras.filter((p, i) => paras.indexOf(p) === i)

  let text = paras.join('\n\n')
  const ld = jsonLdBody(cleaned)
  if (ld.length > text.length * 1.2 && ld.length > 400) text = ld

  return {
    title: title.replace(/\s+[|\-–—]\s+[^|\-–—]{2,40}$/, '').trim() || title,
    text: text.trim(),
    url,
    siteName,
    paywalled: text.length < 500,
  }
}

export async function fetchArticle(inputUrl: string): Promise<ExtractedArticle> {
  const resolved = await resolveGoogleNewsUrl(inputUrl)
  if (new URL(resolved).hostname === 'news.google.com') {
    throw new Error('Could not open this Google News link. Open the article and paste its text instead.')
  }
  let page = await fetchPage(resolved)
  if (page.status >= 500) {
    // one polite retry for flaky servers
    await new Promise((r) => setTimeout(r, 600))
    page = await fetchPage(resolved)
  }
  if ([401, 402, 403, 406, 429, 451, 501].includes(page.status)) throw new BlockedError(page.status)
  if (page.status >= 400) throw new Error(`The site had a problem (${page.status}).`)
  return extractFromHtml(page.html, page.finalUrl)
}
