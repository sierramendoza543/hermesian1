import { getAllStories } from '@/lib/stories'
import { etDay, seededRandom, shuffled } from '@/lib/daily'

// Word-based news games, generated deterministically from real headlines:
//  - Newsdle: guess the word most used in a story's headlines
//  - Story Sort: sort 16 words into the 4 stories they came from

const STOP = new Set(
  `about above after again against all also amid among and any are because been before being between both but can could did does doing down during each few for from further had has have having her here him his how into its itself just more most not now off once only other our out over own same she should some such than that the their them then there these they this those through too under until very was were what when where which while who whom why will with would you your says said say new news live updates update video watch breaking report reports reported state states still back first year years week today monday tuesday wednesday thursday friday saturday sunday january february march april may june july august september october november december get gets got make makes made take takes took one two three four five six seven eight nine ten like next last latest full read here there vote votes voting amid says after plans plan could may might must need needs want wants set sets help helps look looks call calls face faces open opens run runs end ends move moves ahead bring potential early late best top big long high low join joins joined family seen issues issue student students opposed some many much even ever also never always`.split(
    /\s+/
  )
)

export interface TermScore {
  word: string
  df: number // number of distinct headlines containing it
  proper: boolean
}

const WORD_RE = /[A-Za-z][A-Za-z'’-]*/g

function normalizeWord(raw: string): string {
  return raw.replace(/['’]s$/i, '').replace(/[’']/g, '').replace(/-/g, '')
}

/** Distinctive words in a story's headlines, best first. */
export function storyTerms(story: { headline: string; articles: { title: string }[] }): TermScore[] {
  const titles = [story.headline, ...story.articles.map((a) => a.title)]
  const seenTitle = new Set<string>()
  const stats = new Map<string, { df: number; proper: number; seen: number }>()
  for (const title of titles) {
    if (seenTitle.has(title)) continue
    seenTitle.add(title)
    const inThis = new Set<string>()
    let first = true
    for (const m of title.matchAll(WORD_RE)) {
      const raw = m[0]
      const w = normalizeWord(raw).toLowerCase()
      const isFirst = first
      first = false
      if (w.length < 4 || w.length > 10 || STOP.has(w) || !/^[a-z]+$/.test(w)) continue
      const e = stats.get(w) || { df: 0, proper: 0, seen: 0 }
      e.seen++
      if (!isFirst && /^[A-Z]/.test(raw)) e.proper++
      if (!inThis.has(w)) {
        e.df++
        inThis.add(w)
      }
      stats.set(w, e)
    }
  }
  return [...stats.entries()]
    .map(([word, e]) => ({ word, df: e.df, proper: e.proper > 0 }))
    .sort((a, b) => b.df - a.df || Number(b.proper) - Number(a.proper) || b.word.length - a.word.length)
}

const stem = (w: string) => w.replace(/(ing|ment|tion|ions|ion|ers|er|ed|es|s)$/, '')

// ---------- Newsdle ----------

export interface NewsdleGame {
  word: string
  hint: string
  storyId: string
  storyHeadline: string
  outlets: number
  category: string
  /** Same-length words from this story's headlines (names etc.) that count as valid guesses even if they aren't in the dictionary. */
  extra: string[]
  options: { id: string; headline: string }[]
}

function maskWord(title: string, word: string): string {
  const re = new RegExp(`\\b${word}(?:['’]s)?\\b`, 'gi')
  return title.replace(re, (m) => '▢'.repeat(word.length) + (/['’]s$/i.test(m) ? "'s" : ''))
}

/** Letters-only words of a given length used in these headlines (uppercase). */
function headlineWords(titles: string[], length: number): string[] {
  const out = new Set<string>()
  for (const t of titles) {
    for (const m of t.matchAll(WORD_RE)) {
      const w = normalizeWord(m[0]).toLowerCase()
      if (w.length === length && /^[a-z]+$/.test(w)) out.add(w.toUpperCase())
    }
  }
  return [...out]
}

export type PuzzleMode = 'daily' | 'random'

const dailyCache = new Map<string, unknown>()

function wordFor(story: { headline: string; articles: { title: string }[] }, rand: () => number, mode: PuzzleMode) {
  const terms = storyTerms(story)
  const good = terms.filter((t) => t.word.length >= 5 && t.word.length <= 8 && t.df >= 2)
  if (mode === 'random' && good.length > 1) return good[Math.floor(rand() * Math.min(good.length, 5))]
  return good[0] || terms.find((t) => t.word.length >= 5 && t.word.length <= 8) || terms.find((t) => t.word.length >= 4)
}

export async function buildNewsdle(opts: { mode?: PuzzleMode; storyId?: string } = {}): Promise<(NewsdleGame & { mode: PuzzleMode; day: string }) | null> {
  const mode = opts.mode || 'random'
  const day = etDay()
  const cacheKey = `newsdle:${day}`
  if (mode === 'daily' && !opts.storyId && dailyCache.has(cacheKey)) return dailyCache.get(cacheKey) as NewsdleGame & { mode: PuzzleMode; day: string }

  const stories = await getAllStories()
  const ranked = [...stories.filter((s) => s.isTop), ...stories.filter((s) => !s.isTop)]
  const pool = ranked.slice(0, mode === 'daily' ? 12 : 40)
  if (pool.length === 0) return null

  // Daily: the same pick for everyone all day. Unlimited: any story in the news.
  const rand = mode === 'daily' ? seededRandom(`${day}:newsdle`) : Math.random
  const forced = opts.storyId ? stories.find((s) => s.id === opts.storyId) : undefined
  const start = Math.floor(rand() * pool.length)
  const order = forced ? [forced] : [...pool.slice(start), ...pool.slice(0, start)]

  for (const story of order) {
    const pick = wordFor(story, rand, mode)
    if (!pick) continue
    const titles = [story.headline, ...story.articles.map((a) => a.title)]
    const withWord = titles.find((t) => new RegExp(`\\b${pick.word}\\b`, 'i').test(t)) || story.headline
    const game = {
      word: pick.word.toUpperCase(),
      hint: maskWord(withWord, pick.word),
      storyId: story.id,
      storyHeadline: story.headline,
      outlets: pick.df,
      category: story.category,
      extra: headlineWords(titles, pick.word.length),
      options: ranked.slice(0, 5).map((s) => ({ id: s.id, headline: s.headline })),
      mode,
      day,
    }
    if (mode === 'daily' && !opts.storyId) dailyCache.set(cacheKey, game)
    return game
  }
  return null
}

// ---------- Story Sort ----------

export interface SortGroup {
  storyId: string
  label: string
  words: string[]
}

function shortLabel(headline: string): string {
  const h = headline.replace(/\s+/g, ' ').trim()
  return h.length <= 64 ? h : `${h.slice(0, 61).replace(/\s+\S*$/, '')}…`
}

export async function buildSort(opts: { mode?: PuzzleMode } = {}): Promise<SortGroup[] | null> {
  const mode = opts.mode || 'random'
  const day = etDay()
  const cacheKey = `sort:${day}`
  if (mode === 'daily' && dailyCache.has(cacheKey)) return dailyCache.get(cacheKey) as SortGroup[]

  const stories = await getAllStories()
  const ranked = [...stories.filter((s) => s.isTop), ...stories.filter((s) => !s.isTop)]
  const rand = mode === 'daily' ? seededRandom(`${day}:sort`) : Math.random
  // Unlimited puzzles draw on more of the news; the daily one stays with the biggest stories
  const pool = ranked.slice(0, 24)
  const termsByStory = pool.map((s) => ({ s, terms: storyTerms(s) }))

  // A word must belong to exactly one story in the pool to keep groups unambiguous
  const owners = new Map<string, number>()
  const stems = new Map<string, number>()
  for (const { terms } of termsByStory) {
    const seen = new Set<string>()
    const seenStems = new Set<string>()
    for (const t of terms) {
      if (!seen.has(t.word)) owners.set(t.word, (owners.get(t.word) || 0) + 1)
      if (!seenStems.has(stem(t.word))) stems.set(stem(t.word), (stems.get(stem(t.word)) || 0) + 1)
      seen.add(t.word)
      seenStems.add(stem(t.word))
    }
  }

  const candidates = termsByStory
    .map(({ s, terms }) => {
      const ordered = [...terms].sort(
        (a, b) => Number(b.df >= 2) - Number(a.df >= 2) || Number(b.proper) - Number(a.proper) || b.df - a.df || b.word.length - a.word.length
      )
      const picked: string[] = []
      const pickedStems = new Set<string>()
      for (const t of ordered) {
        if (owners.get(t.word) !== 1 || stems.get(stem(t.word)) !== 1) continue
        if (t.df < 2 && picked.length >= 2) continue
        if (pickedStems.has(stem(t.word))) continue
        picked.push(t.word)
        pickedStems.add(stem(t.word))
        if (picked.length === 4) break
      }
      return { s, picked }
    })
    .filter((c) => c.picked.length === 4)

  // Daily keeps the biggest stories first (just seeded variety); unlimited shuffles everything
  const order = mode === 'daily' ? shuffled(candidates.slice(0, 8), rand).concat(candidates.slice(8)) : shuffled(candidates, rand)
  const used = new Set<string>()
  const groups: SortGroup[] = []
  for (const { s, picked } of order) {
    if (groups.length === 4) break
    if (picked.some((w) => used.has(w))) continue
    picked.forEach((w) => used.add(w))
    groups.push({ storyId: s.id, label: shortLabel(s.headline), words: picked.map((w) => w.toUpperCase()) })
  }
  if (groups.length < 4) return null
  if (mode === 'daily') dailyCache.set(cacheKey, groups)
  return groups
}
