'use client'

import { useState, useEffect } from 'react'
import { Search, Newspaper, Compass } from 'lucide-react'
import NewsCard from './NewsCard'
import { NewsStory, TopHeadline } from '@/types'
import Image from 'next/image'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'

interface NewsHubProps {
  initialHeadlines: TopHeadline[]
  initialArticles: Record<string, NewsStory[]>
}

type NewsView = 'daily' | 'search'

const TOPICS = {
  current: ['Politics', 'Economics', 'Technology'],
  society: ['Education', 'Healthcare', 'Environment'],
  global: ['International', 'Diplomacy', 'Trade'],
  culture: ['Sports', 'Entertainment', 'Arts']
}

export default function NewsHub({ initialHeadlines, initialArticles }: NewsHubProps) {
  const [view, setView] = useState<NewsView>('daily')
  const [headlines, setHeadlines] = useState(initialHeadlines)
  const [articlesByHeadline, setArticlesByHeadline] = useState(initialArticles)
  const [loading, setLoading] = useState(false)
  const [selectedHeadline, setSelectedHeadline] = useState<string>('')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTopic, setSelectedTopic] = useState<string>('')

  const updateArticles = async (headline: TopHeadline) => {
    setLoading(true)
    try {
      const response = await fetch(`/api/news/articles?headline=${encodeURIComponent(headline.headline)}&terms=${encodeURIComponent(headline.searchTerms)}`)
      const data = await response.json()
      setArticlesByHeadline(prev => ({
        ...prev,
        [headline.headline]: data
      }))
    } catch (error) {
      console.error('Error updating articles:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchArticlesByTopic = async (topic: string) => {
    setLoading(true)
    try {
      const response = await fetch(`/api/news?topic=${encodeURIComponent(topic)}`)
      const data = await response.json()
      if (data && data.length > 0) {
        setArticlesByHeadline({ [topic]: data }) // Store articles by topic
      } else {
        setArticlesByHeadline({ [topic]: [] }) // Handle no articles found
      }
    } catch (error) {
      console.error('Error fetching articles by topic:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchArticlesBySearch = async (query: string) => {
    setLoading(true)
    try {
      const response = await fetch(`/api/news?search=${encodeURIComponent(query)}`)
      const data = await response.json()
      if (data && data.length > 0) {
        setArticlesByHeadline({ [query]: data }) // Store articles by search query
      } else {
        setArticlesByHeadline({ [query]: [] }) // Handle no articles found
      }
    } catch (error) {
      console.error('Error fetching articles by search:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (selectedTopic) {
      fetchArticlesByTopic(selectedTopic)
    }
  }, [selectedTopic])

  useEffect(() => {
    if (searchQuery) {
      fetchArticlesBySearch(searchQuery)
    }
  }, [searchQuery])

  return (
    <div className="flex flex-col space-y-6">
      {/* Navigation Tabs */}
      <div className="flex border-b">
        <button
          onClick={() => setView('daily')}
          className={`flex items-center px-6 py-3 border-b-2 ${
            view === 'daily' 
              ? 'border-blue-600 text-blue-600' 
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <Newspaper className="w-5 h-5 mr-2" />
          Daily Digest
        </button>
        <button
          onClick={() => setView('search')}
          className={`flex items-center px-6 py-3 border-b-2 ${
            view === 'search' 
              ? 'border-blue-600 text-blue-600' 
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <Search className="w-5 h-5 mr-2" />
          Explore
        </button>
      </div>

      {/* Combined Search & Explore View */}
      {view === 'search' && (
        <div className="space-y-8">
          {/* Search Bar */}
          <div className="relative">
            <input
              type="text"
              placeholder="Search news articles..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 
                text-lg shadow-sm"
            />
            <Search className="absolute right-3 top-3.5 text-gray-400 w-5 h-5" />
          </div>

          {/* Topic Categories */}
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Explore by Topic</h2>
              {selectedTopic && (
                <button
                  onClick={() => setSelectedTopic('')}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  Clear Selection
                </button>
              )}
            </div>
            
            {Object.entries(TOPICS).map(([category, topics]) => (
              <div key={category} className="space-y-3">
                <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider">
                  {category}
                </h3>
                <div className="flex flex-wrap gap-2">
                  {topics.map((topic) => (
                    <button
                      key={topic}
                      onClick={() => setSelectedTopic(topic)}
                      className={`px-4 py-2 rounded-full transition-colors ${
                        selectedTopic === topic
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {topic}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Search Results */}
          {(searchQuery || selectedTopic) && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold">
                {searchQuery 
                  ? `Results for "${searchQuery}"`
                  : `Articles about ${selectedTopic}`
                }
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {loading ? (
                  Array(6).fill(0).map((_, i) => (
                    <div key={i} className="bg-white rounded-lg shadow-md h-96 animate-pulse">
                      <div className="h-48 bg-gray-200 rounded-t-lg" />
                      <div className="p-4 space-y-4">
                        <div className="h-6 bg-gray-200 rounded w-3/4" />
                        <div className="h-4 bg-gray-200 rounded w-full" />
                        <div className="h-4 bg-gray-200 rounded w-2/3" />
                      </div>
                    </div>
                  ))
                ) : (
                  articlesByHeadline[searchQuery || selectedTopic]?.length > 0 ? (
                    articlesByHeadline[searchQuery || selectedTopic].map((story) => (
                      <NewsCard key={story.id} story={story} />
                    ))
                  ) : (
                    <div className="col-span-3 text-center text-gray-500 py-12">
                      {searchQuery
                        ? "No articles found. Try adjusting your search."
                        : "No articles found for this topic."}
                    </div>
                  )
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Daily Digest View */}
      {view === 'daily' && (
        <div className="space-y-8">
          {headlines.map((headline, index) => (
            <div 
              key={headline.headline}
              className="bg-white rounded-lg shadow-lg overflow-hidden"
            >
              <div className="relative h-[400px] group">
                {/* Background Image */}
                {articlesByHeadline[headline.headline]?.[0] && (
                  <Image
                    src={articlesByHeadline[headline.headline][0].imageUrl || '/images/placeholder-news.jpg'}
                    alt={headline.headline}
                    fill
                    className="object-cover brightness-50 group-hover:brightness-40 transition-all"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement
                      target.src = '/images/placeholder-news.jpg'
                    }}
                  />
                )}

                {/* Story Badge */}
                <div className="absolute top-6 left-6">
                  <span className="px-3 py-1.5 bg-blue-600 text-white text-sm font-medium rounded">
                    Top Story {index + 1}
                  </span>
                </div>

                {/* Content Overlay */}
                <div className="absolute inset-0 p-8 flex flex-col justify-end text-white">
                  <div className="space-y-4">
                    <h2 className="text-3xl font-bold leading-tight">{headline.headline}</h2>
                    <p className="text-lg text-gray-200">{headline.description}</p>
                    
                    {/* Quick Stats */}
                    <div className="flex items-center space-x-6 text-sm text-gray-300 mt-4">
                      <div className="flex items-center">
                        <span>
                          {articlesByHeadline[headline.headline]?.length || 0} Sources Available
                        </span>
                      </div>
                      {articlesByHeadline[headline.headline]?.[0] && (
                        <>
                          <span>•</span>
                          <div className="flex items-center">
                            <span>
                              Featured: {articlesByHeadline[headline.headline][0].source}
                            </span>
                          </div>
                          <span>•</span>
                          <span>
                            {formatDistanceToNow(
                              new Date(articlesByHeadline[headline.headline][0].date),
                              { addSuffix: true }
                            )}
                          </span>
                        </>
                      )}
                    </div>

                    {/* Preview of Coverage */}
                    <div className="space-y-2 mt-4 text-sm text-gray-300">
                      {articlesByHeadline[headline.headline]?.slice(0, 2).map((article) => (
                        <div key={article.id}>
                          <span className="text-white font-medium">{article.source}:</span> {" "}
                          {article.headline.length > 100 
                            ? article.headline.substring(0, 100) + "..."
                            : article.headline
                          }
                        </div>
                      ))}
                    </div>

                    {/* Action Button */}
                    <button
                      onClick={() => setSelectedHeadline(headline.headline)}
                      className="inline-flex items-center px-6 py-3 mt-6 bg-white text-gray-900 rounded-lg 
                        hover:bg-gray-100 transition-colors group-hover:bg-blue-600 group-hover:text-white"
                    >
                      View Full Coverage
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Full Coverage View */}
      {selectedHeadline && view === 'daily' && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-2xl font-bold mb-2">
                    {headlines.find(h => h.headline === selectedHeadline)?.headline}
                  </h2>
                  <p className="text-gray-600">
                    {headlines.find(h => h.headline === selectedHeadline)?.description}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedHeadline('')}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>

              <div className="grid grid-cols-1 gap-6">
                {loading ? (
                  Array(3).fill(0).map((_, i) => (
                    <div key={i} className="bg-gray-100 h-32 animate-pulse rounded" />
                  ))
                ) : (
                  articlesByHeadline[selectedHeadline]?.map((story) => (
                    <div 
                      key={story.id}
                      className="border rounded-lg p-4 hover:shadow-lg transition-shadow"
                    >
                      <div className="flex justify-between mb-2">
                        <span className="font-medium text-blue-600">{story.source}</span>
                        <span className="text-sm text-gray-500">
                          {formatDistanceToNow(new Date(story.date), { addSuffix: true })}
                        </span>
                      </div>
                      <h3 className="text-xl font-semibold mb-2">{story.headline}</h3>
                      <p className="text-gray-600 mb-4">{story.description}</p>
                      <Link
                        href={story.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800"
                      >
                        Read Full Article →
                      </Link>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 