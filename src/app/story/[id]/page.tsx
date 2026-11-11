'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import {
  ArrowLeft, BookmarkCheck, Bookmark, ExternalLink, Gamepad2, GraduationCap, Landmark, RefreshCw, ScanSearch, Sparkles,
} from 'lucide-react'
import type { Story } from '@/lib/stories'
import type { StoryBrief } from '@/lib/storyBrief'
import { BUCKET_META, isPaywalled, leanBucket, leanColor, leanLabel } from '@/lib/outlets'
import RatingsNote from '@/components/stories/RatingsNote'
import { findTerms } from '@/lib/lexicon'
import { recallStory, rememberStory, signed, timeAgo } from '@/lib/format'
import { briefRequestBody } from '@/lib/prefetch'
import { useAuth } from '@/contexts/AuthContext'
import { isStorySaved, recordActivity, saveStory, unsaveStory } from '@/lib/firebase/userData'
import StoryImage from '@/components/stories/StoryImage'
import Tabs from '@/components/ui/Tabs'
import Disclosure from '@/components/ui/Disclosure'
import SpectrumChart from '@/components/stories/SpectrumChart'
import CoverageBreakdown from '@/components/stories/CoverageBreakdown'
import OutletIcon from '@/components/stories/OutletIcon'
import Skeleton from '@/components/ui/Skeleton'
import Notice from '@/components/ui/Notice'

export default function StoryPage() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const [story, setStory] = useState<Story | null>(null)
  const [storyError, setStoryError] = useState<string | null>(null)
  const [brief, setBrief] = useState<StoryBrief | null>(null)
  const [briefProvider, setBriefProvider] = useState<string | null>(null)
  const [briefError, setBriefError] = useState<string | null>(null)
  const [briefLoading, setBriefLoading] = useState(false)
  const [saved, setSaved] = useState(false)
  const [saveBusy, setSaveBusy] = useState(false)
  const [tab, setTab] = useState<'overview' | 'compare' | 'headlines' | 'context'>('overview')

  // Load story: instant from session cache, then refresh from the server
  useEffect(() => {
    let cancelled = false
    const cached = recallStory<Story>(id)
    if (cached) setStory(cached)
    ;(async () => {
      try {
        const res = await fetch(`/api/stories/${id}`)
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Story not found')
        if (!cancelled) {
          setStory(data.story)
          rememberStory(data.story)
        }
      } catch (e) {
        if (!cancelled && !cached) setStoryError(e instanceof Error ? e.message : 'Story not found')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [id])

  const loadBrief = useCallback(async (s: Story) => {
    // Already fetched (or prefetched on hover)? Show it instantly.
    try {
      const raw = sessionStorage.getItem(`brief:${s.id}`)
      if (raw) {
        const cached = JSON.parse(raw)
        setBrief(cached.brief)
        setBriefProvider(cached.provider)
        return
      }
    } catch {}
    setBriefLoading(true)
    setBriefError(null)
    try {
      const res = await fetch('/api/stories/brief', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(briefRequestBody(s)),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Brief failed')
      setBrief(data.brief)
      setBriefProvider(data.provider)
      try {
        sessionStorage.setItem(`brief:${s.id}`, JSON.stringify({ brief: data.brief, provider: data.provider }))
      } catch {}
    } catch (e) {
      setBriefError(e instanceof Error ? e.message : 'Brief failed')
    } finally {
      setBriefLoading(false)
    }
  }, [])

  const storyId = story?.id
  useEffect(() => {
    if (story && !brief && !briefLoading && !briefError) loadBrief(story)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storyId])

  useEffect(() => {
    if (!user || !storyId) return
    isStorySaved(user.uid, storyId).then(setSaved).catch(() => {})
  }, [user, storyId])

  const toggleSave = async () => {
    if (!story || !user) return
    setSaveBusy(true)
    try {
      if (saved) {
        await unsaveStory(user.uid, story.id)
        setSaved(false)
      } else {
        await saveStory(user.uid, {
          id: story.id,
          headline: story.headline,
          category: story.category,
          sourceCount: story.sourceCount,
          avgLean: story.avgLean,
          publishedAt: story.publishedAt,
        })
        setSaved(true)
        recordActivity(user.uid, 5).catch(() => {})
      }
    } catch {
      /* surfaced by button state */
    } finally {
      setSaveBusy(false)
    }
  }

  const rows = useMemo(
    () =>
      (story?.articles || []).map((a) => ({
        a,
        terms: [...new Set(findTerms(a.title).map((t) => t.term))],
      })),
    [story]
  )

  if (storyError && !story) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16">
        <Notice tone="error" title="Story unavailable">{storyError}</Notice>
        <Link href="/" className="btn-primary mt-6">
          <ArrowLeft className="h-4 w-4" /> Back to stories
        </Link>
      </div>
    )
  }

  if (!story) {
    return (
      <div className="mx-auto max-w-5xl space-y-5 px-4 py-10">
        <Skeleton className="h-10 w-3/4" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    )
  }

  const analyzeHref = (a: Story['articles'][number]) =>
    `/analyze?url=${encodeURIComponent(a.url)}&title=${encodeURIComponent(a.title)}&source=${encodeURIComponent(a.source)}&story=${story.id}`

  const briefPending = briefLoading && !brief
  const briefState =
    briefPending ? (
      <div className="space-y-3">
        <Skeleton className="h-5 w-full" />
        <Skeleton className="h-5 w-10/12" />
        <p className="text-sm text-dim">Reading {story.sourceCount} headlines…</p>
      </div>
    ) : briefError && !brief ? (
      <Notice
        tone="warn"
        title="AI brief unavailable"
        action={
          <button onClick={() => loadBrief(story)} className="btn-ghost !py-1.5 text-xs">
            <RefreshCw className="h-3.5 w-3.5" /> Retry
          </button>
        }
      >
        {briefError}
      </Notice>
    ) : null

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 lg:px-8">
      <Link href="/" className="inline-flex items-center gap-1.5 text-sm font-medium text-dim hover:text-primary">
        <ArrowLeft className="h-4 w-4" /> Stories
      </Link>

      <header className="mt-4 animate-rise">
        <div className="flex flex-wrap items-center gap-2 text-xs text-dim">
          <span className="label-mono rounded-md bg-accent px-2 py-1 !text-primary">{story.category}</span>
          <span>{story.sourceCount} outlets</span>
          <span>· {timeAgo(story.publishedAt)}</span>
          {briefProvider && (
            <span className="ml-auto flex items-center gap-1"><Sparkles className="h-3 w-3" /> AI-assisted</span>
          )}
        </div>
        <StoryImage id={story.id} articles={story.articles} label={story.category} className="mt-4 aspect-[16/7] w-full rounded-2xl" />
        <h1 className="mt-4 font-headline text-2xl font-black leading-tight md:text-4xl">{brief?.headline || story.headline}</h1>

        <div className="mt-4 flex flex-wrap gap-2">
          <Link href={`/games/quiz?story=${story.id}`} onClick={() => rememberStory(story)} className="btn-primary !py-2">
            <Gamepad2 className="h-4 w-4" /> Quiz me
          </Link>
          {user ? (
            <button onClick={toggleSave} disabled={saveBusy} className="btn-ghost !py-2">
              {saved ? <BookmarkCheck className="h-4 w-4 text-primary" /> : <Bookmark className="h-4 w-4" />}
              {saved ? 'Saved' : 'Save'}
            </button>
          ) : (
            <Link href={`/login?from=/story/${story.id}`} className="btn-ghost !py-2">
              <Bookmark className="h-4 w-4" /> Sign in to save
            </Link>
          )}
        </div>
      </header>

      <div className="mt-6">
        <Tabs
          value={tab}
          onChange={setTab}
          tabs={[
            { key: 'overview', label: 'Overview' },
            { key: 'compare', label: 'Compare' },
            { key: 'headlines', label: 'Headlines', count: story.sourceCount },
            { key: 'context', label: 'Context' },
          ]}
        />
      </div>

      {/* OVERVIEW */}
      {tab === 'overview' && (
        <div className="mt-4 space-y-5 animate-rise">
          <section className="card p-5 md:p-6">
            <p className="label-mono mb-3">What happened</p>
            {brief ? (
              <>
                <p className="text-base leading-relaxed">{brief.summary}</p>
                {brief.keyFacts.length > 0 && (
                  <ul className="mt-4 grid gap-2 sm:grid-cols-2">
                    {brief.keyFacts.slice(0, 4).map((f, i) => (
                      <li key={i} className="flex gap-2.5 rounded-xl bg-cream p-3 text-sm leading-snug">
                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                        {f}
                      </li>
                    ))}
                  </ul>
                )}
              </>
            ) : briefState}
          </section>

          <section className="card p-5 md:p-6">
            <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
              <p className="label-mono">Who covered it</p>
              {story.avgLean !== null && (
                <p className="text-xs text-dim">
                  Average lean{' '}
                  <b className="font-mono" style={{ color: leanColor(story.avgLean) }}>
                    {signed(story.avgLean)} · {leanLabel(story.avgLean)}
                  </b>{' '}
                  · {story.ratedCount} rated
                </p>
              )}
            </div>
            {story.ratedCount > 0 ? (
              <>
                <SpectrumChart articles={story.articles} />
                <div className="mt-6"><CoverageBreakdown story={story} /></div>
              </>
            ) : (
              <Notice>None of the outlets covering this story are rated yet.</Notice>
            )}
          </section>
        </div>
      )}

      {/* COMPARE */}
      {tab === 'compare' && (
        <div className="mt-4 space-y-4 animate-rise">
          {!brief && <div className="card p-5">{briefState}</div>}
          {brief && (
            <>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-5">
                  <p className="label-mono mb-2 !text-emerald-800">Outlets agree</p>
                  <ul className="space-y-1.5 text-sm">{brief.agree.map((x, i) => <li key={i}>✓ {x}</li>)}</ul>
                  {brief.agree.length === 0 && <p className="text-sm text-dim">No clear consensus from the headlines.</p>}
                </div>
                <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-5">
                  <p className="label-mono mb-2 !text-amber-800">Outlets differ</p>
                  <ul className="space-y-1.5 text-sm">{brief.differ.map((d, i) => <li key={i}>↔ {d.topic}</li>)}</ul>
                  {brief.differ.length === 0 && <p className="text-sm text-dim">Coverage is framed similarly.</p>}
                </div>
              </div>

              {brief.differ.map((d, i) => (
                <Disclosure key={i} title={d.topic} defaultOpen={i === 0}>
                  <div className="grid gap-3 md:grid-cols-2">
                    {d.perspectives.map((p, j) => (
                      <div key={j} className="rounded-xl border border-sand bg-cream p-3.5">
                        <p className="label-mono mb-1">{p.side}</p>
                        <p>{p.framing}</p>
                      </div>
                    ))}
                  </div>
                </Disclosure>
              ))}

              {brief.outletFraming.length > 0 && (
                <Disclosure title={`Framing, outlet by outlet (${brief.outletFraming.length})`}>
                  <ul className="space-y-3">
                    {brief.outletFraming.map((o, i) => (
                      <li key={i}>
                        <b>{o.source}</b> - <span className="text-dim">{o.emphasis}</span>
                        {o.loadedTerms.length > 0 && (
                          <span className="ml-2 inline-flex flex-wrap gap-1">
                            {o.loadedTerms.map((t) => <span key={t} className="rounded bg-amber-100 px-1.5 py-0.5 font-mono text-xs text-amber-900">{t}</span>)}
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                </Disclosure>
              )}
            </>
          )}
        </div>
      )}

      {/* HEADLINES */}
      {tab === 'headlines' && (
        <section className="card mt-4 animate-rise p-4 md:p-6">
          <div className="divide-y divide-sand">
            {rows.map(({ a, terms }) => (
              <div key={a.source + a.url} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center">
                <div className="flex items-center gap-3 sm:w-52 sm:shrink-0">
                  <OutletIcon name={a.outlet || a.source} domain={a.domain} lean={a.lean} size={34} />
                  <div>
                    <p className="text-sm font-semibold leading-tight">{a.outlet || a.source}</p>
                    {a.lean !== null ? (
                      <p className="font-mono text-[11px]" style={{ color: leanColor(a.lean) }}>{BUCKET_META[leanBucket(a.lean)].label}</p>
                    ) : (
                      <p className="font-mono text-[11px] text-dim">not rated</p>
                    )}
                  </div>
                </div>
                <div className="flex-1">
                  <a href={a.url} target="_blank" rel="noopener noreferrer" className="font-headline text-[15px] font-bold leading-snug hover:text-primary">
                    {a.title} <ExternalLink className="inline h-3 w-3 align-baseline opacity-50" />
                  </a>
                  {terms.length > 0 && (
                    <p className="mt-1.5 flex flex-wrap gap-1.5 text-xs">
                      {terms.map((t) => <span key={t} className="rounded bg-amber-100 px-1.5 py-0.5 font-mono text-amber-900">{t}</span>)}
                    </p>
                  )}
                </div>
                <Link href={analyzeHref(a)} className="btn-ghost !py-1.5 text-xs" title={isPaywalled(a.domain) ? 'Paywalled outlet - you will be asked to paste the text' : 'Analyze this article'}>
                  <ScanSearch className="h-3.5 w-3.5" /> X-ray{isPaywalled(a.domain) ? ' · paste' : ''}
                </Link>
              </div>
            ))}
          </div>
          <RatingsNote />
        </section>
      )}

      {/* CONTEXT */}
      {tab === 'context' && (
        <div className="mt-4 space-y-4 animate-rise">
          {!brief && <div className="card p-5">{briefState}</div>}
          {brief && (
            <>
              <div className="grid gap-4 md:grid-cols-2">
                {brief.whyItMatters && (
                  <div className="card p-5">
                    <p className="label-mono mb-2 flex items-center gap-1.5"><Landmark className="h-3.5 w-3.5" /> Why it matters</p>
                    <p className="text-sm leading-relaxed">{brief.whyItMatters}</p>
                  </div>
                )}
                {brief.apGovConnection && (
                  <div className="card p-5">
                    <p className="label-mono mb-2 flex items-center gap-1.5"><GraduationCap className="h-3.5 w-3.5" /> AP Gov link</p>
                    <p className="text-sm leading-relaxed">{brief.apGovConnection}</p>
                  </div>
                )}
              </div>
              {brief.discussionQuestions.length > 0 && (
                <div className="card p-5">
                  <p className="label-mono mb-2">Think it through</p>
                  <ol className="list-decimal space-y-2 pl-5 text-sm leading-relaxed">{brief.discussionQuestions.map((q, i) => <li key={i}>{q}</li>)}</ol>
                </div>
              )}
              {brief.confidenceNote && <p className="px-1 text-xs italic text-dim">{brief.confidenceNote}</p>}
            </>
          )}
        </div>
      )}
    </div>
  )
}
