import { NextResponse } from 'next/server'
import { getStoryImage } from '@/lib/images'
import { rateLimited, sanitizeShortText } from '@/lib/apiGuard'

export const maxDuration = 30

// The caller sends the story's article links, so this never depends on a server-side story cache
export async function GET(request: Request) {
  if (rateLimited(request, 'story-image', 150)) return NextResponse.json({ url: null }, { status: 429 })
  const { searchParams } = new URL(request.url)
  const id = sanitizeShortText(searchParams.get('id'), 40)
  try {
    const raw = JSON.parse(searchParams.get('a') || '[]')
    const articles = (Array.isArray(raw) ? raw : [])
      .slice(0, 6)
      .map((x: any) => ({ url: String(x?.u || ''), domain: String(x?.d || '').slice(0, 80) }))
      .filter((x) => /^https?:\/\//.test(x.url) && x.url.length < 1500)
    const url = id && articles.length ? await getStoryImage(id, articles) : null
    return NextResponse.json({ url }, { headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400' } })
  } catch {
    return NextResponse.json({ url: null })
  }
}
