import { NextResponse } from 'next/server'
import { analyzeArticleWithGemini } from '@/services/gemini'
import { analyzeArticleWithGroq } from '@/services/groq'

const NEWS_API_KEY = process.env.NEXT_PUBLIC_NEWS_API_KEY
const NEWS_API_URL = 'https://newsapi.org/v2/everything'

function decodeEntities(text: string) {
  return text
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
}

async function fetchHtmlFollow(url: string): Promise<{ finalUrl: string; html: string }> {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Hermesian/1.0)' },
    redirect: 'follow',
    cache: 'no-store'
  })
  const html = await res.text()
  return { finalUrl: res.url || url, html }
}

function extractFromJsonLd(html: string): { title?: string; articleBody?: string; description?: string } | null {
  try {
    const scripts = html.match(/<script[^>]+type=["']application\/ld\+json["'][^>]*>[\s\S]*?<\/script>/gi) || []
    for (const s of scripts) {
      const jsonTextMatch = s.match(/<script[^>]*>([\s\S]*?)<\/script>/i)
      if (!jsonTextMatch) continue
      const text = jsonTextMatch[1]
      const candidates: any[] = []
      try {
        const parsed = JSON.parse(text)
        if (Array.isArray(parsed)) candidates.push(...parsed)
        else candidates.push(parsed)
      } catch { continue }
      for (const node of candidates) {
        const type = (node['@type'] || node.type || '').toString().toLowerCase()
        if (type.includes('article') || node.articleBody || node.headline) {
          return {
            title: node.headline || node.name,
            articleBody: node.articleBody,
            description: node.description
          }
        }
      }
    }
  } catch {}
  return null
}

async function resolveGoogleNews(url: string, html: string): Promise<string | null> {
  try {
    const m = html.match(/<a[^>]+href="(https?:[^"#]+)"[^>]*>(?:[^<]*)<\/a>/i)
    if (m && m[1]) return m[1]
    const c = html.match(/<link[^>]+rel=["']canonical["'][^>]+href=["'](https?:[^"']+)["']/i)
    if (c && c[1]) return c[1]
    const og = html.match(/<meta[^>]+property=["']og:url["'][^>]+content=["'](https?:[^"']+)["']/i)
    if (og && og[1]) return og[1]
  } catch {}
  return null
}

async function fetchArticleText(url: string): Promise<{ title?: string; text: string; resolvedUrl: string }> {
  let { finalUrl, html } = await fetchHtmlFollow(url)

  // Try to resolve Google News intermediary links
  if (/news\.google\.com/.test(new URL(finalUrl).hostname)) {
    const redirected = await resolveGoogleNews(finalUrl, html)
    if (redirected) {
      const follow = await fetchHtmlFollow(redirected)
      finalUrl = follow.finalUrl
      html = follow.html
    }
  }

  // Strip scripts/styles
  const noScripts = html.replace(/<script[\s\S]*?<\/script>/gi, '')
  const noStyles = noScripts.replace(/<style[\s\S]*?<\/style>/gi, '')

  // Extract title
  const titleMatch = noStyles.match(/<title>([\s\S]*?)<\/title>/i)
  const title = titleMatch ? titleMatch[1].trim() : undefined

  // JSON-LD fallback
  const jsonLd = extractFromJsonLd(noStyles)

  // Heuristic main content extraction
  const bodyMatch = noStyles.match(/<body[\s\S]*?>([\s\S]*?)<\/body>/i)
  const bodyHtml = bodyMatch ? bodyMatch[1] : noStyles
  const articleMatch = bodyHtml.match(/<article[\s\S]*?>([\s\S]*?)<\/article>/i)
  const mainHtml = articleMatch ? articleMatch[1] : bodyHtml
  const keepBlocks = mainHtml
    .replace(/<(header|footer|nav|aside)[\s\S]*?<\/\1>/gi, '')
    .replace(/<(h1|h2|h3|h4|p|li|blockquote)([^>]*)>/gi, '\n')
    .replace(/<br\s*\/?>(\s*<br\s*\/?>)*/gi, '\n')
    .replace(/<[^>]+>/g, '')
  let text = decodeEntities(keepBlocks)
    .replace(/\n\s*\n\s*\n+/g, '\n\n')
    .replace(/\t+/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim()

  if (!text || text.length < 300) {
    const metaDescMatch = noStyles.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i)
    const metaDesc = metaDescMatch ? decodeEntities(metaDescMatch[1]) : undefined
    if (jsonLd?.articleBody && jsonLd.articleBody.length > (text?.length || 0)) {
      text = jsonLd.articleBody
    } else if (metaDesc && metaDesc.length > (text?.length || 0)) {
      text = metaDesc
    } else if (jsonLd?.description && (jsonLd.description.length > (text?.length || 0))) {
      text = jsonLd.description
    }
  }

  const finalTitle = jsonLd?.title || title
  return { title: finalTitle, text, resolvedUrl: finalUrl }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const headline = (searchParams.get('headline') || '').trim()
    const url = searchParams.get('url')

    if (headline) {
      if (!NEWS_API_KEY) {
        return NextResponse.json({ success: false, error: 'Missing NewsAPI key' }, { status: 500 })
      }
      const apiUrl = `${NEWS_API_URL}?q=${encodeURIComponent(headline)}&language=en&sortBy=publishedAt&pageSize=10&apiKey=${NEWS_API_KEY}`
      const res = await fetch(apiUrl, { cache: 'no-store' })
      const data = await res.json()
      if (!res.ok) {
        return NextResponse.json({ success: false, error: data?.message || 'NewsAPI error' }, { status: res.status })
      }
      const items: Array<{ id: string; title: string; description: string; content: string; url: string; source: string; publishedAt: string }> = ((data.articles || []) as any[]).map((a: any) => ({
        id: a.url,
        title: a.title,
        description: a.description || '',
        content: a.content || '',
        url: a.url,
        source: a.source?.name || 'Unknown',
        publishedAt: a.publishedAt,
      }))

      const normalized = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
      const best = items.find((a) => normalized(a.title) === normalized(headline)) || items[0]

      if (!best) {
        return NextResponse.json({ success: false, suggestions: [], error: 'No NewsAPI results' }, { status: 404 })
      }

      const combinedText = [best.title, best.description, best.content].filter(Boolean).join('\n\n')
      if (!combinedText || combinedText.length < 60) {
        return NextResponse.json({ success: false, suggestions: items.slice(0, 8) }, { status: 200 })
      }

      const analysis = process.env.GROQ_API_KEY
        ? await analyzeArticleWithGroq({ url: best.url, title: best.title, text: combinedText })
        : await analyzeArticleWithGemini({ url: best.url, title: best.title, text: combinedText })
      return NextResponse.json({ success: true, analysis })
    }

    if (!url) {
      return NextResponse.json({ error: 'Missing headline or url' }, { status: 400 })
    }
    const { title, text, resolvedUrl } = await fetchArticleText(url)
    if (!text || text.length < 100) {
      return NextResponse.json({ error: 'Failed to extract article text from source' }, { status: 422 })
    }
    const analysis = process.env.GROQ_API_KEY
      ? await analyzeArticleWithGroq({ url: resolvedUrl || url, title, text })
      : await analyzeArticleWithGemini({ url: resolvedUrl || url, title, text })
    return NextResponse.json({ success: true, analysis })
  } catch (error: any) {
    console.error('Analyze API error:', error)
    return NextResponse.json({ success: false, error: error?.message || 'Failed to analyze article' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const headline: string | undefined = body?.headline
    const url: string | undefined = body?.url
    const article: { title?: string; description?: string; content?: string; url?: string } | undefined = body?.article

    if (article?.url) {
      const text = [article.title, article.description, article.content].filter(Boolean).join('\n\n')
      if (!text || text.length < 60) {
        return NextResponse.json({ success: false, error: 'Insufficient article text' }, { status: 422 })
      }
      const analysis = process.env.GROQ_API_KEY
        ? await analyzeArticleWithGroq({ url: article.url!, title: article.title || '', text })
        : await analyzeArticleWithGemini({ url: article.url!, title: article.title || '', text })
      return NextResponse.json({ success: true, analysis })
    }

    if (headline) {
      if (!NEWS_API_KEY) {
        return NextResponse.json({ success: false, error: 'Missing NewsAPI key' }, { status: 500 })
      }
      const apiUrl = `${NEWS_API_URL}?q=${encodeURIComponent(headline)}&language=en&sortBy=publishedAt&pageSize=10&apiKey=${NEWS_API_KEY}`
      const res = await fetch(apiUrl, { cache: 'no-store' })
      const data = await res.json()
      if (!res.ok) {
        return NextResponse.json({ success: false, error: data?.message || 'NewsAPI error' }, { status: res.status })
      }
      const items: Array<{ id: string; title: string; description: string; content: string; url: string; source: string; publishedAt: string }> = ((data.articles || []) as any[]).map((a: any) => ({
        id: a.url,
        title: a.title,
        description: a.description || '',
        content: a.content || '',
        url: a.url,
        source: a.source?.name || 'Unknown',
        publishedAt: a.publishedAt,
      }))
      const normalized = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
      const best = items.find((a) => normalized(a.title) === normalized(headline)) || items[0]
      if (!best) {
        return NextResponse.json({ success: false, suggestions: [], error: 'No NewsAPI results' }, { status: 404 })
      }
      const combinedText = [best.title, best.description, best.content].filter(Boolean).join('\n\n')
      if (!combinedText || combinedText.length < 60) {
        return NextResponse.json({ success: false, suggestions: items.slice(0, 8) }, { status: 200 })
      }
      const analysis = process.env.GROQ_API_KEY
        ? await analyzeArticleWithGroq({ url: best.url, title: best.title, text: combinedText })
        : await analyzeArticleWithGemini({ url: best.url, title: best.title, text: combinedText })
      return NextResponse.json({ success: true, analysis })
    }

    if (!url) {
      return NextResponse.json({ error: 'Missing headline or url' }, { status: 400 })
    }
    const { title, text, resolvedUrl } = await fetchArticleText(url)
    if (!text || text.length < 100) {
      return NextResponse.json({ error: 'Failed to extract article text from source' }, { status: 422 })
    }
    const analysis = process.env.GROQ_API_KEY
      ? await analyzeArticleWithGroq({ url: resolvedUrl || url, title, text })
      : await analyzeArticleWithGemini({ url: resolvedUrl || url, title, text })
    return NextResponse.json({ success: true, analysis })
  } catch (error: any) {
    console.error('Analyze API error:', error)
    return NextResponse.json({ success: false, error: error?.message || 'Failed to analyze article' }, { status: 500 })
  }
}


