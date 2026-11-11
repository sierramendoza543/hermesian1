'use client'

import { Suspense, useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Flame, Gamepad2, Play, RefreshCw, ScanSearch, Search, TrendingUp, X } from 'lucide-react'
import type { Story } from '@/lib/stories'
import { rememberStory, timeAgo } from '@/lib/format'
import StoryCard from '@/components/stories/StoryCard'
import Skeleton from '@/components/ui/Skeleton'
import Notice from '@/components/ui/Notice'

interface Category {
  key: string
  label: string
}

const PAGE = 12

function readJSON<T>(storage: Storage | undefined, key: string): T | null {
  try {
    const raw = storage?.getItem(key)
    return raw ? (JSON.parse(raw) as T) : null
  } catch {
    return null
  }
}

function HomeContent() {
  const router = useRouter()
  const params = useSearchParams()
  const q = params.get('q') || ''
  const category = params.get('category') || 'top'

  const [stories, setStories] = useState<Story[]>([])
  const [categories, setCategories] = useState<Category[]>([{ key: 'top', label: 'Top Stories' }])
  const [trending, setTrending] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState(q)
  const sentinel = useRef<HTMLDivElement>(null)

  useEffect(() => setSearch(q), [q])

  const load = useCallback(
    async (offset: number) => {
      const cacheKey = `home:${q || category}`
      let showedCache = false
      if (offset === 0) {
        // Show the last copy instantly, then refresh behind it
        const cached = readJSON<{ stories: Story[]; categories?: Category[]; trending?: string[]; hasMore: boolean }>(
          typeof window !== 'undefined' ? sessionStorage : undefined,
          cacheKey
        )
        if (cached?.stories?.length) {
          setStories(cached.stories)
          setHasMore(cached.hasMore)
          if (cached.categories) setCategories(cached.categories)
          setTrending(cached.trending || [])
          setLoading(false)
          showedCache = true
        } else setLoading(true)
      } else setLoadingMore(true)
      setError(null)
      try {
        const qs = new URLSearchParams({ limit: String(PAGE), offset: String(offset) })
        if (q) qs.set('q', q)
        else qs.set('category', category)
        const res = await fetch(`/api/stories?${qs}`)
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Failed to load stories')
        setStories((prev) => (offset === 0 ? data.stories : [...prev, ...data.stories.filter((s: Story) => !prev.some((p) => p.id === s.id))]))
        setHasMore(Boolean(data.hasMore))
        if (data.categories) setCategories(data.categories)
        if (offset === 0) {
          setTrending(data.trending || [])
          try {
            sessionStorage.setItem(cacheKey, JSON.stringify({ stories: data.stories, categories: data.categories, trending: data.trending, hasMore: Boolean(data.hasMore) }))
          } catch {}
        }
      } catch (e) {
        if (!showedCache) setError(e instanceof Error ? e.message : 'Failed to load stories')
      } finally {
        setLoading(false)
        setLoadingMore(false)
      }
    },
    [q, category]
  )

  useEffect(() => {
    load(0)
  }, [load])

  // Infinite scroll
  useEffect(() => {
    const el = sentinel.current
    if (!el || !hasMore || loading || loadingMore) return
    const io = new IntersectionObserver((e) => e[0].isIntersecting && load(stories.length), { rootMargin: '600px' })
    io.observe(el)
    return () => io.disconnect()
  }, [hasMore, loading, loadingMore, load, stories.length])

  const go = (next: { q?: string; category?: string }) => {
    const qs = new URLSearchParams()
    if (next.q) qs.set('q', next.q)
    else if (next.category && next.category !== 'top') qs.set('category', next.category)
    router.push(qs.toString() ? `/?${qs}` : '/')
  }

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'
  const today = new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })
  const label = categories.find((c) => c.key === category)?.label || 'Top Stories'

  return (
    <div className="mx-auto max-w-6xl px-4 py-5 sm:px-6 lg:px-8">
      <div className="grid gap-6 lg:grid-cols-[200px_minmax(0,1fr)_290px]">
        {/* Left: sections (desktop) */}
        <aside className="hidden lg:block">
          <nav className="sticky top-20 space-y-0.5">
            <p className="label-mono mb-2 px-3">Sections</p>
            {categories.map((c) => {
              const on = !q && category === c.key
              return (
                <button
                  key={c.key}
                  onClick={() => go({ category: c.key })}
                  className={`flex w-full items-center rounded-xl px-3 py-2 text-left text-[15px] transition ${on ? 'bg-charcoal font-bold text-white' : 'font-medium text-charcoal/75 hover:bg-accent/60 hover:text-charcoal'}`}
                >
                  {c.label}
                </button>
              )
            })}
          </nav>
        </aside>

        {/* Center: feed */}
        <main className="min-w-0">
          <div className="mb-4">
            <p className="label-mono">{today}</p>
            <h1 className="mt-1 font-headline text-2xl font-black md:text-3xl">{q ? `Results for “${q}”` : `${greeting}. ${label === 'Top Stories' ? 'Here\'s what matters.' : label}`}</h1>
          </div>

          <form
            className="relative mb-4"
            onSubmit={(e) => {
              e.preventDefault()
              go({ q: search.trim() })
            }}
          >
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-dim" />
            <input className="input !rounded-full !pl-10" placeholder="Search any story or topic" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Search stories" />
            {q && (
              <button type="button" onClick={() => go({})} className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-dim hover:bg-sand" aria-label="Clear search"><X className="h-4 w-4" /></button>
            )}
          </form>

          {/* Section chips: mobile + tablet */}
          <div className="-mx-1 mb-5 flex gap-2 overflow-x-auto px-1 pb-1 scrollbar-hide lg:hidden">
            {categories.map((c) => (
              <button key={c.key} onClick={() => go({ category: c.key })} className={`chip shrink-0 ${!q && category === c.key ? 'chip-active' : ''}`}>{c.label}</button>
            ))}
          </div>

          {error && (
            <Notice tone="error" title="Couldn't load stories" action={<button onClick={() => load(0)} className="btn-ghost !py-1.5 text-xs"><RefreshCw className="h-3.5 w-3.5" /> Retry</button>}>
              {error}
            </Notice>
          )}

          {loading && (
            <div className="space-y-4">
              <Skeleton className="h-80" />
              {[0, 1, 2].map((i) => <Skeleton key={i} className="h-44" />)}
            </div>
          )}

          {!loading && !error && stories.length === 0 && (
            <div className="card p-10 text-center">
              <p className="font-headline text-xl font-bold">No stories found</p>
              <p className="mt-2 text-dim">{q ? 'Try fewer or simpler words, like a name and a place.' : 'Try another section.'}</p>
            </div>
          )}

          {!loading && stories.length > 0 && (
            <div className="space-y-4 animate-rise">
              <StoryCard story={stories[0]} featured />
              {stories.slice(1).map((s) => (
                <StoryCard key={s.id} story={s} />
              ))}
              <div ref={sentinel} className="h-8" />
              {loadingMore && <Skeleton className="h-40" />}
              {!hasMore && stories.length > 6 && <p className="py-6 text-center text-sm text-dim">You&apos;re all caught up.</p>}
            </div>
          )}
        </main>

        {/* Right rail */}
        <aside className="hidden space-y-4 lg:block">
          <div className="sticky top-20 space-y-4">
            {stories.length > 1 && !q && (
              <section className="card p-4">
                <p className="label-mono mb-3 flex items-center gap-1.5"><Flame className="h-3.5 w-3.5" /> The briefing</p>
                <ol className="space-y-3">
                  {stories.slice(0, 5).map((s, i) => (
                    <li key={s.id}>
                      <Link href={`/story/${s.id}`} onClick={() => rememberStory(s)} className="group flex gap-3">
                        <span className="font-headline text-xl font-black leading-none text-primary/60">{i + 1}</span>
                        <span>
                          <span className="block text-sm font-semibold leading-snug group-hover:text-primary">{s.headline}</span>
                          <span className="mt-0.5 block text-[11px] text-dim">{s.category} · {s.sourceCount} outlets · {timeAgo(s.publishedAt)}</span>
                        </span>
                      </Link>
                    </li>
                  ))}
                </ol>
              </section>
            )}

            {trending.length > 0 && (
              <section className="card p-4">
                <p className="label-mono mb-3 flex items-center gap-1.5"><TrendingUp className="h-3.5 w-3.5" /> In the news</p>
                <div className="flex flex-wrap gap-2">
                  {trending.map((t) => (
                    <button key={t} onClick={() => go({ q: t })} className="chip !py-1 text-xs">{t}</button>
                  ))}
                </div>
              </section>
            )}

            <section className="card divide-y divide-sand">
              {[
                { href: '/scroll-feed', icon: Play, title: 'Watch', sub: 'Short news videos' },
                { href: '/analyze', icon: ScanSearch, title: 'Bias X-ray', sub: 'Analyze any article' },
                { href: '/games', icon: Gamepad2, title: 'Play', sub: 'Newsdle & Story Sort' },
              ].map((x) => (
                <Link key={x.href} href={x.href} className="flex items-center gap-3 p-3.5 transition hover:bg-accent/40">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-charcoal text-white"><x.icon className="h-4 w-4" /></span>
                  <span>
                    <span className="block text-sm font-bold">{x.title}</span>
                    <span className="block text-xs text-dim">{x.sub}</span>
                  </span>
                </Link>
              ))}
            </section>
          </div>
        </aside>
      </div>
    </div>
  )
}

export default function Home() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-6xl px-4 py-8"><Skeleton className="h-80" /></div>}>
      <HomeContent />
    </Suspense>
  )
}
