import { NextResponse } from 'next/server'
import { buildNewsdle } from '@/lib/wordgames'
import { rateLimited, sanitizeShortText } from '@/lib/apiGuard'

export const maxDuration = 30

export async function GET(request: Request) {
  if (rateLimited(request, 'newsdle', 40)) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  try {
    const story = sanitizeShortText(new URL(request.url).searchParams.get('story'), 40) || undefined
    const game = await buildNewsdle(story)
    if (!game) return NextResponse.json({ error: 'Not enough news to build a word right now.' }, { status: 422 })
    return NextResponse.json(game, { headers: { 'Cache-Control': 'public, s-maxage=300' } })
  } catch (error) {
    console.error('Newsdle error:', error)
    return NextResponse.json({ error: 'Could not build today\'s word.' }, { status: 502 })
  }
}
