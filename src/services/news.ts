import axios from 'axios'
import { anthropic } from './claude'
import { generateTopHeadlines } from './gemini'
import { NewsStory, TopHeadline } from '@/types'

// Using NewsAPI.org - you'll need to get an API key
const NEWS_API_KEY = process.env.NEXT_PUBLIC_NEWS_API_KEY
const NEWS_API_URL = 'https://newsapi.org/v2/everything'

type NewsCategory = 
  | 'all' 
  | 'ai' 
  | 'climate' 
  | 'politics' 
  | 'technology' 
  | 'science'
  | 'economics'
  | 'sports'
  | 'education'
  | 'healthcare'
  | 'international'
  | 'business'

type SortOption = 'relevance' | 'date' | 'popularity'

// Prioritized news sources
const TRUSTED_SOURCES = [
  'The New York Times',
  'The Washington Post',
  'Reuters',
  'Associated Press',
  'The Wall Street Journal',
  'The Guardian',
  'BBC News',
  'Bloomberg',
  'The Economist',
  'Financial Times',
  'NPR',
  'CNBC',
  'CNN',
  'Time',
  'The Atlantic'
].map(s => s.toLowerCase())

function getFirstTextBlock(content: { type: string }[]): string | null {
  const textBlock = content.find((block): block is { type: 'text'; text: string } => block.type === 'text')
  return textBlock?.text ?? null
}

export async function getTopHeadlines(): Promise<TopHeadline[]> {
  try {
    // Try Gemini first, fallback to Claude
    try {
      return await generateTopHeadlines()
    } catch (geminiError) {
      console.warn('Gemini failed, falling back to Claude:', geminiError)
      
      const response = await anthropic.messages.create({
        model: 'claude-3-haiku-20240307',
        max_tokens: 1000,
        temperature: 0.7,
        system: `You are a news curator identifying the most important headlines of the day.
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
          [{"headline":"Example Headline","description":"Brief description","searchTerms":"relevant search terms"}]`,
        messages: [{
          role: 'user',
          content: 'What are the most significant headlines and topics being discussed today? Return in JSON format.'
        }]
      })

      try {
        const text = getFirstTextBlock(response.content)
        if (!text) throw new Error('No text in Claude response')
        const headlines = JSON.parse(text)
        if (Array.isArray(headlines) && headlines.length > 0) {
          return headlines
        }
      } catch (parseError) {
        console.error('Error parsing headlines:', parseError)
      }
      
      return getFallbackHeadlines()
    }
  } catch (error) {
    console.error('Error getting top headlines:', error)
    return getFallbackHeadlines()
  }
}

export async function getArticlesForHeadline(headline: TopHeadline): Promise<NewsStory[]> {
  try {
    // Get articles related to the headline using its search terms
    const response = await axios.get(NEWS_API_URL, {
      params: {
        q: headline.searchTerms,
        language: 'en',
        sortBy: 'relevancy',
        pageSize: 15,
        apiKey: NEWS_API_KEY
      }
    })

    const articles = response.data.articles.map((article: any) => ({
      id: article.url,
      headline: article.title,
      description: article.description,
      imageUrl: article.urlToImage || '/images/placeholder-news.jpg',
      date: new Date(article.publishedAt).toISOString(),
      url: article.url,
      source: article.source.name
    }))

    // Curate the most relevant articles
    return await curateArticlesForHeadline(articles, headline)
  } catch (error) {
    console.error('Error fetching articles for headline:', error)
    return []
  }
}

async function curateArticlesForHeadline(articles: NewsStory[], headline: TopHeadline): Promise<NewsStory[]> {
  try {
    const sortedArticles = articles.sort((a, b) => {
      const aIsTrusted = TRUSTED_SOURCES.includes((a.source || '').toLowerCase())
      const bIsTrusted = TRUSTED_SOURCES.includes((b.source || '').toLowerCase())
      if (aIsTrusted && !bIsTrusted) return -1
      if (!aIsTrusted && bIsTrusted) return 1
      return 0
    })

    const response = await anthropic.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 1000,
      temperature: 0.7,
      system: `You are selecting the most relevant and reliable articles.
        Return only a JSON array of 3 indices, like: [0,1,2]`,
      messages: [{
        role: 'user',
        content: `For the headline "${headline.headline}", select the 3 most relevant articles.
          Return only an array of 3 indices as JSON.
          Articles: ${JSON.stringify(sortedArticles.map(a => ({
            title: a.headline,
            description: a.description,
            source: a.source
          })))}`
      }]
    })

    try {
      const text = getFirstTextBlock(response.content)
      if (!text) throw new Error('No text in Claude response')
      const indices = JSON.parse(text)
      if (Array.isArray(indices) && indices.length > 0) {
        return indices.map(i => sortedArticles[i])
      }
    } catch (parseError) {
      console.error('Error parsing indices:', parseError)
    }

    return sortedArticles.slice(0, 3)
  } catch (error) {
    console.error('Error curating articles:', error)
    return articles.slice(0, 3)
  }
}

function getFallbackHeadlines(): TopHeadline[] {
  return [
    {
      headline: "Ukraine Crisis Escalates",
      description: "European leaders meet to discuss Ukraine situation amid growing tensions",
      searchTerms: "Ukraine crisis Europe summit negotiations"
    },
    {
      headline: "AI Regulation Debate",
      description: "Global debate intensifies over artificial intelligence regulation",
      searchTerms: "AI regulation policy artificial intelligence safety"
    },
    // ... add more fallback headlines
  ]
} 