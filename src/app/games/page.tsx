'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Brain, Grid2x2, Type } from 'lucide-react'
import type { Story } from '@/lib/stories'
import { rememberStory } from '@/lib/format'
import { GAMES, GameKey } from '@/components/games/meta'
import Skeleton from '@/components/ui/Skeleton'

const ICONS: Record<GameKey, typeof Brain> = { newsdle: Type, sort: Grid2x2, quiz: Brain }

export default function GamesHub() {
  const [stories, setStories] = useState<Story[] | null>(null)
  const [showAll, setShowAll] = useState(false)

  useEffect(() => {
    fetch('/api/stories?limit=8')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setStories(d?.stories || []))
      .catch(() => setStories([]))
  }, [])

  const top = stories?.[0]

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <p className="label-mono">Games</p>
      <h1 className="mt-2 font-headline text-3xl font-black md:text-4xl">Play the news</h1>
      <p className="mt-2 text-dim">Quick games, rebuilt from today&apos;s headlines.</p>

      <div className="mt-7 grid gap-5 md:grid-cols-3">
        {(Object.keys(GAMES) as GameKey[]).map((k) => {
          const g = GAMES[k]
          const Icon = ICONS[k]
          const href = k === 'quiz' && top ? `/games/quiz?story=${top.id}` : g.href
          return (
            <Link key={k} href={href} onClick={() => k === 'quiz' && top && rememberStory(top)} className="card group overflow-hidden transition hover:-translate-y-0.5 hover:shadow-lift">
              <div className="h-1.5" style={{ background: g.color }} />
              <div className="p-6">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl text-white" style={{ background: g.color }}><Icon className="h-6 w-6" /></span>
                <h2 className="mt-4 font-headline text-xl font-bold">{g.title}</h2>
                <p className="mt-1 text-sm text-dim">{g.tagline}</p>
                <p className="mt-4 text-sm font-semibold" style={{ color: g.color }}>Play →</p>
              </div>
            </Link>
          )
        })}
      </div>

      <section className="mt-10">
        <div className="flex items-center justify-between">
          <h2 className="font-headline text-lg font-bold">Quiz a different story</h2>
          <button onClick={() => setShowAll((v) => !v)} className="text-sm font-semibold text-primary hover:underline">{showAll ? 'Hide' : 'Show'}</button>
        </div>
        {showAll && (
          <div className="mt-3 space-y-2">
            {!stories && <Skeleton className="h-16" />}
            {stories?.map((s) => (
              <Link key={s.id} href={`/games/quiz?story=${s.id}`} onClick={() => rememberStory(s)} className="card block p-3.5 text-sm font-semibold leading-snug hover:shadow-lift">
                {s.headline}
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
