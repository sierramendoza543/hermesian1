'use client';

import { useState, useEffect } from 'react';
import ArticleCard from './ArticleCard';
import FilterBar from './FilterBar';
import { Article } from '@/types';

const DigestContainer = () => {
  type ArticleWithTopic = Article & { topic: string }
  const [articles, setArticles] = useState<ArticleWithTopic[]>([]);
  const [filteredArticles, setFilteredArticles] = useState<ArticleWithTopic[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchNews = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await fetch('/api/news');
        if (!res.ok) {
          throw new Error('Failed to fetch news');
        }
        const data = await res.json();
        const withTopics: ArticleWithTopic[] = (data || []).map((a: Article) => ({ ...a, topic: categorizeArticle(a) }))
        setArticles(withTopics);
        setFilteredArticles(withTopics);
      } catch (e) {
        console.error(e);
        setError('Unable to load news. Try again later.');
      } finally {
        setIsLoading(false);
      }
    };
    fetchNews();
  }, []);

  const handleSearch = (query: string) => {
    const q = query.toLowerCase()
    const filtered = articles.filter(article => 
      article.title.toLowerCase().includes(q) ||
      article.summary.toLowerCase().includes(q) ||
      article.topic.toLowerCase().includes(q)
    );
    setFilteredArticles(filtered);
  };

  const handleCategoryChange = (category: string) => {
    if (category === 'All') {
      setFilteredArticles(articles);
    } else {
      const filtered = articles.filter(article => 
        article.topic.toLowerCase() === category.toLowerCase()
      );
      setFilteredArticles(filtered);
    }
  };

  const handleRefresh = () => {
    window.location.reload();
  };

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-500">{error}</p>
        <button
          onClick={handleRefresh}
          className="mt-4 px-4 py-2 border-2 border-black text-black rounded-lg hover:bg-primary hover:text-black transition"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <FilterBar
        onSearch={handleSearch}
        onCategoryChange={handleCategoryChange}
        onRefresh={handleRefresh}
      />
      
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-white rounded-2xl shadow-md p-6 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
              <div className="h-4 bg-gray-200 rounded w-full mb-4"></div>
              <div className="h-4 bg-gray-200 rounded w-2/3"></div>
            </div>
          ))}
        </div>
      ) : filteredArticles.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-600">No articles found. Try a different search or category.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredArticles.map((article) => (
            <ArticleCard key={article.id} article={article} />
          ))}
        </div>
      )}
    </div>
  );
};

export default DigestContainer; 

function categorizeArticle(article: Article): string {
  const text = `${article.title} ${article.summary}`.toLowerCase()
  const matches = (words: string[]) => words.some(w => text.includes(w))
  if (matches(['election', 'congress', 'senate', 'house', 'president', 'minister', 'parliament', 'policy', 'campaign'])) return 'Politics'
  if (matches(['startup', 'market', 'stocks', 'earnings', 'revenue', 'economy', 'inflation', 'fed'])) return 'Business'
  if (matches(['ai', 'artificial intelligence', 'chip', 'semiconductor', 'software', 'app', 'tech', 'google', 'apple', 'microsoft'])) return 'Technology'
  if (matches(['study', 'researchers', 'quantum', 'space', 'nasa', 'astronomers', 'physics', 'biology'])) return 'Science'
  if (matches(['covid', 'vaccine', 'hospital', 'health', 'disease', 'medicine', 'mental health'])) return 'Health'
  if (matches(['climate', 'emissions', 'wildfire', 'hurricane', 'flood', 'temperature', 'heatwave', 'environment'])) return 'Climate'
  if (matches(['world cup', 'nfl', 'nba', 'soccer', 'mlb', 'tennis', 'olympics', 'game'])) return 'Sports'
  if (matches(['film', 'movie', 'tv', 'series', 'celebrity', 'music', 'album', 'hollywood'])) return 'Entertainment'
  if (matches(['europe', 'china', 'india', 'russia', 'ukraine', 'united nations', 'israel', 'gaza'])) return 'World'
  return 'Business'
}