'use client';

import Link from 'next/link';
import { Bookmark, BarChart2 } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import { Article } from '@/types';

interface ArticleCardProps {
  article: Article;
}

const ArticleCard = ({ article }: ArticleCardProps) => {
  const { favorites, setFavorites } = useApp()
  const isSaved = favorites.has(article.id)

  const toggleSave = () => {
    const next = new Set(favorites)
    if (next.has(article.id)) next.delete(article.id)
    else next.add(article.id)
    setFavorites(next)
  }

  return (
    <div className="bg-white rounded-2xl shadow-md overflow-hidden">
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm">{new Date(article.date).toLocaleDateString()}</span>
          <span className="text-sm">{article.category}</span>
        </div>
        <h3 className="text-lg font-medium mb-2 line-clamp-2">{article.title}</h3>
        <p className="text-sm mb-4 line-clamp-3">{article.summary}</p>
        <div className="flex items-center justify-between">
          <button
            onClick={toggleSave}
            className={`${isSaved ? 'border-2 rounded-lg transition flex items-center gap-2' : 'bg-white text-black border-2 border-black rounded-lg transition flex items-center gap-2'} px-4 py-2`}
            style={isSaved ? { backgroundColor: '#966c6b', color: '#ffffff', borderColor: '#ffffff' } : undefined}
            aria-pressed={isSaved}
          >
            <Bookmark size={16} />
            {isSaved ? 'Saved' : 'Save'}
          </button>
          <a
            href={article.url || '#'}
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 border-2 border-black text-black rounded-lg hover:bg-primary hover:text-black transition flex items-center gap-2"
            aria-label={`Read article: ${article.title}`}
          >
            <BarChart2 size={16} />
            Read
          </a>
        </div>
      </div>
    </div>
  );
};

export default ArticleCard; 