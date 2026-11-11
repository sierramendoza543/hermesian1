import { generateJSON } from '@/lib/llm'

// One category system for stories AND videos. Every item gets exactly one.

export const CATEGORIES = [
  { key: 'top', label: 'Top Stories' },
  { key: 'politics', label: 'Politics' },
  { key: 'us', label: 'U.S.' },
  { key: 'world', label: 'World' },
  { key: 'business', label: 'Business' },
  { key: 'tech', label: 'Tech & AI' },
  { key: 'science', label: 'Science' },
  { key: 'health', label: 'Health' },
  { key: 'climate', label: 'Climate & Weather' },
  { key: 'justice', label: 'Law & Courts' },
  { key: 'sports', label: 'Sports' },
  { key: 'entertainment', label: 'Culture' },
] as const

export type CategoryKey = (typeof CATEGORIES)[number]['key']

const REAL_KEYS = CATEGORIES.filter((c) => c.key !== 'top').map((c) => c.key as string)
export const categoryLabel = (key: string) => CATEGORIES.find((c) => c.key === key)?.label || 'News'

const KEYWORDS: [string, RegExp][] = [
  ['sports', /\b(nfl|nba|mlb|nhl|wnba|ncaa|soccer|football|basketball|baseball|hockey|world cup|olympics?|super bowl|playoffs?|quarterback|coach|touchdown|premier league|tennis|golf|formula 1|f1|ufc|boxing|champion(ship)?s?|bracket)\b/i],
  ['entertainment', /\b(movie|film|box office|music|oscars?|grammys?|emmys?|celebrity|album|netflix|hollywood|actor|actress|singer|concert|tv show|streaming|taylor swift|broadway|festival|trailer|book|author)\b/i],
  ['climate', /\b(climate|hurricane|storm|tornado|wildfire|flood(ing)?|heat wave|snow(storm)?|blizzard|weather|forecast|emissions|drought|earthquake|nor'?easter|wintry|rain)\b/i],
  ['health', /\b(health|covid|vaccines?|cancer|hospital|disease|virus|fda|cdc|medical|doctors?|obesity|glp-1|ozempic|drug|outbreak|mental health|medicare|medicaid|surgery)\b/i],
  ['tech', /\b(ai|artificial intelligence|openai|chatgpt|tech|apple|google|microsoft|nvidia|chips?|cyber|hack(ers?|ed)?|robot|software|tesla|meta|amazon|spacex|startup|smartphone|iphone|algorithm|data center|crypto|bitcoin)\b/i],
  ['science', /\b(nasa|space|scientists?|study finds|research(ers)?|planet|moon|mars|species|astronaut|telescope|fossil|physics|dinosaur|discovery)\b/i],
  ['justice', /\b(court|judge|trial|lawsuit|sues?|sued|indicted|indictment|sentenced|verdict|prosecutors?|arrest(ed)?|police|shooting|murder|killed|fbi|doj|justice department|jury|appeals|charged|suspect|prison)\b/i],
  ['business', /\b(market|stocks?|economy|economic|inflation|fed|interest rates?|tariffs?|earnings|bank|trade|jobs report|unemployment|oil|prices?|wall street|dollar|company|ceo|merger|layoffs?|retail|housing|mortgage|gdp)\b/i],
  ['politics', /\b(trump|biden|vance|harris|congress|senate|senator|house (republicans|democrats|speaker)|republicans?|democrats?|democratic|gop|white house|election|ballot|impeach\w*|supreme court justice|governor|legislat\w+|lawmakers?|campaign|primary|filibuster|cabinet|pentagon|hegseth|schumer|pelosi|thune|mcconnell|veto|executive order|midterms?)\b/i],
  ['world', /\b(ukraine|russia|putin|gaza|israel|hamas|china|xi jinping|iran|nato|un security|europe|ceasefire|prime minister|kremlin|taiwan|north korea|india|pakistan|syria|lebanon|african|middle east|pope|g7|g20|eu\b)/i],
]

export function keywordCategory(text: string): string | null {
  for (const [key, re] of KEYWORDS) if (re.test(text)) return key
  return null
}

const cache = new Map<string, string>()
const norm = (t: string) => t.toLowerCase().replace(/[^a-z0-9 ]/g, '').slice(0, 90)

export interface ClassifyInput {
  id: string
  text: string
  /** The feed topic the item came from, used as a weak prior. */
  hint?: string
}

async function classifyChunk(items: ClassifyInput[]): Promise<void> {
  const lines = items.map((it, i) => `${i + 1}. ${it.text.slice(0, 150)}${it.hint && it.hint !== 'top' ? `  [feed: ${it.hint}]` : ''}`).join('\n')
  const { data } = await generateJSON<{ labels: string[] }>({
    system: 'You are a news desk editor who files each headline under exactly one section.',
    prompt: `Sections (use the key):
- politics: elections, Congress, the White House, parties, government policy and politicians
- us: domestic U.S. news that is not primarily politics, courts or business (local news, society, accidents, education, immigration events)
- world: international news, foreign affairs, wars, other countries
- business: economy, markets, companies, jobs, trade, personal finance
- tech: technology, AI, internet, gadgets, cybersecurity, tech companies
- science: space, research, nature, discoveries
- health: medicine, public health, disease, drugs, wellness
- climate: climate change, weather, natural disasters, environment, energy
- justice: courts, crime, trials, policing, legal cases
- sports: any sport, teams, athletes
- entertainment: movies, TV, music, celebrities, books, arts, lifestyle

Headlines:
${lines}

Return JSON: { "labels": [one section key per headline, in order, exactly ${items.length} entries] }`,
    maxTokens: 1400,
    temperature: 0,
    order: ['gemini', 'groq', 'claude'],
    fast: true,
    timeoutMs: 9000,
    validate: (d) => {
      if (!Array.isArray(d?.labels) || d.labels.length !== items.length) throw new Error('label count mismatch')
    },
  })
  items.forEach((it, i) => {
    const key = String(data.labels[i] || '').toLowerCase().trim()
    if (REAL_KEYS.includes(key)) cache.set(norm(it.text), key)
  })
}

export interface ClassifyOptions {
  /** Return fallbacks after this long and let the AI finish in the background. */
  budgetMs?: number
  /** Called with the final labels if the AI finished after the budget ran out. */
  onLate?: (labels: Record<string, string>) => void
}

/** Classify many items at once. Falls back to keywords, then the feed hint. */
export async function classifyAll(items: ClassifyInput[], opts: ClassifyOptions = {}): Promise<Record<string, string>> {
  const resolve = (): Record<string, string> => {
    const out: Record<string, string> = {}
    for (const it of items) {
      out[it.id] =
        cache.get(norm(it.text)) ||
        keywordCategory(it.text) ||
        (it.hint && REAL_KEYS.includes(it.hint) ? it.hint : 'us')
    }
    return out
  }

  const todo = items.filter((it) => !cache.has(norm(it.text)))
  if (todo.length === 0) return resolve()

  const chunks: ClassifyInput[][] = []
  for (let i = 0; i < todo.length; i += 100) chunks.push(todo.slice(i, i + 100))
  // A few chunks at a time keeps us under provider rate limits
  const work = (async () => {
    for (let i = 0; i < chunks.length; i += 2) {
      await Promise.all(
        chunks.slice(i, i + 2).map((c) => classifyChunk(c).catch((e) => console.warn('[categories] AI classify failed:', String(e).slice(0, 120))))
      )
    }
    if (cache.size > 6000) for (const k of [...cache.keys()].slice(0, 2000)) cache.delete(k)
  })()

  if (!opts.budgetMs) {
    await work
    return resolve()
  }
  let finished = false
  await Promise.race([work.then(() => (finished = true)), new Promise((r) => setTimeout(r, opts.budgetMs))])
  if (!finished) work.then(() => opts.onLate?.(resolve()))
  return resolve()
}
