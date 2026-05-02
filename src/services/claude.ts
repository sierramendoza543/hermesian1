import Anthropic from '@anthropic-ai/sdk'

const anthropicApiKey = process.env.ANTHROPIC_API_KEY
export const anthropic = anthropicApiKey
  ? new Anthropic({ apiKey: anthropicApiKey })
  : null

export async function generateDebateResponse(
  messages: { content: string; role: 'user' | 'assistant' }[],
  topic: string,
  viewpoint: 'for' | 'against' | 'neutral'
) {
  if (!anthropic) {
    throw new Error('Anthropic API key is not configured')
  }
  try {
    console.log('Generating response with:', { topic, viewpoint })
    console.log('Messages:', messages)

    const response = await anthropic.messages.create({
      model: 'claude-3-opus-20240229',
      max_tokens: 150,
      temperature: 0.7,
      system: `You are a debate partner discussing the topic: "${topic || 'technology and sustainability'}". 
        Your stance is "${viewpoint}". 
        Maintain a respectful, logical tone while presenting arguments aligned with your viewpoint.
        Keep responses concise (max 2-3 sentences).
        Use facts and logic to support your position.
        Ensure all responses are appropriate for all ages and avoid harmful content.
        Focus on constructive dialogue and mutual understanding.`,
      messages: messages
    })

    if (!response || !response.content || response.content.length === 0) {
      throw new Error('Empty response from Claude')
    }

    const firstTextBlock = response.content.find(
      (block): block is Anthropic.TextBlock => block.type === 'text'
    )
    const text = firstTextBlock?.text

    if (!text) {
      throw new Error('No text in Claude response')
    }

    console.log('Claude Response Text:', text)
    return text

  } catch (error) {
    console.error('Error generating debate response:', error)
    if (error instanceof Error) {
      console.error('Error details:', error.message)
    }
    throw error
  }
} 