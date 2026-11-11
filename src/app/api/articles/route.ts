import { NextResponse } from 'next/server'
import { getAllStories, Story } from '@/lib/stories'
import { isPaywalled } from '@/lib/outlets'
import { rateLimited } from '@/lib/apiGuard'

export const maxDuration = 60

export interface PickArticle {
  title: string
  url: string
  source: string
  domain: string
  lean: number | null
  paywalled: boolean
  publishedAt: string
  storyId: string
  storyHeadline: string
  sourceCount: number
  category: string
}

/** Up to two readable articles per story, favoring outlets that don't block automated reading. */
function pick(story: Story): PickArticle[] {
  const ranked = [...story.articles].sort((a, b) => Number(isPaywalled(a.domain)) - Number(isPaywalled(b.domain)))
  return ranked.slice(0, 2).map((a) => ({
    title: a.title,
    url: a.url,
    source: a.outlet || a.source,
    domain: a.domain,
    lean: a.lean,
    paywalled: isPaywalled(a.domain),
    publishedAt: story.publishedAt,
    storyId: story.id,
    storyHeadline: story.headline,
    sourceCount: story.sourceCount,
    category: story.category,
  }))
}

export async function GET(request: Request) {
  if (rateLimited(request, 'articles', 60)) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  try {
    const stories = await getAllStories()
    const top = stories.filter((s) => s.isTop).slice(0, 14)
    const popular = top.flatMap(pick).slice(0, 24)
    const recent = [...stories]
      .sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt))
      .filter((s) => s.sourceCount >= 3)
      .slice(0, 14)
      .flatMap(pick)
      .slice(0, 24)
    return NextResponse.json({ popular, recent }, { headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' } })
  } catch (error) {
    console.error('Articles API error:', error)
    return NextResponse.json({ error: 'Could not load articles right now.' }, { status: 502 })
  }
}
