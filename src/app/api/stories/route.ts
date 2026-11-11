import { NextResponse } from 'next/server'
import { CATEGORIES, getAllStories, searchStories, Story } from '@/lib/stories'
import { rateLimited, sanitizeShortText } from '@/lib/apiGuard'
import { storyTerms } from '@/lib/wordgames'
import { peekDigests } from '@/lib/digest'

export const maxDuration = 60

const GENERIC = new Set(['house','senate','billion','million','bill','court','president','people','police','state','states','national','federal','american','first','major','report','company','city','county','group','officials','leader','after','week','year','government','department','election','republican','republicans','democrat','democrats','democratic','trump\'s','minority','majority','security','campaign','jordan','cousins'])

/** Most-mentioned names/terms across the day's biggest stories. */
function trendingTerms(stories: Story[]): string[] {
  const score = new Map<string, number>()
  for (const s of stories.slice(0, 40)) {
    for (const t of storyTerms(s).slice(0, 6)) {
      if (!t.proper || t.df < 3 || GENERIC.has(t.word)) continue
      score.set(t.word, (score.get(t.word) || 0) + t.df + s.sourceCount * 0.3)
    }
  }
  return [...score.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([w]) => w.charAt(0).toUpperCase() + w.slice(1))
}

// Keep the front page varied: at most 3 stories per section until the list runs out
function diversify(stories: Story[], cap = 3): Story[] {
  const counts: Record<string, number> = {}
  const first: Story[] = []
  const rest: Story[] = []
  for (const s of stories) {
    counts[s.categoryKey] = (counts[s.categoryKey] || 0) + 1
    ;(counts[s.categoryKey] <= cap ? first : rest).push(s)
  }
  return [...first, ...rest]
}

export async function GET(request: Request) {
  if (rateLimited(request, 'stories', 60)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }
  try {
    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category') || 'top'
    const q = sanitizeShortText(searchParams.get('q'), 100)
    const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '30') || 30, 1), 60)
    const offset = Math.max(parseInt(searchParams.get('offset') || '0') || 0, 0)

    const everything = q ? [] : await getAllStories()
    let stories = q ? await searchStories(q) : everything
    if (!q) stories = category === 'top' ? [...diversify(stories.filter((s) => s.isTop)), ...stories.filter((s) => !s.isTop)] : stories.filter((s) => s.tags.includes(category))

    return NextResponse.json(
      { stories: stories.slice(offset, offset + limit), digests: peekDigests(stories.slice(offset, offset + limit)), total: stories.length, hasMore: offset + limit < stories.length, categories: CATEGORIES, trending: q || offset ? [] : trendingTerms(everything), query: q || null, fetchedAt: new Date().toISOString() },
      { headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' } }
    )
  } catch (error) {
    console.error('Stories API error:', error)
    return NextResponse.json({ error: 'Could not load stories right now. Please try again shortly.' }, { status: 502 })
  }
}
