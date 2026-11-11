import { NextResponse } from 'next/server'
import { getStoryById } from '@/lib/stories'
import { rateLimited } from '@/lib/apiGuard'

export const maxDuration = 30

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (rateLimited(request, 'story', 60)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }
  const { id } = await params
  try {
    const story = await getStoryById(id.slice(0, 40))
    if (!story) return NextResponse.json({ error: 'Story not found — it may have rotated out of the news cycle.' }, { status: 404 })
    return NextResponse.json({ story })
  } catch (error) {
    console.error('Story API error:', error)
    return NextResponse.json({ error: 'Could not load this story.' }, { status: 502 })
  }
}
