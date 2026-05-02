import { NextResponse } from 'next/server'
import { searchYouTubeVideos } from '@/services/gemini'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const action = searchParams.get('action')
  const query = searchParams.get('query')
  const maxResults = parseInt(searchParams.get('maxResults') || '10')

  try {
    if (action === 'search' && query) {
      // Search for YouTube videos
      const videos = await searchYouTubeVideos(query, maxResults)
      return NextResponse.json({ videos })
    } else {
      return NextResponse.json(
        { error: 'Invalid parameters. Use action=search&query=...' },
        { status: 400 }
      )
    }
  } catch (error) {
    console.error('YouTube API Error:', error)
    const details = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { error: 'Failed to process YouTube request', details },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const { action, query, maxResults = 10 } = await request.json()

    if (action === 'search' && query) {
      // Search for YouTube videos
      const videos = await searchYouTubeVideos(query, maxResults)
      return NextResponse.json({ videos })
    } else {
      return NextResponse.json(
        { error: 'Invalid parameters. Use action=search&query=...' },
        { status: 400 }
      )
    }
  } catch (error) {
    console.error('YouTube API Error:', error)
    const details = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { error: 'Failed to process YouTube request', details },
      { status: 500 }
    )
  }
}
