'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Lightbulb, RotateCcw, Shuffle } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { recordActivity, saveGameScore } from '@/lib/firebase/userData'
import { etDay } from '@/lib/daily'
import { ModeSwitch, NextPuzzleCountdown, PlayMode, dailyLabel } from '@/components/games/ModeSwitch'
import Skeleton from '@/components/ui/Skeleton'
import Notice from '@/components/ui/Notice'

interface Group {
  storyId: string
  label: string
  words: string[]
}

interface Saved {
  groups: Group[]
  tiles: string[]
  solved: number[]
  mistakes: number
  hintLevel: number
}

const COLORS = [
  { bg: 'bg-amber-200', text: 'text-amber-950' },
  { bg: 'bg-emerald-200', text: 'text-emerald-950' },
  { bg: 'bg-sky-200', text: 'text-sky-950' },
  { bg: 'bg-violet-200', text: 'text-violet-950' },
]
const MAX_MISTAKES = 4

function shuffle<T>(a: T[]): T[] {
  const r = [...a]
  for (let i = r.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[r[i], r[j]] = [r[j], r[i]]
  }
  return r
}

export default function SortGame() {
  const { user } = useAuth()
  const [mode, setMode] = useState<PlayMode>('daily')
  const [round, setRound] = useState(0)
  const [groups, setGroups] = useState<Group[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [tiles, setTiles] = useState<string[]>([])
  const [picked, setPicked] = useState<string[]>([])
  const [solved, setSolved] = useState<number[]>([])
  const [mistakes, setMistakes] = useState(0)
  const [msg, setMsg] = useState('')
  const [saved, setSaved] = useState(false)
  const [hintLevel, setHintLevel] = useState(0)
  const savedRef = useRef(false)

  const begin = useCallback((g: Group[], restore?: Saved) => {
    setGroups(g)
    setTiles(restore?.tiles || shuffle(g.flatMap((x) => x.words)))
    setSolved(restore?.solved || [])
    setMistakes(restore?.mistakes || 0)
    setHintLevel(restore?.hintLevel || 0)
    setPicked([])
    setSaved(false)
    savedRef.current = false
  }, [])

  // Load a puzzle: today's (remembered on this device) or a brand-new random one
  useEffect(() => {
    setGroups(null)
    setError(null)
    const day = etDay()
    if (mode === 'daily') {
      try {
        const raw = localStorage.getItem(`sort:daily:${day}`)
        if (raw) {
          const s = JSON.parse(raw) as Saved
          return begin(s.groups, s)
        }
      } catch {}
    }
    let cancelled = false
    const qs = new URLSearchParams({ mode: mode === 'daily' ? 'daily' : 'random' })
    if (mode === 'daily') qs.set('day', day) // new URL each day so shared caches roll over
    fetch(`/api/games/sort?${qs}`, { cache: mode === 'daily' ? 'default' : 'no-store' })
      .then((r) => r.json().then((d) => (r.ok ? d : Promise.reject(new Error(d.error)))))
      .then((d) => !cancelled && begin(d.groups))
      .catch((e) => !cancelled && setError(e.message || 'Could not load the puzzle'))
    return () => {
      cancelled = true
    }
  }, [mode, round, begin])

  // Keep today's progress so a refresh doesn't reset it
  useEffect(() => {
    if (mode !== 'daily' || !groups) return
    try {
      localStorage.setItem(`sort:daily:${etDay()}`, JSON.stringify({ groups, tiles, solved, mistakes, hintLevel } satisfies Saved))
    } catch {}
  }, [mode, groups, tiles, solved, mistakes, hintLevel])

  const groupOf = (w: string) => groups?.findIndex((g) => g.words.includes(w)) ?? -1
  const won = solved.length === 4
  const lost = mistakes >= MAX_MISTAKES
  const over = won || lost
  const solvedWords = new Set(solved.flatMap((i) => groups?.[i].words || []))
  const board = tiles.filter((t) => !solvedWords.has(t))

  const flash = (m: string) => {
    setMsg(m)
    setTimeout(() => setMsg(''), 1600)
  }

  const toggle = (w: string) => {
    if (over) return
    setPicked((p) => (p.includes(w) ? p.filter((x) => x !== w) : p.length < 4 ? [...p, w] : p))
  }

  const hint = () => {
    if (!groups || over) return
    if (hintLevel === 0) {
      setHintLevel(1) // show the four stories
      return
    }
    // Reveal two words that belong together
    const next = [0, 1, 2, 3].find((i) => !solved.includes(i))
    if (next === undefined) return
    setPicked(groups[next].words.slice(0, 2))
    setHintLevel(2)
    flash('Those two go together')
  }

  const submit = () => {
    if (picked.length !== 4 || !groups) return
    const counts = new Map<number, number>()
    picked.forEach((w) => counts.set(groupOf(w), (counts.get(groupOf(w)) || 0) + 1))
    const best = Math.max(...counts.values())
    if (best === 4) {
      setSolved((s) => [...s, groupOf(picked[0])])
      setPicked([])
    } else {
      setMistakes((m) => m + 1)
      setPicked([])
      flash(best === 3 ? 'One away!' : 'Not quite')
    }
  }

  useEffect(() => {
    if (!over || !user || !groups || savedRef.current) return
    const flag = `sort:daily:${etDay()}:saved`
    if (mode === 'daily') {
      try {
        if (localStorage.getItem(flag)) {
          savedRef.current = true
          setSaved(true)
          return
        }
      } catch {}
    }
    savedRef.current = true
    saveGameScore(user.uid, { game: 'sort', storyId: groups[0].storyId, storyHeadline: 'Story Sort', score: solved.length, total: 4 })
      .then(() => recordActivity(user.uid, 10 + solved.length * 8))
      .then(() => {
        setSaved(true)
        if (mode === 'daily') {
          try {
            localStorage.setItem(flag, '1')
          } catch {}
        }
      })
      .catch(() => {})
  }, [over, user, groups, solved.length, mode])

  const revealOrder = groups ? [...solved, ...[0, 1, 2, 3].filter((i) => !solved.includes(i))] : []

  return (
    <div className="mx-auto max-w-xl px-4 py-6">
      <Link href="/games" className="inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-primary">
        <ArrowLeft className="h-4 w-4" /> Games
      </Link>
      <header className="mt-3 text-center">
        <h1 className="font-headline text-3xl font-black">Story Sort</h1>
        <p className="mt-1 text-sm text-muted">Four news stories, sixteen words. Group the words by story.</p>
        <ModeSwitch mode={mode} onChange={(m) => { setMode(m); setRound(0) }} />
        {mode === 'daily' && <p className="mt-2 text-xs text-muted">Daily puzzle · {dailyLabel()} · resets at midnight ET</p>}
      </header>

      {error && <div className="mt-6"><Notice tone="error">{error}</Notice></div>}
      {!groups && !error && <div className="mt-6 space-y-2"><Skeleton className="h-20" /><Skeleton className="h-48" /></div>}

      {groups && (
        <>
          <div className="mt-6 space-y-2">
            {revealOrder.filter((i) => solved.includes(i) || over).map((i) => (
              <Link
                key={i}
                href={`/story/${groups[i].storyId}`}
                className={`block animate-pop rounded-xl p-3 text-center ${COLORS[i].bg} ${COLORS[i].text} ${!solved.includes(i) ? 'opacity-60' : ''}`}
              >
                <p className="text-sm font-bold leading-snug">{groups[i].label}</p>
                <p className="mt-0.5 text-xs font-medium tracking-wide">{groups[i].words.join(' · ')}</p>
              </Link>
            ))}
          </div>

          {!over && hintLevel >= 1 && (
            <div className="mt-3 rounded-xl border border-line bg-white p-3">
              <p className="label-mono mb-2">The four stories</p>
              <ul className="space-y-1.5">
                {groups.map((g, i) => (
                  <li key={g.storyId} className={`flex gap-2 text-sm leading-snug ${solved.includes(i) ? 'text-muted line-through' : ''}`}>
                    <span className={`mt-1 h-3 w-3 shrink-0 rounded ${COLORS[i].bg}`} />
                    {g.label}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {!over && (
            <>
              <div className="relative mt-2 grid grid-cols-4 gap-2">
                {board.map((w) => (
                  <button
                    key={w}
                    onClick={() => toggle(w)}
                    className={`flex h-16 items-center justify-center rounded-xl px-1 text-[11px] font-bold tracking-wide transition sm:h-20 sm:text-sm ${
                      picked.includes(w) ? 'bg-ink text-white' : 'bg-white text-ink ring-1 ring-line hover:ring-primary'
                    }`}
                  >
                    <span className="break-all">{w}</span>
                  </button>
                ))}
                {msg && <div className="absolute -top-8 left-1/2 -translate-x-1/2 animate-pop rounded-lg bg-ink px-3 py-1.5 text-xs font-semibold text-white">{msg}</div>}
              </div>

              <div className="mt-5 flex items-center justify-center gap-1.5 text-xs text-muted">
                Mistakes left
                {Array.from({ length: MAX_MISTAKES }).map((_, i) => (
                  <span key={i} className={`h-3 w-3 rounded-full ${i < MAX_MISTAKES - mistakes ? 'bg-primary' : 'bg-line'}`} />
                ))}
              </div>

              <div className="mt-4 flex justify-center gap-2">
                <button onClick={hint} className="btn-ghost !py-2"><Lightbulb className="h-4 w-4" /> Hint</button>
                <button onClick={() => setTiles((t) => shuffle(t))} className="btn-ghost !py-2"><Shuffle className="h-4 w-4" /> Shuffle</button>
                <button onClick={() => setPicked([])} disabled={picked.length === 0} className="btn-ghost !py-2">Clear</button>
                <button onClick={submit} disabled={picked.length !== 4} className="btn-primary !py-2">Submit</button>
              </div>
            </>
          )}

          {over && (
            <div className="card mt-6 animate-rise p-5 text-center">
              <p className="font-headline text-2xl font-black">{won ? (mistakes === 0 ? 'Perfect!' : 'You sorted them all!') : `${solved.length}/4 stories sorted`}</p>
              <p className="mt-1 text-sm text-muted">Tap a group above to read that story.</p>
              <div className="mt-4 flex justify-center gap-2">
                {mode === 'unlimited' ? (
                  <button onClick={() => setRound((r) => r + 1)} className="btn-primary !py-2"><RotateCcw className="h-4 w-4" /> New puzzle</button>
                ) : (
                  <button onClick={() => setMode('unlimited')} className="btn-primary !py-2">Play unlimited</button>
                )}
              </div>
              {mode === 'daily' && <p className="mt-3 text-xs text-muted">Next daily puzzle in <NextPuzzleCountdown /></p>}
              <p className="mt-3 text-xs text-muted">
                {user ? (saved ? 'Score saved to your profile.' : '') : <><Link href="/login" className="font-semibold text-primary hover:underline">Sign in</Link> to save scores.</>}
              </p>
            </div>
          )}
        </>
      )}
    </div>
  )
}
