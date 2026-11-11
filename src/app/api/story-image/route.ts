import { NextResponse } from 'next/server'
import { getStoryById } from '@/lib/stories'
import { getStoryImage } from '@/lib/images'
import { rateLimited, sanitizeShortText } from '@/lib/apiGuard'

export const maxDuration = 30

export async function GET(request: Request) {
  if (rateLimited(request, 'story-image', 120)) return NextResponse.json({ url: null }, { status: 429 })
  const id = sanitizeShortText(new URL(request.url).searchParams.get('id'), 40)
  try {
    const story = id ? await getStoryById(id) : null
    const url = story ? await getStoryImage(story) : null
    return NextResponse.json({ url }, { headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400' } })
  } catch {
    return NextResponse.json({ url: null })
  }
}
