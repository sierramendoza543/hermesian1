'use client'

import { Suspense, useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { BookmarkPlus, Check, Link2, Loader2, Printer, RotateCcw, ScanSearch, FileText } from 'lucide-react'
import type { AnalysisResult } from '@/lib/analysis'
import { useAuth } from '@/contexts/AuthContext'
import { recordActivity, saveAnalysis } from '@/lib/firebase/userData'
import ReportView from '@/components/analyze/ReportView'
import Notice from '@/components/ui/Notice'

const STEPS = [
  'Fetching the article',
  'Measuring the text (reading level, quotes, sourcing)',
  'AI is reading for bias, framing and logic',
  'Verifying every quote against the original text',
]

function AnalyzeContent() {
  const params = useSearchParams()
  const { user } = useAuth()
  const [mode, setMode] = useState<'url' | 'text'>('url')
  const [url, setUrl] = useState('')
  const [text, setText] = useState('')
  const [title, setTitle] = useState('')
  const [source, setSource] = useState('')
  const [storyId, setStoryId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [needsText, setNeedsText] = useState(false)
  const [result, setResult] = useState<AnalysisResult | null>(null)
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const stepTimer = useRef<ReturnType<typeof setInterval> | null>(null)
  const autoRan = useRef(false)

  const run = useCallback(
    async (payload: { url?: string; text?: string; title?: string; source?: string }) => {
      setLoading(true)
      setError(null)
      setNeedsText(false)
      setResult(null)
      setSaved(false)
      setSaveError(null)
      setStep(payload.text ? 1 : 0)
      stepTimer.current = setInterval(() => setStep((s) => Math.min(s + 1, STEPS.length - 1)), 4500)
      try {
        const res = await fetch('/api/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        const data = await res.json()
        if (!res.ok) {
          setError(data.error || 'Analysis failed')
          if (data.needsText) {
            setNeedsText(true)
            setMode('text')
            if (data.title) setTitle(data.title)
            if (data.source) setSource(data.source)
          }
          return
        }
        setResult(data)
        window.scrollTo({ top: 0, behavior: 'smooth' })
      } catch {
        setError('Network error — check your connection and try again.')
      } finally {
        if (stepTimer.current) clearInterval(stepTimer.current)
        setLoading(false)
      }
    },
    []
  )

  // Deep link from a story (?url=...&title=...) or from the profile (?view=1)
  useEffect(() => {
    if (autoRan.current) return
    autoRan.current = true
    if (params.get('view')) {
      try {
        const raw = sessionStorage.getItem('analysis:view')
        if (raw) {
          setResult(JSON.parse(raw))
          setSaved(true)
          return
        }
      } catch {}
    }
    const qUrl = params.get('url')
    if (qUrl) {
      setUrl(qUrl)
      setTitle(params.get('title') || '')
      setSource(params.get('source') || '')
      setStoryId(params.get('story'))
      run({ url: qUrl, title: params.get('title') || undefined, source: params.get('source') || undefined })
    }
  }, [params, run])

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (loading) return
    if (mode === 'url') run({ url: url.trim() })
    else run({ text, title: title.trim() || undefined, source: source.trim() || undefined })
  }

  const reset = () => {
    setResult(null)
    setError(null)
    setNeedsText(false)
    setUrl('')
    setText('')
    setTitle('')
    setSource('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const save = async () => {
    if (!user || !result?.analysis) return
    setSaving(true)
    setSaveError(null)
    try {
      await saveAnalysis(user.uid, {
        title: result.article.title,
        url: result.article.url,
        source: result.article.source,
        leanScore: result.analysis.leanScore,
        label: result.analysis.leanScore <= -60 ? 'Left' : result.analysis.leanScore < -20 ? 'Lean Left' : result.analysis.leanScore <= 20 ? 'Center' : result.analysis.leanScore < 60 ? 'Lean Right' : 'Right',
        scores: result.analysis.scores,
        payload: JSON.stringify(result),
      })
      recordActivity(user.uid, 20).catch(() => {})
      setSaved(true)
    } catch {
      setSaveError('Could not save right now. Check your connection and Firestore setup.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      {!result && (
        <>
          <div className="mb-6">
            <p className="label-mono">Bias X-ray</p>
            <h1 className="mt-2 font-headline text-3xl font-black md:text-4xl">Analyze an article</h1>
            <p className="mt-2 text-muted">Paste a link or the text. Every finding comes with a verified quote.</p>
          </div>

          <form onSubmit={submit} className="card space-y-4 p-5 md:p-7">
            <div className="flex gap-2">
              <button type="button" onClick={() => setMode('url')} className={`chip ${mode === 'url' ? 'chip-active' : ''}`}>
                <Link2 className="mr-1.5 h-4 w-4" /> Link
              </button>
              <button type="button" onClick={() => setMode('text')} className={`chip ${mode === 'text' ? 'chip-active' : ''}`}>
                <FileText className="mr-1.5 h-4 w-4" /> Paste text
              </button>
            </div>

            {mode === 'url' ? (
              <input
                className="input"
                type="url"
                required
                placeholder="https://www.example.com/news/article"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                aria-label="Article URL"
              />
            ) : (
              <>
                <div className="grid gap-3 sm:grid-cols-2">
                  <input className="input" placeholder="Title (optional)" value={title} onChange={(e) => setTitle(e.target.value)} />
                  <input className="input" placeholder="Publisher, e.g. Fox News (optional)" value={source} onChange={(e) => setSource(e.target.value)} />
                </div>
                <textarea
                  className="input min-h-[220px] resize-y leading-relaxed"
                  required
                  placeholder="Paste the full article text here (at least a few paragraphs)…"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                />
                <p className="text-xs text-muted">{text.trim().split(/\s+/).filter(Boolean).length.toLocaleString()} words</p>
              </>
            )}

            {error && (
              <Notice tone={needsText ? 'warn' : 'error'}>
                {error}
                {needsText && storyId && (
                  <>
                    {' '}
                    <Link href={`/story/${storyId}`} className="font-semibold underline">Or compare how every outlet headlined it →</Link>
                  </>
                )}
              </Notice>
            )}

            <button type="submit" disabled={loading} className="btn-primary w-full sm:w-auto">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ScanSearch className="h-4 w-4" />}
              {loading ? 'Analyzing…' : 'Run the X-ray'}
            </button>
          </form>

          {loading && (
            <div className="card mt-6 p-5 md:p-7" aria-live="polite">
              <ol className="space-y-3">
                {STEPS.map((s, i) => (
                  <li key={s} className={`flex items-center gap-3 text-sm ${i > step ? 'text-muted/60' : ''}`}>
                    <span className="flex h-6 w-6 items-center justify-center rounded-full border border-line bg-white">
                      {i < step ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : i === step ? <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" /> : null}
                    </span>
                    {s}
                  </li>
                ))}
              </ol>
              <p className="mt-4 text-xs text-muted">About 15 seconds.</p>
            </div>
          )}

        </>
      )}

      {result && (
        <>
          <div className="no-print mb-6 flex flex-wrap items-center gap-2">
            <button onClick={reset} className="btn-ghost">
              <RotateCcw className="h-4 w-4" /> Analyze another
            </button>
            <button onClick={() => window.print()} className="btn-ghost">
              <Printer className="h-4 w-4" /> Print / save PDF
            </button>
            {result.analysis &&
              (user ? (
                <button onClick={save} disabled={saving || saved} className="btn-primary">
                  {saved ? <Check className="h-4 w-4" /> : saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <BookmarkPlus className="h-4 w-4" />}
                  {saved ? 'Saved to profile' : 'Save to profile'}
                </button>
              ) : (
                <Link href="/login?from=/analyze" className="btn-primary">
                  <BookmarkPlus className="h-4 w-4" /> Sign in to save
                </Link>
              ))}
          </div>
          {saveError && <div className="mb-4"><Notice tone="error">{saveError}</Notice></div>}
          <ReportView result={result} />
        </>
      )}
    </div>
  )
}

export default function AnalyzePage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-5xl px-4 py-12 text-muted">Loading…</div>}>
      <AnalyzeContent />
    </Suspense>
  )
}
