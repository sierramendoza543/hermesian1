import { NextResponse } from 'next/server'
import { rateLimited, sanitizeShortText } from '@/lib/apiGuard'
import { BlockedError, fetchArticle, resolveGoogleNewsUrl } from '@/lib/extract'
import { buildHighlights, computeTextStats, MAX_ANALYZED_CHARS, runAnalysis, AnalysisResult } from '@/lib/analysis'
import { domainOf, leanLabel, lookupOutlet } from '@/lib/outlets'

export const maxDuration = 60

const MIN_CHARS = 400
const MAX_INPUT_CHARS = 60_000

function fail(error: string, status: number, extra: Record<string, unknown> = {}) {
  return NextResponse.json({ error, ...extra }, { status })
}

export async function POST(request: Request) {
  if (rateLimited(request, 'analyze', 8)) {
    return fail('Too many analyses in a short time - wait a minute and try again.', 429)
  }

  let body: any
  try {
    body = await request.json()
  } catch {
    return fail('Invalid request.', 400)
  }

  let title = sanitizeShortText(body?.title, 300)
  let source = sanitizeShortText(body?.source, 100)
  let url = typeof body?.url === 'string' ? body.url.trim().slice(0, 2000) : ''
  let text = typeof body?.text === 'string' ? body.text : ''

  try {
    if (!text && url) {
      if (!/^https?:\/\//i.test(url)) return fail('Enter a full link starting with http:// or https://', 400)
      try {
        const article = await fetchArticle(url)
        text = article.text
        url = article.url
        title = article.title || title
        source = article.siteName || source
        if (article.paywalled || text.length < MIN_CHARS) {
          return fail(
            `${source || 'This outlet'} only shows part of this article to automated readers (paywall or login wall). Paste the article text below and we'll analyze it.`,
            422,
            { needsText: true, title, source }
          )
        }
      } catch (err) {
        const blocked = err instanceof BlockedError
        const msg = blocked
          ? `${source || 'This outlet'} blocks automated reading of its articles. Google News only gives us the headline and link, not the text.`
          : err instanceof Error
          ? err.message
          : 'Could not fetch the article.'
        return fail(`${msg} Paste the article text below and we'll analyze it.`, 422, { needsText: true, title, source })
      }
    }

    text = text.replace(/\r/g, '').replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim()
    if (!text) return fail('Provide a link or paste some article text.', 400)
    if (text.length < MIN_CHARS) return fail('That\'s too short to analyze reliably - paste at least a few paragraphs.', 400)
    text = text.slice(0, MAX_INPUT_CHARS)

    if (url) url = await resolveGoogleNewsUrl(url)
    const domain = domainOf(url)
    const outletRaw = lookupOutlet(source, url)
    const analyzedText = text.slice(0, MAX_ANALYZED_CHARS)

    const stats = computeTextStats(analyzedText)

    let analysis = null
    let provider: string | null = null
    let aiError: string | null = null
    let verification = { requested: 0, verified: 0 }
    try {
      const result = await runAnalysis({ title, source: outletRaw?.name || source, text })
      analysis = result.analysis
      provider = result.provider
      verification = result.verification
    } catch (err) {
      aiError = err instanceof Error ? err.message : 'AI analysis failed'
      console.error('Analysis AI error:', aiError.slice(0, 300))
    }

    const payload: AnalysisResult = {
      mode: analysis ? 'ai' : 'data-only',
      provider,
      aiError: aiError ? 'The AI analysis service is unavailable right now, so this report shows measurements only.' : null,
      article: {
        title: title || 'Pasted article',
        url,
        source: outletRaw?.name || source,
        domain: outletRaw?.domain || domain,
        text: analyzedText,
        totalWords: text.split(/\s+/).filter(Boolean).length,
        truncated: text.length > MAX_ANALYZED_CHARS,
      },
      outlet: outletRaw
        ? { name: outletRaw.name, lean: outletRaw.lean, label: leanLabel(outletRaw.lean), reliability: outletRaw.reliability }
        : null,
      stats,
      analysis,
      highlights: buildHighlights(analyzedText, analysis),
      verification,
      generatedAt: new Date().toISOString(),
    }
    return NextResponse.json(payload)
  } catch (error) {
    console.error('Analyze API error:', error)
    return fail('Something went wrong analyzing that article.', 500)
  }
}
