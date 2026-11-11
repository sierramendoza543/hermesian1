import { NextResponse } from 'next/server'
import { buildSort } from '@/lib/wordgames'
import { rateLimited } from '@/lib/apiGuard'

export const maxDuration = 30

export async function GET(request: Request) {
  if (rateLimited(request, 'sort', 40)) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  try {
    const groups = await buildSort()
    if (!groups) return NextResponse.json({ error: 'Not enough distinct stories to build a puzzle right now.' }, { status: 422 })
    return NextResponse.json({ groups }, { headers: { 'Cache-Control': 'public, s-maxage=300' } })
  } catch (error) {
    console.error('Sort error:', error)
    return NextResponse.json({ error: 'Could not build the puzzle.' }, { status: 502 })
  }
}
