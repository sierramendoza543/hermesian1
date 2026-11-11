import { NextResponse } from 'next/server'
import { buildNewsdle } from '@/lib/wordgames'
import { rateLimited, sanitizeShortText } from '@/lib/apiGuard'

export const maxDuration = 60

export async function GET(request: Request) {
  if (rateLimited(request, 'newsdle', 60)) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  try {
    const { searchParams } = new URL(request.url)
    const storyId = sanitizeShortText(searchParams.get('story'), 40) || undefined
    const mode = searchParams.get('mode') === 'daily' ? 'daily' : 'random'
    const game = await buildNewsdle({ mode, storyId })
    if (!game) return NextResponse.json({ error: 'Not enough news to build a word right now.' }, { status: 422 })
    return NextResponse.json(game, {
      // The daily puzzle can be shared by everyone; unlimited ones must be fresh every time
      headers: { 'Cache-Control': mode === 'daily' && !storyId ? 'public, s-maxage=1800, stale-while-revalidate=3600' : 'no-store' },
    })
  } catch (error) {
    console.error('Newsdle error:', error)
    return NextResponse.json({ error: 'Could not build the word.' }, { status: 502 })
  }
}
