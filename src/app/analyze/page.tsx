'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, ExternalLink } from 'lucide-react';

export default function AnalyzePage() {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const canSearch = useMemo(() => query.trim().length >= 3, [query])

  const search = async () => {
    if (!canSearch) return
    setLoading(true)
    setError('')
    setResults([])
    try {
      const params = new URLSearchParams({ q: query, pageSize: '12' })
      const res = await fetch(`/api/news/search?${params.toString()}`)
      const data = await res.json()
      if (data.success) {
        const cleaned = (data.articles || [])
          .map((a: any) => ({
            ...a,
            description: String(a.description || '').replace(/<[^>]+>/g, '').trim(),
            title: String(a.title || '').trim()
          }))
          .filter((a: any) => a.title && a.description)
        setResults(cleaned)
      } else {
        setError(data.error || 'No results found')
      }
    } catch (e) {
      setError('Network error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-2">
          Analyze Articles
        </h1>
        <p className="text-gray-600 mb-6">Enter a headline or keywords, pick the closest article, then we’ll analyze it.</p>

        <div className="flex gap-2 mb-6">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') search() }}
            className="flex-1 border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Search by headline or keywords"
          />
          <button
            onClick={search}
            disabled={!canSearch}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg disabled:bg-gray-400 flex items-center gap-2"
          >
            <Search className="w-4 h-4" /> Analyze
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-700 rounded">{error}</div>
        )}

        <div className="grid grid-cols-1 gap-6">
          {/* Results */}
          {!loading && results.length > 0 && (
            <div>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {results.map((a: any) => (
                  <div key={a.id} className="bg-white rounded-lg shadow p-4">
                    <div className="text-xs text-gray-500 mb-1">{a.source}</div>
                    <div className="font-medium text-gray-900 mb-1 line-clamp-2">{a.title}</div>
                    <div className="text-sm text-gray-600 line-clamp-3 mb-3">{a.description}</div>
                    <div className="flex items-center justify-between">
                      <a href={a.url} target="_blank" rel="noopener noreferrer" className="text-sm px-3 py-1 border rounded flex items-center gap-1">
                        <ExternalLink className="w-3 h-3"/> Read
                      </a>
                      <button
                        onClick={() => router.push(`/analyze/results?url=${encodeURIComponent(a.url)}`)}
                        className="text-sm px-3 py-1 bg-blue-600 text-white rounded"
                      >Analyze</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {loading && (
            <div className="text-gray-600">Searching…</div>
          )}
        </div>
      </div>
    </div>
  )
}


