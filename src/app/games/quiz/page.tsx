'use client'

import { Suspense, useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { ArrowLeft, Check, Loader2 } from 'lucide-react'
import type { Story } from '@/lib/stories'
import type { GameItem } from '@/lib/games'
import { recallStory, rememberStory, timeAgo } from '@/lib/format'
import { useAuth } from '@/contexts/AuthContext'
import { recordActivity, saveGameScore } from '@/lib/firebase/userData'
import GameRunner, { RunnerResult } from '@/components/games/GameRunner'
import Skeleton from '@/components/ui/Skeleton'
import Notice from '@/components/ui/Notice'

function StoryPicker() {
  const [stories, setStories] = useState<Story[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    fetch('/api/stories?limit=12')
      .then((r) => r.json().then((d) => (r.ok ? d : Promise.reject(new Error(d.error)))))
      .then((d) => setStories(d.stories))
      .catch((e) => setError(e.message || 'Could not load stories'))
  }, [])
  return (
    <div>
      <p className="mb-4 text-dim">Pick a story:</p>
      {error && <Notice tone="error">{error}</Notice>}
      {!stories && !error && <div className="space-y-3">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-20" />)}</div>}
      <div className="space-y-3">
        {stories?.map((s, i) => (
          <Link
            key={s.id}
            href={`/games/quiz?story=${s.id}`}
            onClick={() => rememberStory(s)}
            className="card flex items-center gap-4 p-4 hover:shadow-lift"
          >
            {i < 3 && <span className="label-mono rounded bg-accent px-2 py-1 !text-primary">Daily #{i + 1}</span>}
            <div className="flex-1">
              <p className="font-headline font-bold leading-snug">{s.headline}</p>
              <p className="mt-0.5 text-xs text-dim">{s.category} · {s.sourceCount} outlets · {timeAgo(s.publishedAt)}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}

function GameContent() {
  const params = useSearchParams()
  const storyId = params.get('story')
  const { user } = useAuth()

  const [story, setStory] = useState<Story | null>(null)
  const [items, setItems] = useState<GameItem[] | null>(null)
  const [aiUsed, setAiUsed] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [round, setRound] = useState(0)
  const [saved, setSaved] = useState<'idle' | 'saving' | 'done' | 'failed'>('idle')
  const saveOnce = useRef<string | null>(null)

  const load = useCallback(async () => {
    if (!storyId) return
    setItems(null)
    setError(null)
    setSaved('idle')
    try {
      let s = recallStory<Story>(storyId)
      if (!s) {
        const r = await fetch(`/api/stories/${storyId}`)
        const d = await r.json()
        if (r.ok) s = d.story
      }
      if (s) setStory(s)
      const res = await fetch('/api/games', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: storyId,
          story: s && {
            headline: s.headline,
            category: s.category,
            articles: s.articles.map((a) => ({ title: a.title, source: a.source, domain: a.domain })),
          },
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Could not build the game')
      setItems(data.items)
      setAiUsed(Boolean(data.aiUsed))
      if (!s) setStory({ id: storyId, headline: data.storyHeadline } as Story)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not build the game')
    }
  }, [storyId])

  useEffect(() => {
    load()
  }, [load])

  const finish = useCallback(
    async ({ score, total }: RunnerResult) => {
      if (!user || !storyId) return
      const key = `${storyId}:${round}`
      if (saveOnce.current === key) return
      saveOnce.current = key
      setSaved('saving')
      try {
        await saveGameScore(user.uid, { game: 'quiz', storyId, storyHeadline: story?.headline || '', score, total })
        await recordActivity(user.uid, 10 + score * 5)
        setSaved('done')
      } catch {
        setSaved('failed')
      }
    },
    [user, storyId, story, round]
  )

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
      <Link href="/games" className="inline-flex items-center gap-1.5 text-sm font-medium text-dim hover:text-primary">
        <ArrowLeft className="h-4 w-4" /> All games
      </Link>
      <header className="mb-6 mt-4">
        <p className="label-mono" style={{ color: '#966c6b' }}>Quick Quiz</p>
        <h1 className="mt-1 font-headline text-2xl font-black leading-snug md:text-3xl">
          {story?.headline || 'Five easy questions on any story'}
        </h1>
      </header>

      {!storyId && <StoryPicker />}

      {storyId && !items && !error && (
        <div className="space-y-4" aria-live="polite">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-64 w-full" />
          <p className="flex items-center justify-center gap-2 text-sm text-dim"><Loader2 className="h-4 w-4 animate-spin" /> Building your quiz…</p>
        </div>
      )}

      {error && (
        <div className="space-y-4">
          <Notice tone="error" title="Couldn't start the game">{error}</Notice>
          <Link href="/games/quiz" className="btn-primary">Pick another story</Link>
        </div>
      )}

      {items && (
        <>
          {!aiUsed && (
            <div className="mb-5">
              <Notice tone="info">AI question-writer is offline - these questions come straight from real headlines.</Notice>
            </div>
          )}
          <GameRunner
            key={round}
            items={items}
            onFinish={finish}
            onReplay={() => {
              setRound((r) => r + 1)
              load()
            }}
            footer={
              <p className="mt-3 text-xs text-dim">
                {user ? (
                  saved === 'saving' ? 'Saving your score…' : saved === 'done' ? <span className="inline-flex items-center gap-1 text-emerald-700"><Check className="h-3.5 w-3.5" /> Score saved to your profile</span> : saved === 'failed' ? 'Could not save your score.' : ''
                ) : (
                  <>
                    <Link href="/login" className="font-semibold text-primary hover:underline">Sign in</Link> to save scores and build a streak.
                  </>
                )}
              </p>
            }
          />
        </>
      )}
    </div>
  )
}

export default function QuizPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-2xl px-4 py-12"><Skeleton className="h-64" /></div>}>
      <GameContent />
    </Suspense>
  )
}
