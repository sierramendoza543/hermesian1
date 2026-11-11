import { domainOf, lookupOutlet } from '@/lib/outlets'
import { categoryLabel, classifyAll } from '@/lib/categories'

// Short-form news videos (YouTube Shorts) from credible news channels.
// Each channel's Shorts page is read for its latest clips; the pool is cached,
// categorized by AI, and served in a fresh weighted-random order every time.

const CHANNELS: { handle: string; name: string; domain: string }[] = [
  { handle: 'ABCNews', name: 'ABC News', domain: 'abcnews.go.com' },
  { handle: 'BBCNews', name: 'BBC News', domain: 'bbc.com' },
  { handle: 'CNN', name: 'CNN', domain: 'cnn.com' },
  { handle: 'aljazeeraenglish', name: 'Al Jazeera English', domain: 'aljazeera.com' },
  { handle: 'nytimes', name: 'The New York Times', domain: 'nytimes.com' },
  { handle: 'PBSNewsHour', name: 'PBS NewsHour', domain: 'pbs.org' },
  { handle: 'washingtonpost', name: 'The Washington Post', domain: 'washingtonpost.com' },
  { handle: 'SkyNews', name: 'Sky News', domain: 'news.sky.com' },
  { handle: 'vox', name: 'Vox', domain: 'vox.com' },
  { handle: 'CBSNews', name: 'CBS News', domain: 'cbsnews.com' },
  { handle: 'wsj', name: 'The Wall Street Journal', domain: 'wsj.com' },
  { handle: 'DWNews', name: 'DW News', domain: 'dw.com' },
  { handle: 'FoxNews', name: 'Fox News', domain: 'foxnews.com' },
  { handle: 'Reuters', name: 'Reuters', domain: 'reuters.com' },
  { handle: 'AssociatedPress', name: 'Associated Press', domain: 'apnews.com' },
  { handle: 'CNBCtelevision', name: 'CNBC', domain: 'cnbc.com' },
  { handle: 'NBCNews', name: 'NBC News', domain: 'nbcnews.com' },
  { handle: 'NPR', name: 'NPR', domain: 'npr.org' },
  { handle: 'USATODAY', name: 'USA Today', domain: 'usatoday.com' },
  { handle: 'TheEconomist', name: 'The Economist', domain: 'economist.com' },
  { handle: 'FinancialTimes', name: 'Financial Times', domain: 'ft.com' },
  { handle: 'TIME', name: 'Time', domain: 'time.com' },
  { handle: 'theguardian', name: 'The Guardian', domain: 'theguardian.com' },
  { handle: 'politico', name: 'Politico', domain: 'politico.com' },
  { handle: 'axios', name: 'Axios', domain: 'axios.com' },
  { handle: 'euronews', name: 'Euronews', domain: 'euronews.com' },
  { handle: 'CBCNews', name: 'CBC News', domain: 'cbc.ca' },
  { handle: 'wired', name: 'Wired', domain: 'wired.com' },
  { handle: 'TheVerge', name: 'The Verge', domain: 'theverge.com' },
  { handle: 'NASA', name: 'NASA', domain: 'nasa.gov' },
  { handle: 'TheWeatherChannel', name: 'The Weather Channel', domain: 'weather.com' },
  { handle: 'NewsNation', name: 'NewsNation', domain: 'newsnationnow.com' },
  { handle: 'YahooNews', name: 'Yahoo News', domain: 'yahoo.com' },
  { handle: 'msnow', name: 'MS NOW', domain: 'ms.now' },
  { handle: 'BusinessInsider', name: 'Business Insider', domain: 'businessinsider.com' },
  { handle: 'nbcnightlynews', name: 'NBC Nightly News', domain: 'nbcnews.com' },
]

export interface NewsVideo {
  id: string
  title: string
  channel: string
  domain: string
  outlet: string | null
  lean: number | null
  thumbnail: string
  views: string
  categoryKey: string
  category: string
  rank: number
}

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36'
const PER_CHANNEL = 14

function cleanTitle(raw: string): string {
  let t = raw
  try {
    t = JSON.parse(`"${raw}"`)
  } catch {}
  return t
    .replace(/\s*(#\w+\s*)+$/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

async function scrapeChannel(ch: (typeof CHANNELS)[number]): Promise<Omit<NewsVideo, 'categoryKey' | 'category'>[]> {
  const res = await fetch(`https://www.youtube.com/@${ch.handle}/shorts`, {
    headers: { 'User-Agent': UA, 'Accept-Language': 'en-US,en;q=0.9', Cookie: 'CONSENT=YES+1; SOCS=CAI' },
    signal: AbortSignal.timeout(14_000),
    cache: 'no-store',
  })
  if (!res.ok) return []
  const html = await res.text()
  const outlet = lookupOutlet(ch.name, `https://${ch.domain}`)
  const out: Omit<NewsVideo, 'categoryKey' | 'category'>[] = []
  const seen = new Set<string>()
  const re = /"shortsLockupViewModel":\{"entityId":"shorts-shelf-item-([A-Za-z0-9_-]{11})","accessibilityText":"((?:[^"\\]|\\.)*)"/g
  let m: RegExpExecArray | null
  while ((m = re.exec(html)) && out.length < PER_CHANNEL) {
    const id = m[1]
    if (seen.has(id)) continue
    seen.add(id)
    const a = cleanTitle(m[2]).replace(/^Watch:\s*/i, '')
    const parts = a.match(/^(.*?),\s*([\d.,]+\s?(?:thousand|million|billion)?|No)\s+views?\s*-\s*play Short$/i)
    const title = (parts ? parts[1] : a.replace(/\s*-\s*play Short$/i, '')).replace(/\s*(#\w+\s*)+$/g, '').trim()
    if (!title || title.length < 8) continue
    out.push({
      id,
      title,
      channel: ch.name,
      domain: outlet?.domain || domainOf(`https://${ch.domain}`),
      outlet: outlet?.name || null,
      lean: outlet ? outlet.lean : null,
      thumbnail: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
      views: parts ? parts[2] : '',
      rank: out.length,
    })
  }
  return out
}

const TTL = 20 * 60 * 1000
let cache: { at: number; videos: NewsVideo[]; complete: boolean } | null = null
let refreshing: Promise<void> | null = null

async function loadPhase(channels: typeof CHANNELS): Promise<NewsVideo[]> {
  const raw: Omit<NewsVideo, 'categoryKey' | 'category'>[] = []
  const batch = await Promise.all(channels.map((c) => scrapeChannel(c).catch(() => [])))
  raw.push(...batch.flat())
  if (raw.length === 0) return []
  let out: NewsVideo[] = []
  const cats = await classifyAll(raw.map((v) => ({ id: v.id, text: v.title })), {
    budgetMs: 2500,
    onLate: (late) => {
      for (const v of out) {
        v.categoryKey = late[v.id] || v.categoryKey
        v.category = categoryLabel(v.categoryKey)
      }
    },
  })
  out = raw.map((v) => ({ ...v, categoryKey: cats[v.id], category: categoryLabel(cats[v.id]) }))
  return out
}

const waiters: (() => void)[] = []

/** Fill the pool: a quick first slice so the feed opens fast, then the rest in the background. */
function startRefresh(onFirst?: () => void) {
  if (onFirst) waiters.push(onFirst)
  if (refreshing) return
  refreshing = (async () => {
    const first = await loadPhase(CHANNELS.slice(0, 8))
    if (first.length && !cache) {
      cache = { at: Date.now(), videos: first, complete: false }
      waiters.splice(0).forEach((w) => w())
    }
    const rest = await loadPhase(CHANNELS.slice(8))
    const all = [...first, ...rest]
    if (all.length) cache = { at: Date.now(), videos: all, complete: true }
  })()
    .catch((e) => console.warn('[videos] refresh failed:', String(e).slice(0, 100)))
    .finally(() => {
      refreshing = null
      waiters.splice(0).forEach((w) => w())
    })
}

export async function getVideoPool(): Promise<NewsVideo[]> {
  const snapshot = () => cache
  const now = snapshot()
  if (!(now && now.complete && Date.now() - now.at < TTL)) startRefresh()
  if (now) return now.videos // stale-while-revalidate
  await new Promise<void>((resolve) => startRefresh(resolve))
  const ready = snapshot()
  if (!ready) throw new Error('No videos available')
  return ready.videos
}

/** A fresh weighted-random page, skipping what the viewer has already seen. */
export async function pickVideos(opts: { category: string; seen: Set<string>; count: number }) {
  const pool = await getVideoPool()
  const inCat = opts.category === 'all' ? pool : pool.filter((v) => v.categoryKey === opts.category)
  let fresh = inCat.filter((v) => !opts.seen.has(v.id))
  const recycled = fresh.length < opts.count
  if (recycled) fresh = inCat // everything seen: start another lap

  // Weighted shuffle: newer clips (low rank) come up more often
  const keyed = fresh.map((v) => ({ v, k: Math.pow(Math.random(), 1 / (1 / (1 + v.rank * 0.18))) }))
  keyed.sort((a, b) => b.k - a.k)

  // Avoid back-to-back clips from the same channel
  const picked: NewsVideo[] = []
  const rest = keyed.map((x) => x.v)
  while (picked.length < opts.count && rest.length) {
    const last = picked[picked.length - 1]?.channel
    let i = rest.findIndex((v) => v.channel !== last)
    if (i === -1) i = 0
    picked.push(rest.splice(i, 1)[0])
  }

  const counts: Record<string, number> = {}
  for (const v of pool) counts[v.categoryKey] = (counts[v.categoryKey] || 0) + 1
  return { videos: picked, recycled, counts, total: pool.length }
}
