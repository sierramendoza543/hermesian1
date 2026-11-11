import { NextResponse } from 'next/server'
import { pickVideos } from '@/lib/videos'
import { rateLimited } from '@/lib/apiGuard'

export const maxDuration = 60

export async function GET(request: Request) {
  if (rateLimited(request, 'videos', 80)) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  try {
    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category') || 'all'
    const count = Math.min(Math.max(parseInt(searchParams.get('count') || '8') || 8, 1), 20)
    const seen = new Set(
      (searchParams.get('seen') || '')
        .split(',')
        .filter((id) => /^[A-Za-z0-9_-]{11}$/.test(id))
        .slice(0, 600)
    )
    const result = await pickVideos({ category, seen, count })
    return NextResponse.json(result, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    console.error('Videos API error:', error)
    return NextResponse.json({ error: 'Could not load videos right now.' }, { status: 502 })
  }
}
