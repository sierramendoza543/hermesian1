export interface ArticleAnalysis {
  title: string
  url: string
  wordCount: number
  summary: string
  sentiment: 'negative' | 'neutral' | 'positive'
  overallBias: 'Left' | 'Center-Left' | 'Center' | 'Center-Right' | 'Right' | 'Unknown'
  confidence: number
  keyPeople: string[]
  keyOrganizations: string[]
  keyPlaces: string[]
  keyTopics: string[]
  keyQuotes: { quote: string; speaker?: string; context?: string }[]
  rhetoric: { fallacies: string[]; emotionalAppeals: string[]; loadedLanguage: string[] }
  factuality: { claimsToCheck: string[]; citationQuality: 'Low'|'Medium'|'High' }
  readingLevel: 'Easy' | 'Intermediate' | 'Advanced'
}

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions'
const DEFAULT_MODEL = process.env.GROQ_MODEL || 'llama-3.1-8b-instant'

export async function analyzeArticleWithGroq(article: { url: string; title?: string; text: string }): Promise<ArticleAnalysis> {
  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) throw new Error('Missing GROQ_API_KEY')

  // Keep inputs compact to avoid token limits
  const normalized = article.text.replace(/\s+/g, ' ').trim()
  const snippet = normalized.slice(0, 4000)

  const system = 'You analyze news articles and return ONLY strict JSON matching the provided schema. Do not include markdown or prose.'
  const user = `Schema:
{
  "title": string,
  "url": string,
  "wordCount": number,
  "summary": string,
  "sentiment": "negative" | "neutral" | "positive",
  "overallBias": "Left" | "Center-Left" | "Center" | "Center-Right" | "Right" | "Unknown",
  "confidence": number,
  "keyPeople": string[],
  "keyOrganizations": string[],
  "keyPlaces": string[],
  "keyTopics": string[],
  "keyQuotes": [{ "quote": string, "speaker"?: string, "context"?: string }],
  "rhetoric": { "fallacies": string[], "emotionalAppeals": string[], "loadedLanguage": string[] },
  "factuality": { "claimsToCheck": string[], "citationQuality": "Low"|"Medium"|"High" },
  "readingLevel": "Easy" | "Intermediate" | "Advanced"
}

Article URL: ${article.url}
Article Title: ${article.title || ''}
Article Text (truncated): ${snippet}`

  async function callGroq(model: string) {
    const res = await fetch(GROQ_URL, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        response_format: { type: 'json_object' },
        temperature: 0.2,
        max_tokens: 700,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user }
        ]
      })
    })
    return res
  }

  let modelUsed = DEFAULT_MODEL
  let res = await callGroq(modelUsed)
  if (!res.ok) {
    const t = await res.text().catch(() => '')
    if (res.status === 400 && /(model_decommissioned|model not found|unsupported model)/i.test(t)) {
      const fallbacks = [
        'llama-3.1-8b-instant',
        'openai/gpt-oss-20b'
      ].filter(m => m !== modelUsed)
      for (const m of fallbacks) {
        modelUsed = m
        res = await callGroq(m)
        if (res.ok) break
      }
    }
  }

  if (!res.ok) {
    const t = await res.text().catch(() => '')
    throw new Error(`Groq error ${res.status}: ${res.statusText} ${t}`)
  }
  const data = await res.json()
  const text = (data?.choices?.[0]?.message?.content || '').trim()
  if (!text) throw new Error('Groq returned empty content')

  try {
    return JSON.parse(text)
  } catch {
    const m = text.indexOf('{'); const n = text.lastIndexOf('}')
    if (m >= 0 && n > m) return JSON.parse(text.slice(m, n + 1))
    throw new Error('Groq response was not valid JSON')
  }
}


