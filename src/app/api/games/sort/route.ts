import { NextResponse } from 'next/server'
import { buildSort } from '@/lib/wordgames'
import { rateLimited } from '@/lib/apiGuard'

export const maxDuration = 60

export async function GET(request: Request) {
  if (rateLimited(request, 'sort', 60)) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  try {
    const mode = new URL(request.url).searchParams.get('mode') === 'daily' ? 'daily' : 'random'
    const groups = await buildSort({ mode })
    if (!groups) return NextResponse.json({ error: 'Not enough distinct stories to build a puzzle right now.' }, { status: 422 })
    return NextResponse.json({ groups }, { headers: { 'Cache-Control': mode === 'daily' ? 'public, s-maxage=1800, stale-while-revalidate=3600' : 'no-store' } })
  } catch (error) {
    console.error('Sort error:', error)
    return NextResponse.json({ error: 'Could not build the puzzle.' }, { status: 502 })
  }
}
