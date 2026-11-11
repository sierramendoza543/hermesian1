// Approximate editorial-lean ratings for news outlets.
//
// IMPORTANT: these are simplified, contested approximations. They are
// synthesized from the general consensus of public media-bias rating projects
// (e.g. AllSides, Ad Fontes Media, Media Bias/Fact Check) and describe an
// outlet's *typical* editorial lean, not the slant of any individual article.
// Scale: -100 (far left) .. 0 (center) .. +100 (far right).

export type LeanBucket = 'left' | 'lean-left' | 'center' | 'lean-right' | 'right'

export interface Outlet {
  name: string
  domain: string
  lean: number
  /** Reporting reliability tier, loosely modeled on public rating projects. */
  reliability: 'high' | 'good' | 'mixed' | 'low'
  kind: 'wire' | 'broadcast' | 'newspaper' | 'digital' | 'opinion' | 'business' | 'tech'
  aliases?: string[]
}

export const OUTLET_DISCLAIMER =
  'Outlet positions are approximate editorial-lean ratings synthesized from public media-bias projects (AllSides, Ad Fontes Media, Media Bias/Fact Check). They are simplified, debated, and describe an outlet\'s typical lean — not any single article.'

export const BUCKET_META: Record<LeanBucket, { label: string; short: string; color: string; range: [number, number] }> = {
  left: { label: 'Left', short: 'L', color: '#1d4ed8', range: [-100, -60] },
  'lean-left': { label: 'Lean Left', short: 'LL', color: '#60a5fa', range: [-60, -20] },
  center: { label: 'Center', short: 'C', color: '#8b8b99', range: [-20, 20] },
  'lean-right': { label: 'Lean Right', short: 'LR', color: '#f97316', range: [20, 60] },
  right: { label: 'Right', short: 'R', color: '#b91c1c', range: [60, 100] },
}

export const BUCKET_ORDER: LeanBucket[] = ['left', 'lean-left', 'center', 'lean-right', 'right']

export function leanBucket(lean: number): LeanBucket {
  if (lean <= -60) return 'left'
  if (lean < -20) return 'lean-left'
  if (lean <= 20) return 'center'
  if (lean < 60) return 'lean-right'
  return 'right'
}

export function leanLabel(lean: number): string {
  return BUCKET_META[leanBucket(lean)].label
}

export function leanColor(lean: number): string {
  // Smooth blue -> gray -> red ramp for markers
  const t = Math.max(-100, Math.min(100, lean)) / 100
  const lerp = (a: number, b: number, k: number) => Math.round(a + (b - a) * k)
  const mid = [139, 139, 153]
  const left = [29, 78, 216]
  const right = [185, 28, 28]
  const [from, to, k] = t < 0 ? [left, mid, t + 1] : [mid, right, t]
  return `rgb(${lerp(from[0], to[0], k)}, ${lerp(from[1], to[1], k)}, ${lerp(from[2], to[2], k)})`
}

const O = (
  name: string,
  domain: string,
  lean: number,
  reliability: Outlet['reliability'],
  kind: Outlet['kind'],
  aliases: string[] = []
): Outlet => ({ name, domain, lean, reliability, kind, aliases })

export const OUTLETS: Outlet[] = [
  // Left
  O('Jacobin', 'jacobin.com', -95, 'mixed', 'opinion'),
  O('Mother Jones', 'motherjones.com', -85, 'good', 'opinion'),
  O('The Nation', 'thenation.com', -88, 'mixed', 'opinion'),
  O('HuffPost', 'huffpost.com', -75, 'mixed', 'digital', ['huffington post']),
  O('MS NOW', 'ms.now', -70, 'mixed', 'broadcast', ['msnbc', 'ms now']),
  O('MSNBC', 'msnbc.com', -70, 'mixed', 'broadcast'),
  O('Salon', 'salon.com', -75, 'mixed', 'opinion'),
  O('Daily Kos', 'dailykos.com', -90, 'low', 'opinion'),
  O('The Daily Beast', 'thedailybeast.com', -60, 'mixed', 'digital', ['daily beast']),
  O('Slate', 'slate.com', -62, 'good', 'opinion', ['slate magazine']),
  O('Vox', 'vox.com', -55, 'good', 'digital'),
  O('The New Republic', 'newrepublic.com', -70, 'good', 'opinion'),
  O('Rolling Stone', 'rollingstone.com', -60, 'mixed', 'digital'),
  O('The Intercept', 'theintercept.com', -65, 'good', 'digital'),
  O('Democracy Now!', 'democracynow.org', -80, 'mixed', 'broadcast', ['democracy now']),
  // Lean left
  O('The Guardian', 'theguardian.com', -45, 'good', 'newspaper'),
  O('The New York Times', 'nytimes.com', -35, 'high', 'newspaper', ['new york times', 'nyt']),
  O('The Washington Post', 'washingtonpost.com', -35, 'high', 'newspaper', ['washington post']),
  O('CNN', 'cnn.com', -35, 'good', 'broadcast', ['cnn international']),
  O('The Atlantic', 'theatlantic.com', -35, 'high', 'newspaper'),
  O('The New Yorker', 'newyorker.com', -50, 'high', 'newspaper'),
  O('NBC News', 'nbcnews.com', -25, 'good', 'broadcast'),
  O('NPR', 'npr.org', -25, 'high', 'broadcast'),
  O('Time', 'time.com', -25, 'good', 'newspaper'),
  O('Los Angeles Times', 'latimes.com', -30, 'good', 'newspaper', ['la times']),
  O('The Boston Globe', 'bostonglobe.com', -30, 'good', 'newspaper', ['boston globe']),
  O('Vanity Fair', 'vanityfair.com', -45, 'mixed', 'digital'),
  O('Wired', 'wired.com', -30, 'good', 'tech'),
  O('The Verge', 'theverge.com', -30, 'good', 'tech'),
  O('Business Insider', 'businessinsider.com', -20, 'good', 'business', ['insider']),
  O('Al Jazeera', 'aljazeera.com', -20, 'good', 'broadcast', ['al jazeera english']),
  O('USA Today', 'usatoday.com', -15, 'good', 'newspaper'),
  O('ABC News', 'abcnews.go.com', -20, 'good', 'broadcast', ['abc news - breaking news, latest news and videos']),
  O('Newsweek', 'newsweek.com', -15, 'mixed', 'digital'),
  O('Politico', 'politico.com', -12, 'high', 'digital', ['politico.eu']),
  // Center
  O('CBS News', 'cbsnews.com', -12, 'good', 'broadcast'),
  O('PBS NewsHour', 'pbs.org', -12, 'high', 'broadcast', ['pbs', 'pbs news']),
  O('BBC', 'bbc.com', -10, 'high', 'broadcast', ['bbc news', 'bbc.co.uk']),
  O('Axios', 'axios.com', -8, 'high', 'digital'),
  O('Yahoo News', 'yahoo.com', -5, 'good', 'digital', ['yahoo', 'yahoo news', 'yahoo finance']),
  O('Semafor', 'semafor.com', -5, 'good', 'digital'),
  O('Bloomberg', 'bloomberg.com', -5, 'high', 'business', ['bloomberg.com']),
  O('CNBC', 'cnbc.com', -5, 'good', 'business'),
  O('Associated Press', 'apnews.com', -5, 'high', 'wire', ['ap news', 'ap', 'the associated press']),
  O('Reuters', 'reuters.com', -3, 'high', 'wire'),
  O('The Hill', 'thehill.com', 5, 'good', 'digital'),
  O('Financial Times', 'ft.com', 0, 'high', 'business'),
  O('The Economist', 'economist.com', 5, 'high', 'newspaper'),
  O('Christian Science Monitor', 'csmonitor.com', 0, 'high', 'newspaper', ['the christian science monitor']),
  O('NewsNation', 'newsnationnow.com', 5, 'good', 'broadcast'),
  O('Fortune', 'fortune.com', 5, 'good', 'business'),
  O('MarketWatch', 'marketwatch.com', 5, 'good', 'business'),
  O('The Weather Channel', 'weather.com', 0, 'high', 'broadcast'),
  O('Forbes', 'forbes.com', 15, 'mixed', 'business'),
  O('Chicago Tribune', 'chicagotribune.com', 15, 'good', 'newspaper'),
  // Lean right
  O('The Wall Street Journal', 'wsj.com', 32, 'high', 'newspaper', ['wsj', 'wall street journal']),
  O('The Dispatch', 'thedispatch.com', 40, 'good', 'digital'),
  O('Reason', 'reason.com', 52, 'good', 'opinion'),
  O('Fox Business', 'foxbusiness.com', 55, 'mixed', 'broadcast'),
  O('New York Post', 'nypost.com', 58, 'mixed', 'newspaper', ['ny post']),
  O('The Washington Times', 'washingtontimes.com', 62, 'mixed', 'newspaper', ['washington times']),
  O('FOX Weather', 'foxweather.com', 40, 'good', 'broadcast'),
  // Right
  O('Fox News', 'foxnews.com', 75, 'mixed', 'broadcast', ['fox news channel']),
  O('National Review', 'nationalreview.com', 75, 'good', 'opinion'),
  O('Washington Examiner', 'washingtonexaminer.com', 70, 'mixed', 'digital'),
  O('Daily Caller', 'dailycaller.com', 80, 'mixed', 'digital'),
  O('The Epoch Times', 'theepochtimes.com', 80, 'low', 'digital', ['epoch times']),
  O('Newsmax', 'newsmax.com', 85, 'low', 'broadcast'),
  O('The Blaze', 'theblaze.com', 85, 'low', 'digital'),
  O('The Federalist', 'thefederalist.com', 90, 'low', 'opinion'),
  O('The Daily Wire', 'dailywire.com', 90, 'low', 'opinion', ['daily wire']),
  O('Breitbart', 'breitbart.com', 95, 'low', 'digital', ['breitbart news']),
  O('One America News', 'oann.com', 95, 'low', 'broadcast', ['oan', 'oann']),
]

function norm(s: string): string {
  return s.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '')
}

const byName = new Map<string, Outlet>()
const byDomain = new Map<string, Outlet>()
for (const o of OUTLETS) {
  byName.set(norm(o.name), o)
  for (const a of o.aliases || []) byName.set(norm(a), o)
  byDomain.set(o.domain, o)
}

export function domainOf(url?: string | null): string {
  if (!url) return ''
  try {
    return new URL(url).hostname.toLowerCase().replace(/^(www|m|amp|edition)\./, '')
  } catch {
    return ''
  }
}

/** Find a rated outlet from a source name and/or its homepage/article URL. */
export function lookupOutlet(sourceName?: string, url?: string): Outlet | null {
  const domain = domainOf(url)
  if (domain) {
    const direct = byDomain.get(domain)
    if (direct) return direct
    const parts = domain.split('.')
    for (let i = 1; i < parts.length - 1; i++) {
      const hit = byDomain.get(parts.slice(i).join('.'))
      if (hit) return hit
    }
  }
  if (sourceName) {
    const hit = byName.get(norm(sourceName))
    if (hit) return hit
  }
  return null
}

/** Outlets that usually block automated reading, so the analyzer will ask for pasted text. */
const PAYWALLED = new Set(['nytimes.com', 'washingtonpost.com', 'wsj.com', 'ft.com', 'economist.com', 'bloomberg.com', 'theatlantic.com', 'newyorker.com', 'newsweek.com'])
export const isPaywalled = (domain: string) => PAYWALLED.has(domain)

export function faviconUrl(domain: string, size = 64): string {
  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=${size}`
}
