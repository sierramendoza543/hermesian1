'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { ChevronDown, ChevronUp, ExternalLink, Newspaper, Play, RefreshCw, Volume2, VolumeX } from 'lucide-react'
import type { NewsVideo } from '@/lib/videos'
import { CATEGORIES } from '@/lib/categories'
import { leanColor, leanLabel } from '@/lib/outlets'
import OutletIcon from '@/components/stories/OutletIcon'

const FILLER = new Set('with from that this have been into over after amid about their they them will would could says said what when where just more than your you the and for are was were not but out how why who all new now'.split(' '))

/** A short, specific search query from a video title (names and key nouns first). */
function searchQuery(title: string): string {
  const words = title.replace(/[^\w\s'-]/g, ' ').split(/\s+/).filter((w) => w.length > 3 && !FILLER.has(w.toLowerCase()))
  // capitalized words after the first are names/places; the first word is only capitalized by grammar
  const proper = words.filter((w, i) => i > 0 && /^[A-Z]/.test(w) || (i === 0 && /^[A-Z]{2,}/.test(w)))
  const rest = words.filter((w) => !proper.includes(w))
  return [...proper, ...rest].slice(0, 3).join(' ')
}

const SEEN_KEY = 'hermesian:feed:seen'
const MUTE_KEY = 'hermesian:feed:muted'
const PAGE = 8

function readSeen(): string[] {
  try {
    return JSON.parse(localStorage.getItem(SEEN_KEY) || '[]')
  } catch {
    return []
  }
}

function embed(id: string, muted: boolean) {
  const origin = typeof window !== 'undefined' ? `&origin=${encodeURIComponent(window.location.origin)}` : ''
  return `https://www.youtube.com/embed/${id}?autoplay=1&mute=${muted ? 1 : 0}&playsinline=1&rel=0&modestbranding=1&enablejsapi=1&iv_load_policy=3${origin}`
}

export default function ScrollFeed() {
  const [videos, setVideos] = useState<NewsVideo[]>([])
  const [counts, setCounts] = useState<Record<string, number>>({})
  const [category, setCategory] = useState('all')
  const [loading, setLoading] = useState(true)
  const [more, setMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [active, setActive] = useState(0)
  const [muted, setMuted] = useState(true)
  const scroller = useRef<HTMLDivElement>(null)
  const frame = useRef<HTMLIFrameElement>(null)
  const seen = useRef<string[]>([])
  const fetching = useRef(false)
  const known = useRef<Set<string>>(new Set())

  // Remember the viewer's sound preference between videos and visits
  useEffect(() => {
    try {
      const saved = localStorage.getItem(MUTE_KEY)
      if (saved !== null) setMuted(saved === '1')
    } catch {}
    seen.current = readSeen()
  }, [])

  const rememberMuted = useCallback((value: boolean) => {
    setMuted(value)
    try {
      localStorage.setItem(MUTE_KEY, value ? '1' : '0')
    } catch {}
  }, [])

  const markSeen = useCallback((id: string) => {
    if (seen.current.includes(id)) return
    seen.current = [...seen.current, id].slice(-400)
    try {
      localStorage.setItem(SEEN_KEY, JSON.stringify(seen.current))
    } catch {}
  }, [])

  const fetchPage = useCallback(
    async (cat: string, reset: boolean) => {
      if (fetching.current) return
      fetching.current = true
      reset ? setLoading(true) : setMore(true)
      setError(null)
      try {
        const exclude = [...seen.current.slice(-250), ...(reset ? [] : [...known.current])].slice(-300)
        const qs = new URLSearchParams({ category: cat, count: String(PAGE), seen: exclude.join(',') })
        const res = await fetch(`/api/videos?${qs}`, { cache: 'no-store' })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Failed to load')
        if (data.recycled) {
          seen.current = []
          try {
            localStorage.removeItem(SEEN_KEY)
          } catch {}
        }
        setCounts(data.counts || {})
        const fresh: NewsVideo[] = data.videos.filter((v: NewsVideo) => reset || !known.current.has(v.id))
        fresh.forEach((v) => known.current.add(v.id))
        setVideos((prev) => (reset ? fresh : [...prev, ...fresh]))
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load videos')
      } finally {
        fetching.current = false
        setLoading(false)
        setMore(false)
      }
    },
    []
  )

  // New visit or new section = a fresh shuffle
  useEffect(() => {
    known.current = new Set()
    setActive(0)
    scroller.current?.scrollTo({ top: 0 })
    fetchPage(category, true)
  }, [category, fetchPage])

  // Infinite scroll: top up when 3 from the end
  useEffect(() => {
    if (videos.length && active >= videos.length - 3) fetchPage(category, false)
  }, [active, videos.length, category, fetchPage])

  useEffect(() => {
    if (videos[active]) markSeen(videos[active].id)
  }, [active, videos, markSeen])

  // Which card is centered
  useEffect(() => {
    const root = scroller.current
    if (!root) return
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting && e.intersectionRatio >= 0.6) setActive(Number((e.target as HTMLElement).dataset.index))
      },
      { root, threshold: [0.6] }
    )
    root.querySelectorAll('[data-index]').forEach((el) => io.observe(el))
    return () => io.disconnect()
  }, [videos])

  const go = useCallback((index: number) => {
    scroller.current?.querySelector<HTMLElement>(`[data-index="${index}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [])

  const toggleMute = useCallback(() => {
    const next = !muted
    frame.current?.contentWindow?.postMessage(JSON.stringify({ event: 'command', func: next ? 'mute' : 'unMute', args: [] }), '*')
    rememberMuted(next)
  }, [muted, rememberMuted])

  // Listen to the player: pick up sound changes made inside it, skip broken videos, advance when a clip ends
  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (e.origin !== 'https://www.youtube.com' || typeof e.data !== 'string') return
      let data: any
      try {
        data = JSON.parse(e.data)
      } catch {
        return
      }
      if (data.event === 'onError') go(Math.min(active + 1, videos.length - 1))
      const info = data.info
      if (data.event === 'infoDelivery' && info) {
        if (typeof info.muted === 'boolean' && info.muted !== muted) rememberMuted(info.muted)
        if (info.playerState === 0) go(Math.min(active + 1, videos.length - 1))
      }
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [active, videos.length, muted, go, rememberMuted])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement
      if (t && /input|textarea|select/i.test(t.tagName)) return
      if (e.key === 'ArrowDown' || e.key === 'j') {
        e.preventDefault()
        go(Math.min(active + 1, videos.length - 1))
      } else if (e.key === 'ArrowUp' || e.key === 'k') {
        e.preventDefault()
        go(Math.max(active - 1, 0))
      } else if (e.key === 'm') toggleMute()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [active, videos.length, go, toggleMute])

  const chips = [{ key: 'all', label: 'For you' }, ...CATEGORIES.filter((c) => c.key !== 'top' && counts[c.key]).map((c) => ({ key: c.key, label: c.label }))]

  const listenOnLoad = () => {
    const post = () => frame.current?.contentWindow?.postMessage(JSON.stringify({ event: 'listening', id: 1, channel: 'widget' }), '*')
    post()
    setTimeout(post, 600)
    setTimeout(post, 1500)
  }

  return (
    <div className="relative h-full text-white">
      {/* Top bar */}
      <div className="absolute inset-x-0 top-0 z-20 flex items-center gap-2 bg-gradient-to-b from-ink/90 to-transparent px-3 pb-5 pt-3 sm:px-5">
        <div className="flex flex-1 gap-2 overflow-x-auto scrollbar-hide">
          {chips.map((c) => (
            <button
              key={c.key}
              onClick={() => setCategory(c.key)}
              className={`shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition ${
                category === c.key ? 'border-white bg-white text-ink' : 'border-white/25 bg-ink/40 text-white/85 backdrop-blur hover:border-white/60'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
        <button
          onClick={toggleMute}
          className="flex shrink-0 items-center gap-1.5 rounded-full border border-white/25 bg-ink/40 px-3 py-1.5 text-xs font-semibold backdrop-blur hover:border-white/60"
          aria-label={muted ? 'Unmute' : 'Mute'}
        >
          {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          <span className="hidden sm:inline">{muted ? 'Sound off' : 'Sound on'}</span>
        </button>
      </div>

      {loading && (
        <div className="flex h-full items-center justify-center text-white/70">
          <div className="text-center">
            <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-white/20 border-t-white" />
            <p className="mt-4 text-sm">Finding the latest clips…</p>
          </div>
        </div>
      )}

      {!loading && error && videos.length === 0 && (
        <div className="flex h-full items-center justify-center px-4 text-center">
          <div>
            <p className="font-headline text-xl font-bold">Videos are unavailable right now</p>
            <p className="mt-2 text-sm text-white/60">{error}</p>
            <button onClick={() => fetchPage(category, true)} className="btn mt-5 bg-white text-ink hover:bg-accent"><RefreshCw className="h-4 w-4" /> Try again</button>
          </div>
        </div>
      )}

      {!loading && !(error && videos.length === 0) && (
        <div ref={scroller} className="h-full snap-y snap-mandatory overflow-y-scroll scrollbar-hide">
          {videos.map((v, i) => (
            <section key={v.id} data-index={i} className="flex h-full snap-start snap-always items-center justify-center px-0 pb-3 pt-14 sm:px-6">
              <div className="relative flex h-full max-h-[780px] w-full max-w-[440px] items-stretch gap-3">
                <article className="relative aspect-[9/16] h-full max-w-full overflow-hidden rounded-none bg-black shadow-lift ring-1 ring-white/10 sm:rounded-2xl" style={{ maxHeight: '100%' }}>
                  {i === active ? (
                    <iframe
                      key={v.id}
                      ref={frame}
                      src={embed(v.id, muted)}
                      title={v.title}
                      onLoad={listenOnLoad}
                      className="absolute inset-0 h-full w-full"
                      allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
                      allowFullScreen
                    />
                  ) : (
                    <button onClick={() => go(i)} className="group absolute inset-0" aria-label={`Play ${v.title}`}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={v.thumbnail} alt="" loading={Math.abs(i - active) <= 1 ? 'eager' : 'lazy'} className="h-full w-full object-cover opacity-80" />
                      <span className="absolute inset-0 flex items-center justify-center">
                        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-white/90 text-ink"><Play className="ml-1 h-7 w-7" /></span>
                      </span>
                    </button>
                  )}

                  {/* Caption overlay (above the player controls) */}
                  <div className="pointer-events-none absolute inset-x-0 top-0 bg-gradient-to-b from-black/70 to-transparent p-4 pb-10">
                    <div className="flex items-center gap-2.5">
                      <OutletIcon name={v.outlet || v.channel} domain={v.domain} lean={v.lean} size={30} />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold">{v.channel}</p>
                        <p className="flex items-center gap-1.5 text-[11px] text-white/70">
                          {v.lean !== null && (
                            <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full" style={{ background: leanColor(v.lean) }} />{leanLabel(v.lean)}</span>
                          )}
                          <span className="rounded bg-white/15 px-1.5 py-px">{v.category}</span>
                        </p>
                      </div>
                    </div>
                    <p className="mt-2 line-clamp-2 text-sm font-semibold leading-snug">{v.title}</p>
                  </div>
                </article>

                {/* Action rail */}
                <div className="absolute bottom-24 right-2 z-10 flex flex-col items-center gap-3 sm:static sm:justify-end sm:pb-6">
                  <Link
                    href={`/?q=${encodeURIComponent(searchQuery(v.title))}`}
                    className="flex h-11 w-11 items-center justify-center rounded-full bg-ink/70 backdrop-blur hover:bg-primary sm:bg-white/10"
                    aria-label="Find full coverage" title="Find full coverage"
                  >
                    <Newspaper className="h-5 w-5" />
                  </Link>
                  <a
                    href={`https://www.youtube.com/shorts/${v.id}`} target="_blank" rel="noopener noreferrer"
                    className="flex h-11 w-11 items-center justify-center rounded-full bg-ink/70 backdrop-blur hover:bg-primary sm:bg-white/10"
                    aria-label="Open on YouTube" title="Open on YouTube"
                  >
                    <ExternalLink className="h-5 w-5" />
                  </a>
                  <button onClick={toggleMute} className="flex h-11 w-11 items-center justify-center rounded-full bg-ink/70 backdrop-blur hover:bg-primary sm:bg-white/10" aria-label={muted ? 'Unmute' : 'Mute'}>
                    {muted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
                  </button>
                </div>
              </div>
            </section>
          ))}
          {more && (
            <div className="flex h-24 items-center justify-center text-sm text-white/60">
              <div className="mr-3 h-5 w-5 animate-spin rounded-full border-2 border-white/20 border-t-white" /> Loading more…
            </div>
          )}
        </div>
      )}

      {/* Up / down (desktop) */}
      {videos.length > 0 && (
        <div className="absolute right-4 top-1/2 z-20 hidden -translate-y-1/2 flex-col gap-2 lg:flex">
          <button onClick={() => go(Math.max(active - 1, 0))} disabled={active === 0} className="flex h-11 w-11 items-center justify-center rounded-full border border-white/25 bg-ink/60 backdrop-blur hover:border-white disabled:opacity-30" aria-label="Previous"><ChevronUp className="h-5 w-5" /></button>
          <button onClick={() => go(Math.min(active + 1, videos.length - 1))} className="flex h-11 w-11 items-center justify-center rounded-full border border-white/25 bg-ink/60 backdrop-blur hover:border-white" aria-label="Next"><ChevronDown className="h-5 w-5" /></button>
        </div>
      )}
    </div>
  )
}
