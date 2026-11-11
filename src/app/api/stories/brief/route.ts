import { NextResponse } from 'next/server'
import { getStoryById } from '@/lib/stories'
import { getStoryBrief, StoryBriefInput } from '@/lib/storyBrief'
import { rateLimited, sanitizeShortText } from '@/lib/apiGuard'
import { lookupOutlet } from '@/lib/outlets'

export const maxDuration = 60

// Accepts a story id (preferred) or, when the story has rotated out of the
// server cache, the story's articles as posted by the client.
export async function POST(request: Request) {
  if (rateLimited(request, 'brief', 12)) {
    return NextResponse.json({ error: 'Too many requests — slow down a little.' }, { status: 429 })
  }
  try {
    const body = await request.json()
    const id = sanitizeShortText(body?.id, 40)
    let story: StoryBriefInput | null = id ? await getStoryById(id) : null

    if (!story && Array.isArray(body?.story?.articles) && id) {
      const articles = body.story.articles.slice(0, 14).map((a: any) => {
        const outlet = lookupOutlet(String(a?.source || ''), a?.domain ? `https://${a.domain}` : undefined)
        return {
          title: sanitizeShortText(a?.title, 220),
          url: '',
          source: sanitizeShortText(a?.source, 80),
          domain: outlet?.domain || '',
          outlet: outlet?.name || null,
          lean: outlet ? outlet.lean : null,
          bucket: null,
          reliability: outlet?.reliability || null,
        }
      })
      story = {
        id,
        headline: sanitizeShortText(body.story.headline, 220),
        category: sanitizeShortText(body.story.category, 40) || 'News',
        articles,
      } as StoryBriefInput
    }
    if (!story || story.articles.length === 0) {
      return NextResponse.json({ error: 'Story not found' }, { status: 404 })
    }
    const result = await getStoryBrief(story)
    return NextResponse.json(result)
  } catch (error) {
    console.error('Brief API error:', error)
    return NextResponse.json({ error: 'The AI brief could not be generated right now.' }, { status: 502 })
  }
}
