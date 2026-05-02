'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, ExternalLink, Calendar, TrendingUp } from 'lucide-react';

interface ArticleMatch {
  id: string;
  title: string;
  description: string;
  source: string;
  url: string;
  publishedAt: string;
  similarity: number;
  matchingKeywords: string[];
  summary: string;
}

export default function ExploreStoryPage() {
  const searchParams = useSearchParams();
  const [articles, setArticles] = useState<ArticleMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [videoTitle, setVideoTitle] = useState('');

  useEffect(() => {
    const title = searchParams.get('title') || '';
    const description = searchParams.get('description') || '';
    
    console.log('ExploreStoryPage - Received params:', { title, description });
    
    if (title || description) {
      setVideoTitle(title);
      searchArticles(title, description);
    } else {
      setError('No video information provided');
      setLoading(false);
    }
  }, [searchParams]);

  const searchArticles = async (title: string, description: string) => {
    try {
      console.log('Searching articles for:', { title, description });
      setLoading(true);
      const params = new URLSearchParams({
        title,
        description,
        limit: '10'
      });
      
      const response = await fetch(`/api/search-articles?${params}`);
      console.log('API response status:', response.status);
      
      const data = await response.json();
      console.log('API response data:', data);
      
      if (data.success) {
        setArticles(data.articles || []);
      } else {
        setError(data.error || 'Failed to search articles');
      }
    } catch (err) {
      console.error('Error searching articles:', err);
      setError('Network error occurred');
    } finally {
      setLoading(false);
    }
  };

  // Removed stories block per request: explore shows only related articles

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

  const getSimilarityColor = (similarity: number) => {
    if (similarity >= 70) return 'text-green-600 bg-green-100';
    if (similarity >= 50) return 'text-yellow-600 bg-yellow-100';
    if (similarity >= 30) return 'text-orange-600 bg-orange-100';
    return 'text-red-600 bg-red-100';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Searching for related articles...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <Link
            href="/scroll-feed"
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Back to Scroll Feed
          </Link>
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
              <Link 
                href="/scroll-feed"
                className="flex items-center gap-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
                Back to Scroll Feed
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Explore the Story Further</h1>
                <p className="text-sm text-gray-600">Related articles for: {videoTitle}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {articles.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">No related articles found for this video.</p>
            <Link
              href="/scroll-feed"
              className="mt-4 inline-block px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Back to Scroll Feed
            </Link>
          </div>
        ) : (
          <>
            <div className="mb-3">
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp className="w-5 h-5 text-blue-600" />
                <h2 className="text-lg font-semibold text-gray-900">Related Articles</h2>
              </div>
            </div>

            {/* Articles Grid */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {articles.map((article) => (
                <div key={article.id} className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow">
                  <div className="p-6">
                    {/* Header */}
                    <div className="flex items-start justify-between mb-4">
                      <span className="text-sm text-gray-500">{article.source}</span>
                      <div className="flex items-center gap-1 text-xs text-gray-500">
                        <Calendar className="w-3 h-3" />
                        {formatDate(article.publishedAt)}
                      </div>
                    </div>

                    {/* Title */}
                    <h3 className="text-lg font-semibold text-gray-900 mb-3 line-clamp-2">
                      {article.title}
                    </h3>

                    {/* Description */}
                    <p className="text-gray-600 mb-4 line-clamp-3">
                      {article.description}
                    </p>

                    {/* Matching Keywords */}
                    <div className="mb-4">
                      <p className="text-xs text-gray-500 mb-2">Matching keywords:</p>
                      <div className="flex flex-wrap gap-1">
                        {article.matchingKeywords.map((keyword) => (
                          <span
                            key={keyword}
                            className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full"
                          >
                            {keyword}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-start gap-2">
                      <a
                        href={article.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                      >
                        <ExternalLink className="w-4 h-4" />
                        Read
                      </a>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Back to Scroll Feed */}
            <div className="mt-8 text-center">
              <Link
                href="/scroll-feed"
                className="inline-flex items-center gap-2 px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Continue Watching
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}