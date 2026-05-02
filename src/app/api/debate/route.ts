import { NextResponse } from 'next/server'
import { generateDebateResponse as claudeResponse } from '@/services/claude'
import { generateDebateResponse as geminiResponse } from '@/services/gemini'

export async function POST(request: Request) {
  try {
    const { messages, topic, viewpoint, aiProvider = 'gemini' } = await request.json()
    
    console.log('Debate API Request:', { topic, viewpoint, aiProvider })
    console.log('Messages:', messages)

    let response: string

    // Choose AI provider based on request or fallback logic
    if (aiProvider === 'gemini') {
      try {
        response = await geminiResponse(messages, topic, viewpoint)
      } catch (geminiError) {
        console.warn('Gemini failed, falling back to Claude:', geminiError)
        response = await claudeResponse(messages, topic, viewpoint)
      }
    } else if (aiProvider === 'claude') {
      try {
        response = await claudeResponse(messages, topic, viewpoint)
      } catch (claudeError) {
        console.warn('Claude failed, falling back to Gemini:', claudeError)
        response = await geminiResponse(messages, topic, viewpoint)
      }
    } else {
      // Default to Gemini first, then Claude
      try {
        response = await geminiResponse(messages, topic, viewpoint)
      } catch (geminiError) {
        console.warn('Gemini failed, falling back to Claude:', geminiError)
        response = await claudeResponse(messages, topic, viewpoint)
      }
    }
    
    if (!response) {
      throw new Error('No response from AI')
    }

    console.log('AI Response:', response)

    return NextResponse.json({ 
      response,
      aiProvider: aiProvider === 'gemini' ? 'gemini' : 'claude'
    })
  } catch (error) {
    console.error('Debate API Error:', error)
    return NextResponse.json(
      { error: 'Failed to generate response', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
} 