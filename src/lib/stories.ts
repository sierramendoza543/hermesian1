import { createHash } from 'node:crypto'
import { parseStringPromise } from 'xml2js'
import { CATEGORIES, categoryLabel, classifyAll } from '@/lib/categories'
import { BUCKET_ORDER, LeanBucket, domainOf, leanBucket, lookupOutlet } from '@/lib/outlets'

// Builds multi-source "stories" from Google News. Google already groups
// coverage of the same event; we parse those groups, merge duplicates across
// topic feeds, cluster stray single articles by headline similarity, and
// attach an outlet-lean rating to every source.

export interface StoryArticle {
  title: string
  url: string
  source: string
  domain: string
  publishedAt?: string
  outlet: string | null
  lean: number | null
  bucket: LeanBucket | null
  reliability: string | null
}

export interface Story {
  id: string
  headline: string
  category: string
  categoryKey: string
  publishedAt: string
  sourceCount: number
  ratedCount: number
  avgLean: number | null
  spectrum: Record<LeanBucket, number>
  articles: StoryArticle[]
  score: number
  isTop: boolean
  tags: string[]
}

export { CATEGORIES }

const GN = 'hl=en-US&gl=US&ceid=US:en'
const TOPIC = (t: string) => `https://news.google.com/rss/headlines/section/topic/${t}?${GN}`
const SEARCH = (q: string) => `https://news.google.com/rss/search?q=${encodeURIComponent(q)}&${GN}`

const FEEDS: { key: string; url: string; grouped: boolean }[] = [
  { key: 'top', url: `https://news.google.com/rss?${GN}`, grouped: true },
  { key: 'world', url: TOPIC('WORLD'), grouped: true },
  { key: 'us', url: TOPIC('NATION'), grouped: true },
  { key: 'business', url: TOPIC('BUSINESS'), grouped: true },
  { key: 'tech', url: TOPIC('TECHNOLOGY'), grouped: true },
  { key: 'science', url: TOPIC('SCIENCE'), grouped: true },
  { key: 'health', url: TOPIC('HEALTH'), grouped: true },
  { key: 'sports', url: TOPIC('SPORTS'), grouped: true },
  { key: 'entertainment', url: TOPIC('ENTERTAINMENT'), grouped: true },
  { key: 'politics', url: SEARCH('politics OR Congress OR White House OR election when:1d'), grouped: false },
  { key: 'climate', url: SEARCH('weather OR climate OR hurricane OR wildfire OR storm OR flooding when:1d'), grouped: false },
  { key: 'science', url: SEARCH('NASA OR scientists OR astronomers OR researchers OR new study when:1d'), grouped: false },
  { key: 'health', url: SEARCH('health OR FDA OR CDC OR vaccine OR hospital OR disease when:1d'), grouped: false },
  { key: 'justice', url: SEARCH('court OR judge OR trial OR indicted OR sentenced OR lawsuit when:1d'), grouped: false },
  { key: 'world', url: SEARCH('Ukraine OR Gaza OR China OR Europe OR Middle East OR diplomats when:1d'), grouped: false },
]

const STOPWORDS = new Set(
  'the and for with that this from have has had are was were will would could should about after before over into than then them they their there what when where which while who whom whose why how says said say new more most less just also not but its his her him she you your out off all any can may might one two get gets got per via amid among against between during until since than too very'.split(
    ' '
  )
)

export function tokens(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 2 && !STOPWORDS.has(w))
  )
}

export function similarity(a: Set<string>, b: Set<string>): { jaccard: number; shared: number } {
  let shared = 0
  for (const t of a) if (b.has(t)) shared++
  const union = a.size + b.size - shared
  return { jaccard: union ? shared / union : 0, shared }
}

interface RawArticle {
  title: string
  url: string
  source: string
  domain: string
  publishedAt?: string
}

interface Cluster {
  articles: RawArticle[]
  categoryKey: string
  topRank: number | null
  tokenSet: Set<string>
  guids: Set<string>
}

function cleanTitle(title: string, source: string): string {
  const t = title.replace(/\s*(#\w+\s*)+$/g, '').replace(/\s+/g, ' ').trim()
  if (source && t.toLowerCase().endsWith(` - ${source.toLowerCase()}`)) return t.slice(0, -(source.length + 3)).trim()
  const idx = t.lastIndexOf(' - ')
  if (idx > 20 && t.length - idx < 45) return t.slice(0, idx).trim()
  return t
}

function decode(html: string): string {
  return html
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
}

function guidOf(url: string): string {
  try {
    return new URL(url).pathname.split('/').pop() || url
  } catch {
    return url
  }
}

async function fetchFeed(url: string): Promise<any[]> {
  let lastError: unknown = new Error('Feed failed')
  for (let attempt = 0; attempt < 2; attempt++) {
    if (attempt) await new Promise((r) => setTimeout(r, 400))
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Hermesian/1.0)' },
        signal: AbortSignal.timeout(12_000),
        next: { revalidate: 600 },
      } as RequestInit)
      if (!res.ok) throw new Error(`Feed ${res.status}`)
      const parsed = await parseStringPromise(await res.text())
      return parsed?.rss?.channel?.[0]?.item || []
    } catch (err) {
      lastError = err
    }
  }
  throw lastError
}

function parseItem(item: any, grouped: boolean): RawArticle[] {
  const rawTitle: string = item.title?.[0] || ''
  const link: string = item.link?.[0] || ''
  const sourceNode = item.source?.[0]
  const source: string = (typeof sourceNode === 'string' ? sourceNode : sourceNode?._) || ''
  const sourceUrl: string = sourceNode?.$?.url || ''
  const publishedAt = item.pubDate?.[0] ? new Date(item.pubDate[0]).toISOString() : undefined
  if (/youtube/i.test(source) || /#shorts?\b/i.test(rawTitle)) return [] // video uploads aren't news stories
  const lead: RawArticle = {
    title: cleanTitle(rawTitle, source),
    url: link,
    source,
    domain: domainOf(sourceUrl),
    publishedAt,
  }
  const out: RawArticle[] = [lead]
  if (grouped) {
    const desc = decode(item.description?.[0] || '')
    const re = /<li><a href="([^"]+)"[^>]*>(.*?)<\/a>.*?<font color="#6f6f6f">(.*?)<\/font><\/li>/gs
    let m: RegExpExecArray | null
    while ((m = re.exec(desc))) {
      const [, href, title, src] = m
      if (src.trim().toLowerCase() === source.toLowerCase()) continue
      out.push({ title: decode(title).trim(), url: href, source: decode(src).trim(), domain: '', publishedAt })
    }
  }
  return out.filter((a) => a.title && a.url)
}

function makeCluster(articles: RawArticle[], categoryKey: string, topRank: number | null): Cluster {
  const tokenSet = new Set<string>()
  for (const a of articles) for (const t of tokens(a.title)) tokenSet.add(t)
  return { articles, categoryKey, topRank, tokenSet, guids: new Set(articles.map((a) => guidOf(a.url))) }
}

function matches(a: Cluster, b: Cluster): boolean {
  for (const g of b.guids) if (a.guids.has(g)) return true
  const leadA = tokens(a.articles[0].title)
  const leadB = tokens(b.articles[0].title)
  const lead = similarity(leadA, leadB)
  if (lead.jaccard >= 0.5 || lead.shared >= 5) return true
  // Any member headline of b very close to the lead of a
  for (const art of b.articles.slice(1, 4)) {
    const s = similarity(leadA, tokens(art.title))
    if (s.jaccard >= 0.55) return true
  }
  return false
}

function merge(into: Cluster, from: Cluster) {
  const seen = new Set(into.articles.map((a) => a.source.toLowerCase()))
  for (const a of from.articles) {
    const key = a.source.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    into.articles.push(a)
  }
  for (const t of from.tokenSet) into.tokenSet.add(t)
  for (const g of from.guids) into.guids.add(g)
  if (into.categoryKey === 'top' && from.categoryKey !== 'top') into.categoryKey = from.categoryKey
  if (from.topRank !== null && (into.topRank === null || from.topRank < into.topRank)) into.topRank = from.topRank
}

function dedupeBySource(articles: RawArticle[]): RawArticle[] {
  const seen = new Set<string>()
  return articles.filter((a) => {
    const key = (a.source || a.domain).toLowerCase()
    if (!key || seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function toStory(c: Cluster): Story {
  const raw = dedupeBySource(c.articles)
  const articles: StoryArticle[] = raw.map((a) => {
    const outlet = lookupOutlet(a.source, a.domain ? `https://${a.domain}` : undefined)
    return {
      title: a.title,
      url: a.url,
      source: a.source,
      domain: outlet?.domain || a.domain,
      publishedAt: a.publishedAt,
      outlet: outlet?.name || null,
      lean: outlet ? outlet.lean : null,
      bucket: outlet ? leanBucket(outlet.lean) : null,
      reliability: outlet?.reliability || null,
    }
  })
  const rated = articles.filter((a) => a.lean !== null)
  const spectrum = Object.fromEntries(BUCKET_ORDER.map((b) => [b, 0])) as Record<LeanBucket, number>
  for (const a of rated) spectrum[a.bucket as LeanBucket]++
  const avgLean = rated.length ? Math.round(rated.reduce((s, a) => s + (a.lean as number), 0) / rated.length) : null
  const dates = articles.map((a) => (a.publishedAt ? Date.parse(a.publishedAt) : 0)).filter(Boolean)
  const publishedAt = new Date(dates.length ? Math.max(...dates) : Date.now()).toISOString()
  const hoursOld = (Date.now() - Date.parse(publishedAt)) / 3_600_000
  const score =
    articles.length * 3 + (c.topRank !== null ? Math.max(0, 24 - c.topRank * 0.6) : 0) - Math.min(20, hoursOld * 0.6)
  const headline = articles[0].title
  const id = createHash('sha1').update(tokensKey(headline)).digest('hex').slice(0, 12)
  const cat = CATEGORIES.find((x) => x.key === c.categoryKey) || CATEGORIES[0]
  return {
    id,
    headline,
    category: cat.label,
    categoryKey: cat.key,
    publishedAt,
    sourceCount: articles.length,
    ratedCount: rated.length,
    avgLean,
    spectrum,
    articles,
    score,
    isTop: c.topRank !== null,
    tags: [cat.key],
  }
}


function tokensKey(headline: string): string {
  return [...tokens(headline)].sort().join(' ')
}

function buildClusters(feedResults: { key: string; grouped: boolean; items: any[] }[]): Cluster[] {
  const clusters: Cluster[] = []
  for (const feed of feedResults) {
    feed.items.forEach((item, idx) => {
      const articles = parseItem(item, feed.grouped)
      if (!articles.length) return
      const c = makeCluster(articles, feed.key, feed.key === 'top' ? idx : null)
      const existing = clusters.find((x) => matches(x, c))
      if (existing) merge(existing, c)
      else clusters.push(c)
    })
  }
  return clusters
}

function mergeSimilar(clusters: Cluster[]): Cluster[] {
  const out: Cluster[] = []
  for (const c of clusters) {
    const twin = out.find((o) => {
      const sim = similarity(o.tokenSet, c.tokenSet)
      return sim.jaccard >= 0.4 && sim.shared >= 6
    })
    if (twin) merge(twin, c)
    else out.push(c)
  }
  return out
}

const TTL_MS = 12 * 60 * 1000
let cache: { at: number; stories: Story[] } | null = null
let inflight: Promise<Story[]> | null = null

async function loadStories(): Promise<Story[]> {
  const settled = await Promise.allSettled(
    FEEDS.map(async (f) => ({ key: f.key, grouped: f.grouped, items: await fetchFeed(f.url) }))
  )
  const results = settled.flatMap((s) => (s.status === 'fulfilled' ? [s.value] : []))
  if (results.length === 0) throw new Error('Could not reach any news feeds')
  const merged = mergeSimilar(buildClusters(results))
  let stories = merged
    .map(toStory)
    .filter((s) => s.sourceCount >= 2)
    .sort((a, b) => b.score - a.score)
  const seen = new Set<string>()
  stories = stories.filter((s) => (seen.has(s.id) ? false : (seen.add(s.id), true))).slice(0, 320)

  // One category per story, decided by AI (keywords / feed topic as fallback)
  const apply = (cats: Record<string, string>) => {
    for (const s of stories) {
      s.categoryKey = cats[s.id] || s.categoryKey
      s.category = categoryLabel(s.categoryKey)
      s.tags = [s.categoryKey]
    }
  }
  // Wait briefly for the AI; if it's slow, ship keyword categories now and upgrade them in place when it finishes
  const cats = await classifyAll(
    stories.map((s) => ({ id: s.id, text: s.headline, hint: s.categoryKey })),
    { budgetMs: 3000, onLate: apply }
  )
  apply(cats)
  return stories
}

function refreshStories(): Promise<Story[]> {
  if (!inflight) {
    inflight = loadStories()
      .then((stories) => {
        cache = { at: Date.now(), stories }
        return stories
      })
      .catch((err) => {
        if (cache) return cache.stories // keep serving the last good copy
        throw err
      })
      .finally(() => {
        inflight = null
      })
  }
  return inflight
}

/** Stale-while-revalidate: a cached copy is returned instantly, even when it's old; the refresh happens behind the scenes. */
export async function getAllStories(): Promise<Story[]> {
  if (cache) {
    if (Date.now() - cache.at > TTL_MS) refreshStories().catch(() => {})
    return cache.stories
  }
  return refreshStories()
}

export async function getStoryById(id: string): Promise<Story | null> {
  const stories = await getAllStories()
  return stories.find((s) => s.id === id) || null
}

const crudeStem = (w: string) => (w.length > 5 ? w.replace(/(ing|ed|es|s)$/, '') : w)

/** Story search: every result must actually contain most of what you searched for. */
export async function searchStories(query: string): Promise<Story[]> {
  const q = query.trim().slice(0, 120)
  if (!q) return []
  const qTokens = [...tokens(q)]
  if (qTokens.length === 0) return []
  const qStems = qTokens.map(crudeStem)
  const need = qTokens.length <= 2 ? qTokens.length : Math.max(2, Math.ceil(qTokens.length * 0.6))

  const matchCount = (s: Story): number => {
    const hay = new Set([...tokens([s.headline, ...s.articles.map((a) => a.title)].join(' '))].map(crudeStem))
    let m = 0
    for (const t of qStems) if (hay.has(t)) m++
    return m
  }

  const all = await getAllStories().catch(() => [] as Story[])
  const local = all.map((s) => ({ s, m: matchCount(s) })).filter((x) => x.m >= need)

  // Ask Google News too, using the strongest handful of words
  let remote: { s: Story; m: number }[] = []
  try {
    const items = await fetchFeed(SEARCH(`${qTokens.slice(0, 6).join(' ')} when:7d`))
    const clusters = mergeSimilar(buildClusters([{ key: 'top', grouped: false, items: items.slice(0, 80) }]))
    const found = clusters.map(toStory).map((s) => ({ s, m: matchCount(s) })).filter((x) => x.m >= need)
    let multi = found.filter((x) => x.s.sourceCount >= 2)
    if (multi.length < 3) multi = found // few results: show single-outlet stories too
    remote = multi
    const cats = await classifyAll(remote.map((x) => ({ id: x.s.id, text: x.s.headline, hint: x.s.categoryKey })))
    for (const x of remote) {
      x.s.categoryKey = cats[x.s.id] || x.s.categoryKey
      x.s.category = categoryLabel(x.s.categoryKey)
      x.s.tags = [x.s.categoryKey]
    }
  } catch (err) {
    console.warn('Story search feed failed', err)
  }

  const seen = new Set<string>()
  return [...local, ...remote]
    .filter((x) => (seen.has(x.s.id) ? false : (seen.add(x.s.id), true)))
    .sort((a, b) => b.m - a.m || b.s.sourceCount - a.s.sourceCount || Date.parse(b.s.publishedAt) - Date.parse(a.s.publishedAt))
    .map((x) => x.s)
}
