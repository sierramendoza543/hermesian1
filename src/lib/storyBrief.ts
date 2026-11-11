import { BUCKET_META, leanBucket } from '@/lib/outlets'
import { generateJSON } from '@/lib/llm'
import type { Story } from '@/lib/stories'

export interface StoryBrief {
  headline: string
  summary: string
  keyFacts: string[]
  agree: string[]
  differ: { topic: string; perspectives: { side: string; framing: string }[] }[]
  outletFraming: { source: string; emphasis: string; loadedTerms: string[] }[]
  whyItMatters: string
  apGovConnection: string
  discussionQuestions: string[]
  confidenceNote: string
}

export type StoryBriefInput = Pick<Story, 'id' | 'headline' | 'category' | 'articles'>

const SYSTEM = `You are the analyst behind Hermesian, a media-literacy news app for students. You synthesize many outlets' coverage of one event into a single neutral brief.
Rules:
- Ground "summary", "keyFacts", "agree" and "differ" ONLY in the headlines provided. Never invent names, numbers, quotes, or events that the headlines do not support.
- "whyItMatters" and "apGovConnection" may add general civic background (institutions, constitutional concepts), but must not assert new facts about this event.
- Compare outlet framing by pointing to specific words in their headlines.
- Be concise, neutral, and specific. No hype.`

function describe(a: Story['articles'][number]): string {
  const lean = a.lean === null ? 'unrated' : `${BUCKET_META[leanBucket(a.lean)].label} (${a.lean > 0 ? '+' : ''}${a.lean})`
  return `- [${a.outlet || a.source}] (${lean}) "${a.title}"`
}

function validate(b: any) {
  if (!b || typeof b.summary !== 'string' || !Array.isArray(b.keyFacts)) throw new Error('Brief missing fields')
}

function normalize(b: any, fallbackHeadline: string): StoryBrief {
  const arr = (x: any) => (Array.isArray(x) ? x.filter((v) => typeof v === 'string' && v.trim()).slice(0, 6) : [])
  return {
    headline: typeof b.headline === 'string' && b.headline.trim() ? b.headline.trim() : fallbackHeadline,
    summary: String(b.summary || '').trim(),
    keyFacts: arr(b.keyFacts),
    agree: arr(b.agree),
    differ: (Array.isArray(b.differ) ? b.differ : []).slice(0, 4).map((d: any) => ({
      topic: String(d?.topic || '').trim(),
      perspectives: (Array.isArray(d?.perspectives) ? d.perspectives : []).slice(0, 4).map((p: any) => ({
        side: String(p?.side || '').trim(),
        framing: String(p?.framing || '').trim(),
      })),
    })).filter((d: any) => d.topic && d.perspectives.length),
    outletFraming: (Array.isArray(b.outletFraming) ? b.outletFraming : []).slice(0, 12).map((o: any) => ({
      source: String(o?.source || '').trim(),
      emphasis: String(o?.emphasis || '').trim(),
      loadedTerms: arr(o?.loadedTerms),
    })).filter((o: any) => o.source && o.emphasis),
    whyItMatters: String(b.whyItMatters || '').trim(),
    apGovConnection: String(b.apGovConnection || '').trim(),
    discussionQuestions: arr(b.discussionQuestions).slice(0, 4),
    confidenceNote: String(b.confidenceNote || '').trim(),
  }
}

const cache = new Map<string, { at: number; brief: StoryBrief; provider: string }>()
const TTL = 6 * 60 * 60 * 1000

export async function getStoryBrief(story: StoryBriefInput) {
  const hit = cache.get(story.id)
  if (hit && Date.now() - hit.at < TTL) return { brief: hit.brief, provider: hit.provider, cached: true }

  const prompt = `Today is ${new Date().toDateString()}. Category: ${story.category}.
These ${story.articles.length} outlets covered the same story. Each line shows the outlet, its typical editorial lean rating, and its headline:

${story.articles.slice(0, 14).map(describe).join('\n')}

Return JSON with exactly these keys:
{
  "headline": "neutral, specific headline (max 14 words)",
  "summary": "3-4 sentence neutral summary of what happened, grounded in the headlines",
  "keyFacts": ["3-5 short factual points supported by the headlines"],
  "agree": ["2-4 points ALL or nearly all outlets agree on"],
  "differ": [{"topic": "what is contested or framed differently", "perspectives": [{"side": "e.g. Left-leaning outlets / Right-leaning outlets / Center outlets", "framing": "how those outlets frame it, citing headline wording"}]}],
  "outletFraming": [{"source": "outlet name exactly as given", "emphasis": "what this headline emphasizes or downplays", "loadedTerms": ["charged words used in that headline, or empty"]}],
  "whyItMatters": "1-2 sentences on civic significance",
  "apGovConnection": "1-2 sentences linking to an AP U.S. Government concept (e.g. separation of powers, federalism, checks and balances, civil liberties, elections, the media's role)",
  "discussionQuestions": ["2-3 open questions a student could debate"],
  "confidenceNote": "one sentence noting this brief is built from headlines only and where the evidence is thin"
}`

  const { data, provider } = await generateJSON({
    system: SYSTEM,
    prompt,
    maxTokens: 2500,
    temperature: 0.3,
    timeoutMs: 25000,
    validate,
  })
  const brief = normalize(data, story.headline)
  cache.set(story.id, { at: Date.now(), brief, provider })
  if (cache.size > 200) cache.delete(cache.keys().next().value as string)
  return { brief, provider, cached: false }
}
