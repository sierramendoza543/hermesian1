'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Calendar, Users, TrendingUp, Filter } from 'lucide-react';

interface NewsStory {
  id: string;
  headline: string;
  summary: string;
  category: string;
  publishedAt: string;
  articleCount: number;
  keywords: string[];
  sentiment: 'positive' | 'negative' | 'neutral';
  importance: number;
  relatedVideos: string[];
}

export default function NewsStoriesPage() {
  const searchParams = useSearchParams();
  const [stories, setStories] = useState<NewsStory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('top');
  const [categories, setCategories] = useState<{ key: string, label: string }[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  useEffect(() => {
    setStories([]);
    setPage(1);
    setHasMore(true);
    fetchStories(1, true);
  }, [selectedCategory]);

  const fetchStories = async (pageToFetch = page, replace = false) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/news-stories?limit=24&category=${selectedCategory}&page=${pageToFetch}`);
      const data = await response.json();
      
      if (data.success) {
        setStories(prev => replace ? data.stories : [...prev, ...data.stories]);
        setCategories(data.categories || []);
        setHasMore(Boolean(data.hasMore));
        setPage(pageToFetch);
      } else {
        setError(data.error || 'Failed to fetch stories');
      }
    } catch (err) {
      setError('Network error occurred');
    } finally {
      setLoading(false);
    }
  };

  const loadMore = () => {
    if (!hasMore || loading) return;
    fetchStories(page + 1, false);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) {
      return 'Just now';
    } else if (diffInHours < 24) {
      return `${diffInHours}h ago`;
    } else {
      const diffInDays = Math.floor(diffInHours / 24);
      return `${diffInDays}d ago`;
    }
  };

  // Removed sentiment/importance visuals per request

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading news stories...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={() => { void fetchStories(); }}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <h1 className="text-2xl font-bold text-gray-900">News Stories</h1>
            </div>
            
            {/* Category Filter */}
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-500" />
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option key="top" value="top">All</option>
                {categories.map(({ key, label }) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Stories Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {stories.map((story) => (
            <div key={story.id} className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow">
              <div className="p-6">
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-500">{story.category}</span>
                  </div>
                </div>

                {/* Headline */}
                <h2 className="text-xl font-semibold text-gray-900 mb-3 line-clamp-2">
                  {story.headline}
                </h2>

                {/* Summary */}
                <p className="text-gray-600 mb-4 line-clamp-3">
                  {story.summary}
                </p>

                {/* Keywords */}
                <div className="flex flex-wrap gap-1 mb-4">
                  {story.keywords.slice(0, 4).map((keyword) => (
                    <span
                      key={keyword}
                      className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full"
                    >
                      {keyword}
                    </span>
                  ))}
                  {story.keywords.length > 4 && (
                    <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full">
                      +{story.keywords.length - 4} more
                    </span>
                  )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between text-sm text-gray-500">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      {formatDate(story.publishedAt)}
                    </div>
                    <div className="flex items-center gap-1">
                      <Users className="w-4 h-4" />
                      {story.articleCount} articles
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <TrendingUp className="w-4 h-4" />
                    {story.relatedVideos.length} videos
                  </div>
                </div>

                {/* Action Button */}
                <div className="mt-4">
                  <Link
                    href={`/stories/explore?title=${encodeURIComponent(story.headline)}&description=${encodeURIComponent(story.summary)}`}
                    className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-center block"
                  >
                    Explore Story
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>

        {stories.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">No stories found for the selected category.</p>
          </div>
        )}
        {hasMore && (
          <div className="text-center mt-8">
            <button
              onClick={loadMore}
              className="px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900"
            >
              Load more stories
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
