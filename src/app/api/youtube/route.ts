import { NextResponse } from 'next/server'
import { searchYouTubeVideos } from '@/services/gemini'
import { rateLimited } from '@/lib/apiGuard'

async function handleSearch(action: unknown, query: unknown, rawMax: unknown) {
  if (action !== 'search' || typeof query !== 'string' || !query.trim()) {
    return NextResponse.json(
      { error: 'Invalid parameters. Use action=search&query=...' },
      { status: 400 }
    )
  }
  const maxResults = Math.min(Math.max(parseInt(String(rawMax)) || 10, 1), 25)
  const videos = await searchYouTubeVideos(query.slice(0, 200), maxResults)
  return NextResponse.json({ videos })
}

function failure(error: unknown) {
  console.error('YouTube API Error:', error)
  return NextResponse.json({ error: 'Failed to process YouTube request' }, { status: 500 })
}

export async function GET(request: Request) {
  if (rateLimited(request, 'youtube', 30)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }
  try {
    const { searchParams } = new URL(request.url)
    return await handleSearch(searchParams.get('action'), searchParams.get('query'), searchParams.get('maxResults'))
  } catch (error) {
    return failure(error)
  }
}

export async function POST(request: Request) {
  if (rateLimited(request, 'youtube', 30)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }
  try {
    const { action, query, maxResults } = await request.json()
    return await handleSearch(action, query, maxResults)
  } catch (error) {
    return failure(error)
  }
}
