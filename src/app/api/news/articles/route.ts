import { NewsStory } from '@/types'
import axios from 'axios'
import { anthropic } from '@/services/claude'
import { analyzeNewsContent } from '@/services/gemini'

const NEWS_API_KEY = process.env.NEXT_PUBLIC_NEWS_API_KEY
const NEWS_API_URL = 'https://newsapi.org/v2/everything'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const headline = searchParams.get('headline')
  const terms = searchParams.get('terms')
  const aiProvider = searchParams.get('aiProvider') || 'gemini'

  if (!headline || !terms) {
    return Response.json([], { status: 400 })
  }

  try {
    const response = await axios.get(NEWS_API_URL, {
      params: {
        q: terms,
        language: 'en',
        sortBy: 'relevancy',
        pageSize: 20, // Increased to give AI more options
        apiKey: NEWS_API_KEY
      }
    })

    const articles: NewsStory[] = response.data.articles.map((article: any) => ({
      id: article.url,
      headline: article.title,
      description: article.description,
      imageUrl: article.urlToImage,
      date: new Date(article.publishedAt).toISOString(),
      url: article.url,
      source: article.source.name
    }))

    let indices: number[] = []

    // Choose AI provider for content curation
    if (aiProvider === 'gemini') {
      try {
        indices = await analyzeNewsContent(articles, headline)
      } catch (geminiError) {
        console.warn('Gemini failed, falling back to Claude:', geminiError)
        // Fallback to Claude
        const aiResponse = await anthropic.messages.create({
          model: 'claude-3-haiku-20240307',
          max_tokens: 1000,
          temperature: 0.7,
          system: `You are curating news articles to find the most relevant coverage of a specific headline.
            For the headline "${headline}", select articles that:
            1. Are from reputable sources
            2. Directly relate to the headline topic
            3. Provide comprehensive coverage
            4. Are recent and up-to-date
            5. Offer unique perspectives or additional context
            Return only a JSON array of indices for the 6 best articles, like: [0,1,2,3,4,5]`,
          messages: [{
            role: 'user',
            content: `Select the 6 most relevant articles for the headline "${headline}".
              Return only an array of indices as JSON.
              Articles: ${JSON.stringify(articles.map(a => ({
                title: a.headline,
                description: a.description,
                source: a.source,
                date: a.date
              })))}`
          }]
        })

        try {
          indices = JSON.parse(aiResponse.content[0].type === 'text' ? aiResponse.content[0].text : '[]')
        } catch (parseError) {
          console.error('Error parsing Claude response:', parseError)
        }
      }
    } else {
      // Use Claude
      const aiResponse = await anthropic.messages.create({
        model: 'claude-3-haiku-20240307',
        max_tokens: 1000,
        temperature: 0.7,
        system: `You are curating news articles to find the most relevant coverage of a specific headline.
          For the headline "${headline}", select articles that:
          1. Are from reputable sources
          2. Directly relate to the headline topic
          3. Provide comprehensive coverage
          4. Are recent and up-to-date
          5. Offer unique perspectives or additional context
          Return only a JSON array of indices for the 6 best articles, like: [0,1,2,3,4,5]`,
        messages: [{
          role: 'user',
          content: `Select the 6 most relevant articles for the headline "${headline}".
            Return only an array of indices as JSON.
            Articles: ${JSON.stringify(articles.map(a => ({
              title: a.headline,
              description: a.description,
              source: a.source,
              date: a.date
            })))}`
        }]
      })

      try {
        indices = JSON.parse(aiResponse.content[0].type === 'text' ? aiResponse.content[0].text : '[]')
      } catch (parseError) {
        console.error('Error parsing AI response:', parseError)
      }
    }

    if (Array.isArray(indices) && indices.length > 0) {
      return Response.json({
        articles: indices.map(i => articles[i]),
        aiProvider: aiProvider === 'gemini' ? 'gemini' : 'claude'
      })
    }

    // Fallback to first 6 articles if AI curation fails
    return Response.json({
      articles: articles.slice(0, 6),
      aiProvider: 'fallback'
    })
  } catch (error) {
    console.error('Error fetching articles:', error)
    return Response.json([], { status: 500 })
  }
} 