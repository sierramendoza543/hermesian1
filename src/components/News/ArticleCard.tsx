'use client';

import { Article } from '@/lib/dummyNews';

interface ArticleCardProps {
  article: Article;
}

export default function ArticleCard({ article }: ArticleCardProps) {
  return (
    <div className="block bg-white rounded-2xl shadow-md overflow-hidden hover:shadow-lg transition">
      <div className="p-6">
        <h3 className="text-lg font-medium mb-2 line-clamp-2">{article.title}</h3>
        <p className="text-gray-600 text-sm line-clamp-3">{article.summary}</p>
        <div className="mt-4 flex items-center justify-between">
          <span className="text-xs text-gray-500">{article.date}</span>
          <div className="flex items-center gap-2">
            <a
              href={article.url || '#'}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition text-sm"
            >
              Read
            </a>
          </div>
        </div>
      </div>
    </div>
  );
} 