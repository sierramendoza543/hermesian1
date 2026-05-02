'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';

interface ArticleAnalysis {
  title: string
  url: string
  wordCount: number
  summary: string
  sentiment: 'negative' | 'neutral' | 'positive'
  overallBias: 'Left' | 'Center-Left' | 'Center' | 'Center-Right' | 'Right' | 'Unknown'
  confidence: number
  keyPeople: string[]
  keyOrganizations: string[]
  keyPlaces: string[]
  keyTopics: string[]
  keyQuotes: { quote: string; speaker?: string; context?: string }[]
  rhetoric: { fallacies: string[]; emotionalAppeals: string[]; loadedLanguage: string[] }
  factuality: { claimsToCheck: string[]; citationQuality: 'Low'|'Medium'|'High' }
  readingLevel: 'Easy' | 'Intermediate' | 'Advanced'
}

export default function AnalyzeResultsPage() {
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [analysis, setAnalysis] = useState<ArticleAnalysis | null>(null)
  const [suggestions, setSuggestions] = useState<any[]>([])

  useEffect(() => {
    const headline = searchParams.get('headline')
    const url = searchParams.get('url')
    if (!headline && !url) {
      setError('Missing headline or URL')
      setLoading(false)
      return
    }
    const run = async () => {
      setLoading(true)
      setError('')
      try {
        const query = headline ? `headline=${encodeURIComponent(headline)}` : `url=${encodeURIComponent(url!)}`
        const res = await fetch(`/api/analyze?${query}`)
        const data = await res.json()
        if (data.success) {
          setAnalysis(data.analysis)
        } else if (data.suggestions) {
          setSuggestions(data.suggestions)
        } else {
          setError(data.error || 'Failed to analyze article')
        }
      } catch (e) {
        setError('Network error')
      } finally {
        setLoading(false)
      }
    }
    run()
  }, [searchParams])

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Analysis</h1>

        {loading && (
          <div className="text-gray-600">Analyzing article…</div>
        )}

        {!loading && error && (
          <div className="mb-4 p-3 bg-red-50 text-red-700 rounded">
            {error}
          </div>
        )}

        {!loading && suggestions.length > 0 && (
          <div className="bg-white rounded-lg p-4 shadow">
            <div className="text-gray-900 font-semibold mb-2">We couldn’t find an exact match. Try one of these:</div>
            <ul className="space-y-2">
              {suggestions.map((s, i) => (
                <li key={s.id || i} className="border rounded p-3">
                  <div className="text-sm text-gray-500">{s.source}</div>
                  <div className="font-medium text-gray-900">{s.title}</div>
                  <div className="text-sm text-gray-600 line-clamp-2">{s.description}</div>
                  <div className="mt-2 flex gap-2">
                    <a href={s.url} target="_blank" rel="noopener noreferrer" className="px-3 py-1 text-sm bg-gray-900 text-white rounded">Read</a>
                    <button
                      onClick={async () => {
                        setLoading(true)
                        setError('')
                        setAnalysis(null)
                        try {
                          const res = await fetch('/api/analyze', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ article: s })
                          })
                          const data = await res.json()
                          if (data.success) setAnalysis(data.analysis)
                          else setError(data.error || 'Failed to analyze')
                        } catch {
                          setError('Network error')
                        } finally {
                          setLoading(false)
                        }
                      }}
                      className="px-3 py-1 text-sm bg-blue-600 text-white rounded"
                    >Analyze</button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        {analysis && (
          <div className="grid md:grid-cols-3 gap-6">
            <div className="md:col-span-2 space-y-6">
              <div className="bg-white rounded-lg p-6 shadow">
                <div className="text-sm text-gray-500 mb-1">{analysis.url}</div>
                <h2 className="text-xl font-semibold text-gray-900 mb-2">{analysis.title}</h2>
                <p className="text-gray-700 whitespace-pre-line">{analysis.summary}</p>
              </div>

              {/* Rhetoric */}
              <div className="bg-white rounded-lg p-6 shadow">
                <h3 className="font-semibold text-gray-900 mb-3">Rhetoric Signals</h3>
                <div className="grid sm:grid-cols-3 gap-4">
                  <div>
                    <div className="text-xs text-gray-500 mb-1">Fallacies</div>
                    <ul className="space-y-1 list-disc pl-5">
                      {analysis.rhetoric.fallacies.slice(0,6).map((f, i) => (<li key={i} className="text-gray-800 text-sm">{f}</li>))}
                      {analysis.rhetoric.fallacies.length === 0 && (<li className="text-gray-500 text-sm list-none">None detected</li>)}
                    </ul>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 mb-1">Emotional Appeals</div>
                    <ul className="space-y-1 list-disc pl-5">
                      {analysis.rhetoric.emotionalAppeals.slice(0,6).map((f, i) => (<li key={i} className="text-gray-800 text-sm">{f}</li>))}
                      {analysis.rhetoric.emotionalAppeals.length === 0 && (<li className="text-gray-500 text-sm list-none">None detected</li>)}
                    </ul>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 mb-1">Loaded Language</div>
                    <ul className="space-y-1 list-disc pl-5">
                      {analysis.rhetoric.loadedLanguage.slice(0,6).map((f, i) => (<li key={i} className="text-gray-800 text-sm">{f}</li>))}
                      {analysis.rhetoric.loadedLanguage.length === 0 && (<li className="text-gray-500 text-sm list-none">None detected</li>)}
                    </ul>
                  </div>
                </div>
              </div>

              {/* Factuality */}
              <div className="bg-white rounded-lg p-6 shadow">
                <h3 className="font-semibold text-gray-900 mb-3">Factuality & Verification</h3>
                <div className="mb-3">
                  <div className="text-xs text-gray-500 mb-1">Citation Quality</div>
                  <div className="inline-block px-2 py-1 rounded bg-gray-100 text-gray-800 text-xs">{analysis.factuality.citationQuality}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 mb-1">Claims To Check</div>
                  <ul className="space-y-1 list-disc pl-5">
                    {analysis.factuality.claimsToCheck.slice(0,8).map((c, i) => (<li key={i} className="text-gray-800 text-sm">{c}</li>))}
                    {analysis.factuality.claimsToCheck.length === 0 && (<li className="text-gray-500 text-sm list-none">None listed</li>)}
                  </ul>
                </div>
              </div>

              <div className="bg-white rounded-lg p-6 shadow">
                <h3 className="font-semibold text-gray-900 mb-3">Key Quotes</h3>
                <ul className="space-y-3">
                  {analysis.keyQuotes.map((q, idx) => (
                    <li key={idx} className="border-l-4 border-blue-600 pl-3">
                      <div className="text-gray-900">“{q.quote}”</div>
                      {q.speaker && <div className="text-sm text-gray-600">— {q.speaker}</div>}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="space-y-6">
              <div className="bg-white rounded-lg p-6 shadow">
                <h3 className="font-semibold text-gray-900 mb-3">Bias & Sentiment</h3>
                <div className="text-sm text-gray-600">Overall Bias</div>
                <div className="text-lg font-semibold mb-2">{analysis.overallBias}</div>
                {/* Bias spectrum bar */}
                <div className="mt-2 mb-4">
                  <div className="text-xs text-gray-500 mb-1">Spectrum</div>
                  <div className="h-2 bg-gray-200 rounded relative">
                    <div
                      className="absolute -top-1 h-4 w-1 bg-blue-600 rounded"
                      style={{ left: `${biasToPercent(analysis.overallBias)}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>Left</span>
                    <span>Center</span>
                    <span>Right</span>
                  </div>
                </div>
                <div className="text-sm text-gray-600">Sentiment</div>
                <div className="text-lg font-semibold mb-2 capitalize">{analysis.sentiment}</div>
                <div className="text-sm text-gray-600">Confidence</div>
                <div className="text-lg font-semibold">{Math.round((analysis.confidence || 0) * 100)}%</div>
              </div>

              <div className="bg-white rounded-lg p-6 shadow">
                <h3 className="font-semibold text-gray-900 mb-3">Entities</h3>
                <div className="mb-2">
                  <div className="text-sm text-gray-600">People</div>
                  <div className="flex flex-wrap gap-1">
                    {analysis.keyPeople.map(p => <span key={p} className="px-2 py-0.5 bg-gray-100 text-gray-700 text-xs rounded-full">{p}</span>)}
                  </div>
                </div>
                <div className="mb-2">
                  <div className="text-sm text-gray-600">Organizations</div>
                  <div className="flex flex-wrap gap-1">
                    {analysis.keyOrganizations.map(o => <span key={o} className="px-2 py-0.5 bg-gray-100 text-gray-700 text-xs rounded-full">{o}</span>)}
                  </div>
                </div>
                <div className="mb-2">
                  <div className="text-sm text-gray-600">Places</div>
                  <div className="flex flex-wrap gap-1">
                    {analysis.keyPlaces.map(pl => <span key={pl} className="px-2 py-0.5 bg-gray-100 text-gray-700 text-xs rounded-full">{pl}</span>)}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-600">Topics</div>
                  <div className="flex flex-wrap gap-1">
                    {analysis.keyTopics.map(t => <span key={t} className="px-2 py-0.5 bg-gray-100 text-gray-700 text-xs rounded-full">{t}</span>)}
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg p-6 shadow">
                <h3 className="font-semibold text-gray-900 mb-3">Reading & Length</h3>
                <div className="flex items-center justify-between text-sm">
                  <div>
                    <div className="text-gray-600">Reading Level</div>
                    <div className="font-semibold">{analysis.readingLevel}</div>
                  </div>
                  <div>
                    <div className="text-gray-600">Word Count</div>
                    <div className="font-semibold">{analysis.wordCount}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function biasToPercent(bias: string): number {
  // Map bias labels roughly across a left-right spectrum (0%-100%)
  const map: Record<string, number> = {
    'Left': 10,
    'Center-Left': 30,
    'Center': 50,
    'Center-Right': 70,
    'Right': 90,
    'Unknown': 50
  }
  return map[bias] ?? 50
}


