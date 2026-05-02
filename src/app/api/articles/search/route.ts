import { NextResponse } from 'next/server'

const NEWS_API_KEY = process.env.NEXT_PUBLIC_NEWS_API_KEY
const NEWS_API_URL = 'https://newsapi.org/v2/everything'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const headline = (searchParams.get('headline') || '').trim()
    const pageSize = parseInt(searchParams.get('pageSize') || '10')

    if (!NEWS_API_KEY) {
      return NextResponse.json({ success: false, error: 'Missing NewsAPI key' }, { status: 500 })
    }
    if (!headline) {
      return NextResponse.json({ success: false, error: 'Missing headline' }, { status: 400 })
    }

    const url = `${NEWS_API_URL}?q=${encodeURIComponent(headline)}&language=en&sortBy=publishedAt&pageSize=${pageSize}&apiKey=${NEWS_API_KEY}`
    const res = await fetch(url)
    const data = await res.json()
    if (!res.ok) {
      return NextResponse.json({ success: false, error: data?.message || 'NewsAPI error' }, { status: res.status })
    }

    const articles = (data.articles || []).map((a: any) => ({
      id: a.url,
      title: a.title,
      description: a.description || '',
      content: a.content || '',
      url: a.url,
      source: a.source?.name || 'Unknown',
      publishedAt: a.publishedAt,
    }))

    return NextResponse.json({ success: true, articles })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error?.message || 'Search failed' }, { status: 500 })
  }
}


