import { NextResponse } from 'next/server'
import { generateDebateResponse as claudeResponse } from '@/services/claude'
import { generateDebateResponse as geminiResponse } from '@/services/gemini'
import { rateLimited, sanitizeShortText } from '@/lib/apiGuard'

const VIEWPOINTS = ['for', 'against', 'neutral'] as const
type Viewpoint = (typeof VIEWPOINTS)[number]
const MAX_MESSAGES = 30
const MAX_MESSAGE_LENGTH = 2000

export async function POST(request: Request) {
  if (rateLimited(request, 'debate', 20)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  try {
    const body = await request.json()
    const topic = sanitizeShortText(body.topic)
    const viewpoint: Viewpoint = VIEWPOINTS.includes(body.viewpoint) ? body.viewpoint : 'neutral'
    const aiProvider = body.aiProvider === 'claude' ? 'claude' : 'gemini'

    if (!Array.isArray(body.messages) || body.messages.length === 0) {
      return NextResponse.json({ error: 'messages is required' }, { status: 400 })
    }
    const messages = body.messages.slice(-MAX_MESSAGES).map((m: any) => ({
      role: m?.role === 'assistant' ? 'assistant' : 'user',
      content: String(m?.content ?? '').slice(0, MAX_MESSAGE_LENGTH)
    })) as { content: string; role: 'user' | 'assistant' }[]

    const primary = aiProvider === 'gemini' ? geminiResponse : claudeResponse
    const fallback = aiProvider === 'gemini' ? claudeResponse : geminiResponse
    const names = aiProvider === 'gemini' ? ['gemini', 'claude'] : ['claude', 'gemini']

    let response: string
    let used = names[0]
    try {
      response = await primary(messages, topic, viewpoint)
    } catch (primaryError) {
      console.warn(`${names[0]} failed, falling back to ${names[1]}:`, primaryError)
      response = await fallback(messages, topic, viewpoint)
      used = names[1]
    }

    if (!response) {
      throw new Error('No response from AI')
    }

    return NextResponse.json({ response, aiProvider: used })
  } catch (error) {
    console.error('Debate API Error:', error)
    return NextResponse.json({ error: 'Failed to generate response' }, { status: 500 })
  }
}
