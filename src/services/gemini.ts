import { GoogleGenerativeAI } from '@google/generative-ai'
import { google } from 'googleapis'

if (!process.env.GOOGLE_API_KEY) {
  console.warn('Missing Google API Key - Gemini features will be disabled')
}

// Initialize Gemini AI (only if API key is available)
export const genAI = process.env.GOOGLE_API_KEY ? new GoogleGenerativeAI(process.env.GOOGLE_API_KEY) : null

// Initialize Google APIs (only if API key is available)
export const youtube = process.env.GOOGLE_API_KEY ? google.youtube({
  version: 'v3',
  auth: process.env.GOOGLE_API_KEY
}) : null

export const storage = process.env.GOOGLE_API_KEY ? google.storage({
  version: 'v1',
  auth: process.env.GOOGLE_API_KEY
}) : null

// REST base for Gemini API (use REST to avoid SDK/model mismatch)
const GEMINI_REST_BASE = 'https://generativelanguage.googleapis.com/v1beta'
const GEMINI_FREE_MODEL = 'gemini-2.5-flash'
export const model = genAI ? genAI.getGenerativeModel({ model: GEMINI_FREE_MODEL }) : null

export async function generateDebateResponse(
  messages: { content: string; role: 'user' | 'assistant' }[],
  topic: string,
  viewpoint: 'for' | 'against' | 'neutral'
) {
  if (!genAI || !model) {
    throw new Error('Gemini AI is not available - Google API key is missing')
  }

  try {
    console.log('Generating Gemini response with:', { topic, viewpoint })
    console.log('Messages:', messages)

    // Convert messages to Gemini format
    const chat = model.startChat({
      history: messages.map(msg => ({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.content }]
      }))
    })

    const systemPrompt = `You are a debate partner discussing the topic: "${topic || 'technology and sustainability'}". 
      Your stance is "${viewpoint}". 
      Maintain a respectful, logical tone while presenting arguments aligned with your viewpoint.
      Keep responses concise (max 2-3 sentences).
      Use facts and logic to support your position.
      Ensure all responses are appropriate for all ages and avoid harmful content.
      Focus on constructive dialogue and mutual understanding.`

    const result = await chat.sendMessage(systemPrompt)
    const response = await result.response
    const text = response.text()

    if (!text) {
      throw new Error('No text in Gemini response')
    }

    console.log('Gemini Response Text:', text)
    return text

  } catch (error) {
    console.error('Error generating Gemini debate response:', error)
    if (error instanceof Error) {
      console.error('Error details:', error.message)
    }
    throw error
  }
}

export async function analyzeNewsContent(
  articles: any[],
  headline: string
): Promise<number[]> {
  if (!genAI || !model) {
    console.warn('Gemini AI not available, using fallback selection')
    return [0, 1, 2, 3, 4, 5].slice(0, Math.min(6, articles.length))
  }

  try {
    const prompt = `You are curating news articles to find the most relevant coverage of a specific headline.
      For the headline "${headline}", select articles that:
      1. Are from reputable sources
      2. Directly relate to the headline topic
      3. Provide comprehensive coverage
      4. Are recent and up-to-date
      5. Offer unique perspectives or additional context
      
      Articles to evaluate:
      ${JSON.stringify(articles.map((a, i) => ({
        index: i,
        title: a.headline || a.title,
        description: a.description,
        source: a.source,
        date: a.date
      })))}
      
      Return only a JSON array of indices for the 6 best articles, like: [0,1,2,3,4,5]`

    const result = await model.generateContent(prompt)
    const response = await result.response
    const text = response.text()

    try {
      const indices = JSON.parse(text)
      if (Array.isArray(indices) && indices.length > 0) {
        return indices
      }
    } catch (parseError) {
      console.error('Error parsing Gemini response:', parseError)
    }

    // Fallback to first 6 articles if AI curation fails
    return [0, 1, 2, 3, 4, 5].slice(0, Math.min(6, articles.length))

  } catch (error) {
    console.error('Error analyzing news content with Gemini:', error)
    return [0, 1, 2, 3, 4, 5].slice(0, Math.min(6, articles.length))
  }
}

export async function generateTopHeadlines(): Promise<any[]> {
  if (!genAI || !model) {
    console.warn('Gemini AI not available, using fallback headlines')
    return getFallbackHeadlines()
  }

  try {
    const prompt = `You are a news curator identifying the most important headlines of the day.
      Focus on major developments in:
      - International Affairs
      - Politics
      - Technology
      - Economy
      - Health
      - Climate
      - Social Issues
      
      Return exactly 6-8 major headlines in a valid JSON array format.
      Each headline should have: headline, description, and searchTerms fields.
      Example format:
      [{"headline":"Example Headline","description":"Brief description","searchTerms":"relevant search terms"}]`

    const result = await model.generateContent(prompt)
    const response = await result.response
    const text = response.text()

    try {
      const headlines = JSON.parse(text)
      if (Array.isArray(headlines) && headlines.length > 0) {
        return headlines
      }
    } catch (parseError) {
      console.error('Error parsing headlines:', parseError)
    }

    return getFallbackHeadlines()

  } catch (error) {
    console.error('Error getting top headlines with Gemini:', error)
    return getFallbackHeadlines()
  }
}

export async function analyzeYouTubeVideo(videoId: string): Promise<any> {
  if (!youtube || !genAI || !model) {
    throw new Error('YouTube API or Gemini AI is not available - Google API key is missing')
  }

  try {
    // Get video details
    const videoResponse = await youtube.videos.list({
      part: ['snippet', 'statistics', 'contentDetails'],
      id: [videoId]
    })

    if (!videoResponse.data.items || videoResponse.data.items.length === 0) {
      throw new Error('Video not found')
    }

    const video = videoResponse.data.items[0]
    const snippet = video.snippet
    const statistics = video.statistics

    // Use Gemini to analyze the video content
    const analysisPrompt = `Analyze this YouTube video for educational and debate value:
      
      Title: ${snippet?.title}
      Description: ${snippet?.description?.substring(0, 500)}...
      Channel: ${snippet?.channelTitle}
      Views: ${statistics?.viewCount}
      Likes: ${statistics?.likeCount}
      
      Provide analysis in JSON format with:
      - educationalValue: number (1-10)
      - debatePotential: number (1-10)
      - keyTopics: array of strings
      - summary: brief description
      - recommendedForDebate: boolean`

    const result = await model.generateContent(analysisPrompt)
    const response = await result.response
    const analysis = response.text()

    return {
      videoInfo: {
        id: videoId,
        title: snippet?.title,
        description: snippet?.description,
        channelTitle: snippet?.channelTitle,
        publishedAt: snippet?.publishedAt,
        viewCount: statistics?.viewCount,
        likeCount: statistics?.likeCount,
        duration: video.contentDetails?.duration
      },
      analysis: JSON.parse(analysis)
    }

  } catch (error) {
    console.error('Error analyzing YouTube video:', error)
    throw error
  }
}

export async function searchYouTubeVideos(query: string, maxResults: number = 10): Promise<any[]> {
  if (!youtube) {
    throw new Error('YouTube API is not available - Google API key is missing')
  }

  try {
    const response = await youtube.search.list({
      part: ['snippet'],
      q: query,
      maxResults,
      type: ['video'],
      order: 'relevance'
    })

    if (!response.data.items) {
      return []
    }

    return response.data.items.map(item => ({
      id: item.id?.videoId,
      title: item.snippet?.title,
      description: item.snippet?.description,
      channelTitle: item.snippet?.channelTitle,
      publishedAt: item.snippet?.publishedAt,
      thumbnail: item.snippet?.thumbnails?.default?.url
    }))

  } catch (error) {
    console.error('Error searching YouTube videos:', error)
    return []
  }
}

// Article analysis via Gemini removed along with analyze feature
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

export async function analyzeArticleWithGemini(article: { url: string; title?: string; text: string }): Promise<ArticleAnalysis> {
  const apiKey = process.env.GOOGLE_API_KEY
  if (!apiKey) {
    throw new Error('Gemini AI is not available - Google API key is missing')
  }

  // Pre-compress long articles to avoid MAX_TOKENS blocks
  const normalizedText = article.text.replace(/\s+/g, ' ').trim()
  let workingText = normalizedText
  if (normalizedText.length > 8000) {
    workingText = await compressArticleTextWithGemini(apiKey, normalizedText)
  }
  // Always cap the snippet to avoid triggering MAX_TOKENS on free tier
  const maxSnippet = workingText.slice(0, 4000)
  const prompt = `Analyze the following news article and return STRICT JSON with the schema:
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
  Article Text (truncated if long):\n\n${maxSnippet}`

  // Call REST API directly with the free model per docs
  const url = `${GEMINI_REST_BASE}/models/${encodeURIComponent(GEMINI_FREE_MODEL)}:generateContent`
  let res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': apiKey
    },
    body: JSON.stringify({
      generationConfig: {
        response_mime_type: 'application/json',
        temperature: 0.15,
        maxOutputTokens: 768
      },
      safetySettings: [
        { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_ONLY_HIGH' },
        { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_ONLY_HIGH' },
        { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_ONLY_HIGH' },
        { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_ONLY_HIGH' },
        { category: 'HARM_CATEGORY_CIVIC_INTEGRITY', threshold: 'BLOCK_ONLY_HIGH' }
      ],
      contents: [
        {
          parts: [
            { text: prompt }
          ]
        }
      ]
    })
  })
  if (!res.ok) {
    const errText = await res.text().catch(() => '')
    // If safety_settings invalid, retry once without safetySettings
    if (res.status === 400 && /safety_settings/i.test(errText)) {
      res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey
        },
        body: JSON.stringify({
          generationConfig: {
            response_mime_type: 'application/json',
            temperature: 0.2,
            maxOutputTokens: 2048
          },
          contents: [ { parts: [ { text: prompt } ] } ]
        })
      })
    }
    if (!res.ok) {
      const err2Text = await res.text().catch(() => '')
      const err = new Error(`Gemini REST error ${res.status}: ${res.statusText} ${err2Text || errText}`)
      ;(err as any).status = res.status
      throw err
    }
  }
  const data = await res.json()
  let text = (data?.candidates?.[0]?.content?.parts || [])
    .map((p: any) => p?.text || '')
    .join('')
    .trim()
  if (!text) {
    const block = data?.promptFeedback?.blockReason || data?.candidates?.[0]?.finishReason
    // Retry once with a shorter snippet and even simpler instruction
    const retrySnippet = workingText.slice(0, 2500)
    const retryPrompt = `Return ONLY valid JSON matching this schema, no prose, no markdown:
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
Article Text (truncated):\n\n${retrySnippet}`
    let retryRes = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey
      },
      body: JSON.stringify({
        generationConfig: {
          response_mime_type: 'application/json',
          temperature: 0.1,
          maxOutputTokens: 512
        },
        safetySettings: [
          { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_ONLY_HIGH' },
          { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_ONLY_HIGH' },
          { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_ONLY_HIGH' },
          { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_ONLY_HIGH' },
          { category: 'HARM_CATEGORY_CIVIC_INTEGRITY', threshold: 'BLOCK_ONLY_HIGH' }
        ],
        contents: [{ parts: [{ text: retryPrompt }] }]
      })
    })
    if (!retryRes.ok) {
      const retryErrText = await retryRes.text().catch(() => '')
      if (retryRes.status === 400 && /safety_settings/i.test(retryErrText)) {
        retryRes = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': apiKey
          },
          body: JSON.stringify({
            generationConfig: {
              response_mime_type: 'application/json',
              temperature: 0.1,
              maxOutputTokens: 1536
            },
            contents: [{ parts: [{ text: retryPrompt }] }]
          })
        })
      }
    }
    if (retryRes.ok) {
      const retryData = await retryRes.json()
      text = (retryData?.candidates?.[0]?.content?.parts || [])
        .map((p: any) => p?.text || '')
        .join('')
        .trim()
    }
    if (!text) {
      // If still empty and we hit MAX_TOKENS, do a minimal analysis with tiny context
      if (String(block).toUpperCase() === 'MAX_TOKENS') {
        const microSnippet = workingText.slice(0, 1200)
        const microPrompt = `Only output valid JSON with this minimal schema and keep values concise:
{
  "title": string,
  "url": string,
  "summary": string,
  "overallBias": "Left" | "Center-Left" | "Center" | "Center-Right" | "Right" | "Unknown",
  "sentiment": "negative" | "neutral" | "positive",
  "confidence": number,
  "keyPeople": string[],
  "keyTopics": string[]
}
Article URL: ${article.url}
Article Title: ${article.title || ''}
Article Text (very short extract):\n\n${microSnippet}`
        const microRes = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
          body: JSON.stringify({
            generationConfig: { response_mime_type: 'application/json', temperature: 0.05, maxOutputTokens: 384 },
            contents: [{ parts: [{ text: microPrompt }] }]
          })
        })
        if (microRes.ok) {
          const microData = await microRes.json()
          text = (microData?.candidates?.[0]?.content?.parts || []).map((p: any) => p?.text || '').join('').trim()
        }
      }
      if (!text) {
        const dbg = block ? ` Block reason: ${block}` : ''
        throw new Error('Gemini response missing text' + dbg)
      }
    }
  }
  let parsed: ArticleAnalysis
  try {
    parsed = JSON.parse(text)
  } catch (e) {
    // Try to recover JSON if model wrapped it in code fences or extra text
    const cleaned = extractJsonObject(text)
    try {
      parsed = JSON.parse(cleaned)
    } catch {
      throw new Error('Gemini response was not valid JSON')
    }
  }
  return parsed
}

function extractJsonObject(s: string): string {
  // Remove markdown code fences if present
  const fence = s.match(/```[a-zA-Z]*\n([\s\S]*?)\n```/)
  if (fence && fence[1]) {
    s = fence[1]
  }
  // Find the first balanced JSON object
  const start = s.indexOf('{')
  if (start === -1) return s
  let depth = 0
  for (let i = start; i < s.length; i++) {
    const ch = s[i]
    if (ch === '{') depth++
    else if (ch === '}') {
      depth--
      if (depth === 0) {
        return s.slice(start, i + 1)
      }
    }
  }
  return s
}

async function compressArticleTextWithGemini(apiKey: string, text: string): Promise<string> {
  const url = `${GEMINI_REST_BASE}/models/${encodeURIComponent(GEMINI_FREE_MODEL)}:generateContent`
  const chunks: string[] = []
  const chunkSize = 3500
  for (let i = 0; i < text.length; i += chunkSize) {
    chunks.push(text.slice(i, i + chunkSize))
    if (chunks.length === 3) break // cap to 3 chunks to stay within free tier comfortably
  }
  const summaries: string[] = []
  for (const chunk of chunks) {
    const prompt = `Summarize this news segment into 5-8 concise bullet points focusing on key facts, people, organizations, places, quotes. Output plain text bullets separated by newlines. No markdown, no commentary.\n\n${chunk}`
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify({
        generationConfig: { response_mime_type: 'text/plain', temperature: 0.2, maxOutputTokens: 384 },
        contents: [{ parts: [{ text: prompt }] }]
      })
    })
    if (!res.ok) {
      continue
    }
    const data = await res.json()
    const textOut = (data?.candidates?.[0]?.content?.parts || []).map((p: any) => p?.text || '').join('').trim()
    if (textOut) summaries.push(textOut)
  }
  const combined = summaries.join('\n')
  if (!combined) return text.slice(0, 6000)
  // Second pass: compress combined summary to an ultra-compact synopsis
  const compressPrompt = `Compress the following bullet points into a compact synopsis under 1200 characters, preserving key facts, names, quotes. Plain text only, no lists.\n\n${combined}`
  const cRes = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
    body: JSON.stringify({
      generationConfig: { response_mime_type: 'text/plain', temperature: 0.2, maxOutputTokens: 256 },
      contents: [{ parts: [{ text: compressPrompt }] }]
    })
  })
  if (!cRes.ok) return combined.slice(0, 1200)
  const cData = await cRes.json()
  const compact = (cData?.candidates?.[0]?.content?.parts || []).map((p: any) => p?.text || '').join('').trim()
  return (compact || combined).slice(0, 1200)
}

function getFallbackHeadlines() {
  return [
    {
      headline: "AI Development Accelerates Across Industries",
      description: "Major tech companies announce new AI initiatives and partnerships",
      searchTerms: "artificial intelligence technology development"
    },
    {
      headline: "Climate Change Policy Updates",
      description: "New environmental regulations and international agreements",
      searchTerms: "climate change policy environment"
    },
    {
      headline: "Economic Indicators Show Mixed Signals",
      description: "Latest economic data reveals complex market conditions",
      searchTerms: "economy market indicators"
    },
    {
      headline: "Healthcare Innovation Breakthroughs",
      description: "New medical technologies and treatments emerge",
      searchTerms: "healthcare medical innovation"
    },
    {
      headline: "International Relations Developments",
      description: "Key diplomatic events and global policy changes",
      searchTerms: "international diplomacy global politics"
    },
    {
      headline: "Technology Sector Growth",
      description: "Tech companies report strong quarterly results",
      searchTerms: "technology sector growth earnings"
    }
  ]
}
