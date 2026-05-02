'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ExternalLink, Calendar, Info } from 'lucide-react';

interface ArticleMatch {
  id: string;
  title: string;
  description: string;
  source: string;
  url: string;
  publishedAt: string;
  matchingKeywords: string[];
  quickStats?: { biasScore: number; ideology: 'Left'|'Center'|'Right'; color: string };
}

export default function StoryExplorePage() {
  const searchParams = useSearchParams();
  const title = searchParams.get('title') || '';
  const description = searchParams.get('description') || '';
  const [articles, setArticles] = useState<ArticleMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const params = new URLSearchParams({ title, description, limit: '18' });
        const res = await fetch(`/api/search-articles?${params}`);
        const data = await res.json();
        if (data.success) {
          setArticles(data.articles || []);
        } else {
          setError(data.error || 'Failed to fetch articles');
        }
      } catch (e) {
        setError('Network error');
      } finally {
        setLoading(false);
      }
    };
    if (title || description) fetchData();
  }, [title, description]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-600 flex items-center gap-2"><Info className="w-4 h-4"/> Loading articles…</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-red-600">{error}</div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Explore Story</h1>
      <p className="text-gray-600 mb-6">Related to: {title}</p>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {articles.map((a) => (
          <div key={a.id} className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow">
            <div className="p-6">
              <div className="flex items-start justify-between mb-3">
                <span className="text-sm text-gray-500">{a.source}</span>
                <div className="text-xs text-gray-500 flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {new Date(a.publishedAt).toLocaleDateString()}
                </div>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-2">{a.title}</h3>
              <p className="text-gray-600 text-sm line-clamp-3 mb-3">{a.description}</p>
              <div className="flex items-center gap-2 mb-3">
                <div className="flex flex-wrap gap-1">
                  {(a.matchingKeywords || []).slice(0,3).map(k => (
                    <span key={k} className="px-2 py-0.5 bg-gray-100 text-gray-700 text-xs rounded-full">{k}</span>
                  ))}
                </div>
              </div>
              <div className="flex items-center justify-start gap-2">
                <a href={a.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
                  <ExternalLink className="w-4 h-4"/> Read
                </a>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}


