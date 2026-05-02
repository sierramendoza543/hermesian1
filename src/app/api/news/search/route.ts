const NEWS_API_KEY = process.env.NEXT_PUBLIC_NEWS_API_KEY
const NEWS_API_URL = 'https://newsapi.org/v2/everything'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const q = (searchParams.get('q') || '').trim()
  const pageSize = Math.min(parseInt(searchParams.get('pageSize') || '12', 10) || 12, 20)

  if (!q) {
    return Response.json({ success: false, error: 'Missing q' }, { status: 400 })
  }
  if (!NEWS_API_KEY) {
    return Response.json({ success: false, error: 'Missing NewsAPI key' }, { status: 500 })
  }

  try {
    const apiUrl = `${NEWS_API_URL}?q=${encodeURIComponent(q)}&language=en&sortBy=publishedAt&pageSize=${pageSize}&apiKey=${NEWS_API_KEY}`
    const res = await fetch(apiUrl, { cache: 'no-store' })
    const data = await res.json()
    if (!res.ok) {
      return Response.json({ success: false, error: data?.message || 'NewsAPI error' }, { status: res.status })
    }
    const articles = (data.articles || []).map((a: any) => ({
      id: a.url,
      title: String(a.title || '').trim(),
      description: String(a.description || '').replace(/<[^>]+>/g, '').trim(),
      content: a.content || '',
      url: a.url,
      source: a.source?.name || 'Unknown',
      publishedAt: a.publishedAt,
      urlToImage: a.urlToImage || ''
    }))
    return Response.json({ success: true, articles })
  } catch (e) {
    return Response.json({ success: false, error: 'Failed to fetch news' }, { status: 500 })
  }
}


