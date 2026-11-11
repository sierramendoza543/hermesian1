import { NextResponse } from 'next/server'
import { getStoryById } from '@/lib/stories'
import { GameStoryInput, getQuiz } from '@/lib/games'
import { rateLimited, sanitizeShortText } from '@/lib/apiGuard'
import { lookupOutlet } from '@/lib/outlets'

export const maxDuration = 60

export async function POST(request: Request) {
  if (rateLimited(request, 'games', 15)) {
    return NextResponse.json({ error: 'Too many requests — take a breath and try again.' }, { status: 429 })
  }
  try {
    const body = await request.json()
    const id = sanitizeShortText(body?.id, 40)
    if (!id) return NextResponse.json({ error: 'Pick a story first' }, { status: 400 })

    let story: GameStoryInput | null = null
    const live = await getStoryById(id).catch(() => null)
    if (live) {
      story = { id: live.id, headline: live.headline, category: live.category, articles: live.articles }
    } else if (Array.isArray(body?.story?.articles)) {
      story = {
        id,
        headline: sanitizeShortText(body.story.headline, 220),
        category: sanitizeShortText(body.story.category, 40) || 'News',
        articles: body.story.articles.slice(0, 14).map((a: any) => {
          const outlet = lookupOutlet(String(a?.source || ''), a?.domain ? `https://${a.domain}` : undefined)
          return {
            title: sanitizeShortText(a?.title, 220),
            source: sanitizeShortText(a?.source, 80),
            domain: outlet?.domain || '',
            outlet: outlet?.name || null,
            lean: outlet ? outlet.lean : null,
          }
        }),
      }
    }
    if (!story || story.articles.length < 2) {
      return NextResponse.json({ error: 'That story is no longer available. Pick another one.' }, { status: 404 })
    }

    const set = await getQuiz(story)
    const items = set.items
    if (!items.length) {
      return NextResponse.json({ error: 'Not enough data in this story to build that game. Try another story.' }, { status: 422 })
    }
    return NextResponse.json({ game: 'quiz', items, aiUsed: set.aiUsed, storyHeadline: story.headline })
  } catch (error) {
    console.error('Games API error:', error)
    return NextResponse.json({ error: 'Could not build the game right now.' }, { status: 502 })
  }
}
