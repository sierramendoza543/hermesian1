'use client'

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { ArrowLeft, Check, Copy, Delete } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { recordActivity, saveGameScore } from '@/lib/firebase/userData'
import { etDay } from '@/lib/daily'
import { ModeSwitch, NextPuzzleCountdown, PlayMode, dailyLabel } from '@/components/games/ModeSwitch'
import Skeleton from '@/components/ui/Skeleton'
import Notice from '@/components/ui/Notice'

interface Game {
  word: string
  hint: string
  storyId: string
  storyHeadline: string
  outlets: number
  category: string
  day?: string
  extra?: string[]
  options: { id: string; headline: string }[]
}

type Mark = 'hit' | 'near' | 'miss'
const ROWS = 6
const KEYS = ['QWERTYUIOP', 'ASDFGHJKL', 'ZXCVBNM']

function evaluate(guess: string, word: string): Mark[] {
  const res: Mark[] = Array(word.length).fill('miss')
  const left: Record<string, number> = {}
  for (let i = 0; i < word.length; i++) {
    if (guess[i] === word[i]) res[i] = 'hit'
    else left[word[i]] = (left[word[i]] || 0) + 1
  }
  for (let i = 0; i < word.length; i++) {
    if (res[i] === 'hit') continue
    if (left[guess[i]] > 0) {
      res[i] = 'near'
      left[guess[i]]--
    }
  }
  return res
}

const TILE: Record<Mark | 'empty' | 'typing', string> = {
  hit: 'border-emerald-600 bg-emerald-600 text-white',
  near: 'border-amber-500 bg-amber-500 text-white',
  miss: 'border-stone-500 bg-stone-500 text-white',
  empty: 'border-line bg-white',
  typing: 'border-ink bg-white',
}

function NewsdleGame() {
  const params = useSearchParams()
  const storyParam = params.get('story')
  const [mode, setMode] = useState<PlayMode>(params.get('mode') === 'unlimited' || storyParam ? 'unlimited' : 'daily')
  const [round, setRound] = useState(0)
  const { user } = useAuth()
  const [game, setGame] = useState<Game | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [guesses, setGuesses] = useState<string[]>([])
  const [current, setCurrent] = useState('')
  const [toast, setToast] = useState('')
  const [copied, setCopied] = useState(false)
  const [saved, setSaved] = useState(false)
  const [hintLevel, setHintLevel] = useState(0)
  const [dict, setDict] = useState<Set<string> | null>(null)
  const [shake, setShake] = useState(false)
  const savedRef = useRef(false)

  useEffect(() => {
    setGame(null)
    setError(null)
    setGuesses([])
    setCurrent('')
    setHintLevel(0)
    setSaved(false)
    savedRef.current = false
    const day = etDay()

    const start = (g: Game) => {
      setGame(g)
      try {
        const raw = mode === 'daily' ? localStorage.getItem(`newsdle:daily:${day}:progress`) : null
        setGuesses(raw ? JSON.parse(raw) : [])
      } catch {}
    }

    // Today's puzzle is remembered, so everyone on this device sees the same word all day
    if (mode === 'daily') {
      try {
        const cached = localStorage.getItem(`newsdle:daily:${day}:puzzle`)
        if (cached) return start(JSON.parse(cached))
      } catch {}
    }

    const qs = new URLSearchParams({ mode: mode === 'daily' ? 'daily' : 'random' })
    if (storyParam && mode === 'unlimited') qs.set('story', storyParam)
    if (mode === 'daily') qs.set('day', day) // new URL each day so shared caches roll over
    let cancelled = false
    fetch(`/api/games/newsdle?${qs}`, { cache: mode === 'daily' ? 'default' : 'no-store' })
      .then((r) => r.json().then((d) => (r.ok ? d : Promise.reject(new Error(d.error)))))
      .then((g: Game) => {
        if (cancelled) return
        if (mode === 'daily') {
          try {
            localStorage.setItem(`newsdle:daily:${day}:puzzle`, JSON.stringify(g))
          } catch {}
        }
        start(g)
      })
      .catch((e) => !cancelled && setError(e.message || 'Could not load the puzzle'))
    return () => {
      cancelled = true
    }
  }, [mode, storyParam, round])

  // Dictionary for checking guesses (loaded once, cached by the browser). If it can't load, guesses aren't blocked.
  useEffect(() => {
    let cancelled = false
    fetch('/words.txt')
      .then((r) => (r.ok ? r.text() : Promise.reject()))
      .then((t) => !cancelled && setDict(new Set(t.split('\n').filter(Boolean))))
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])

  const word = game?.word || ''
  const len = word.length
  const won = guesses.includes(word)
  const lost = !won && guesses.length >= ROWS
  const over = won || lost

  const flash = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(''), 1400)
  }

  // Always read the latest state, even if keys arrive faster than React re-renders
  const live = useRef({ current, guesses, game, over, dict, mode, len })
  useEffect(() => {
    live.current = { current, guesses, game, over, dict, mode, len }
  })

  const submit = useCallback(() => {
    const { current: cur, guesses: gs, game: g, over: done, dict: d, mode: m, len: n } = live.current
    if (!g || done) return
    if (cur.length < n) return flash('Not enough letters')
    const valid = cur === g.word || !d || d.has(cur.toLowerCase()) || (g.extra || []).includes(cur)
    if (!valid) {
      setShake(true)
      setTimeout(() => setShake(false), 450)
      return flash('Not in word list')
    }
    const next = [...gs, cur]
    live.current.guesses = next
    live.current.current = ''
    setGuesses(next)
    setCurrent('')
    if (m === 'daily') {
      try {
        localStorage.setItem(`newsdle:daily:${etDay()}:progress`, JSON.stringify(next))
      } catch {}
    }
  }, [])

  const press = useCallback(
    (k: string) => {
      const { game: g, over: done, len: n } = live.current
      if (!g || done) return
      if (k === 'ENTER') return submit()
      if (k === 'BACK') {
        live.current.current = live.current.current.slice(0, -1)
        return setCurrent(live.current.current)
      }
      if (/^[A-Z]$/.test(k) && live.current.current.length < n) {
        live.current.current += k
        setCurrent(live.current.current)
      }
    },
    [submit]
  )

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return
      if (e.key === 'Enter') press('ENTER')
      else if (e.key === 'Backspace') press('BACK')
      else if (/^[a-zA-Z]$/.test(e.key)) press(e.key.toUpperCase())
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [press])

  const marks = useMemo(() => guesses.map((g) => evaluate(g, word)), [guesses, word])

  const keyState = useMemo(() => {
    const m: Record<string, Mark> = {}
    const rank = { miss: 0, near: 1, hit: 2 }
    guesses.forEach((g, gi) => {
      for (let i = 0; i < g.length; i++) {
        const mark = marks[gi][i]
        if (!m[g[i]] || rank[mark] > rank[m[g[i]]]) m[g[i]] = mark
      }
    })
    return m
  }, [guesses, marks])

  useEffect(() => {
    if (!over || !user || !game || savedRef.current) return
    // The daily puzzle only counts once per day, even if the page is reopened
    const flag = `newsdle:daily:${etDay()}:saved`
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
    const score = won ? ROWS + 1 - guesses.length : 0
    saveGameScore(user.uid, { game: 'newsdle', storyId: game.storyId, storyHeadline: game.storyHeadline, score, total: ROWS })
      .then(() => recordActivity(user.uid, 10 + score * 5))
      .then(() => {
        setSaved(true)
        if (mode === 'daily') {
          try {
            localStorage.setItem(flag, '1')
          } catch {}
        }
      })
      .catch(() => {})
  }, [over, user, game, won, guesses.length, mode])

  const share = async () => {
    const grid = marks.map((r) => r.map((m) => (m === 'hit' ? '🟩' : m === 'near' ? '🟨' : '⬛')).join('')).join('\n')
    const text = `Hermesian Newsdle ${won ? guesses.length : 'X'}/${ROWS}\n${grid}`
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {}
  }

  return (
    <div className="mx-auto max-w-md px-4 py-6">
      <Link href="/games" className="inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-primary">
        <ArrowLeft className="h-4 w-4" /> Games
      </Link>
      <header className="mt-3 text-center">
        <h1 className="font-headline text-3xl font-black">Newsdle</h1>
        <p className="mt-1 text-sm text-muted">Guess the word that headlines keep using.</p>
        <ModeSwitch mode={mode} onChange={(m) => { setMode(m); setRound(0) }} />
        {mode === 'daily' && <p className="mt-2 text-xs text-muted">Daily puzzle · {dailyLabel()} · resets at midnight ET</p>}
      </header>

      {error && <div className="mt-6"><Notice tone="error">{error}</Notice></div>}
      {!game && !error && <div className="mt-6 space-y-3"><Skeleton className="h-16" /><Skeleton className="h-72" /></div>}

      {game && (
        <>
          <div className="mt-5 rounded-xl border border-line bg-white p-3 text-center text-sm">
            <p className="label-mono mb-1">Hint · {len} letters · used by {game.outlets} outlets</p>
            <p className="font-headline font-bold leading-snug">{game.hint}</p>
            {hintLevel >= 1 && <p className="mt-2 text-xs font-semibold text-primary">Category: {game.category}</p>}
            {hintLevel >= 2 && <p className="mt-1 text-xs font-semibold text-primary">Starts with “{word[0]}” and ends with “{word[len - 1]}”</p>}
            {!over && hintLevel < 2 && (
              <button onClick={() => setHintLevel((h) => h + 1)} className="mt-2 text-xs font-semibold text-primary underline-offset-2 hover:underline">
                {hintLevel === 0 ? 'Need a hint?' : 'Another hint'}
              </button>
            )}
          </div>

          <div className="relative mt-5">
            {toast && <div className="absolute -top-3 left-1/2 z-10 -translate-x-1/2 animate-pop rounded-lg bg-ink px-3 py-1.5 text-xs font-semibold text-white">{toast}</div>}
            <div className="mx-auto grid gap-1.5" style={{ maxWidth: Math.min(len * 58, 400) }}>
              {Array.from({ length: ROWS }).map((_, r) => {
                const g = guesses[r]
                const isCurrent = r === guesses.length && !over
                return (
                  <div key={r} className={`grid gap-1.5 ${isCurrent && shake ? 'animate-[wiggle_0.4s]' : ''}`} style={{ gridTemplateColumns: `repeat(${len}, minmax(0, 1fr))` }}>
                    {Array.from({ length: len }).map((_, c) => {
                      const letter = g ? g[c] : isCurrent ? current[c] || '' : ''
                      const style = g ? TILE[marks[r][c]] : isCurrent && letter ? TILE.typing : TILE.empty
                      return (
                        <div key={c} className={`flex aspect-square items-center justify-center rounded-md border-2 text-xl font-black transition sm:text-2xl ${style} ${isCurrent && letter ? 'animate-pop' : ''}`}>
                          {letter}
                        </div>
                      )
                    })}
                  </div>
                )
              })}
            </div>
          </div>

          {over ? (
            <div className="card mt-6 animate-rise p-5 text-center">
              <p className="font-headline text-2xl font-black">{won ? `Solved in ${guesses.length}/${ROWS}!` : `The word was ${word}`}</p>
              <p className="mt-1 text-sm text-muted">From: {game.storyHeadline}</p>
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                {mode === 'unlimited' && (
                  <button onClick={() => setRound((r) => r + 1)} className="btn-primary !py-2">Next word</button>
                )}
                {mode === 'daily' && (
                  <button onClick={() => setMode('unlimited')} className="btn-primary !py-2">Play unlimited</button>
                )}
                <Link href={`/story/${game.storyId}`} className="btn-ghost !py-2">Read the story</Link>
                <button onClick={share} className="btn-ghost !py-2">{copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />} {copied ? 'Copied' : 'Share'}</button>
              </div>
              {mode === 'daily' && <p className="mt-3 text-xs text-muted">Next daily puzzle in <NextPuzzleCountdown /></p>}
              <p className="mt-3 text-xs text-muted">
                {user ? (saved ? 'Score saved to your profile.' : '') : <><Link href="/login" className="font-semibold text-primary hover:underline">Sign in</Link> to save scores.</>}
              </p>
            </div>
          ) : (
            <div className="mt-6 select-none space-y-1.5">
              {KEYS.map((row, i) => (
                <div key={row} className="flex justify-center gap-1">
                  {i === 2 && <button onClick={() => press('ENTER')} className="h-12 rounded-md bg-ink px-3 text-xs font-bold text-white sm:px-4">ENTER</button>}
                  {row.split('').map((k) => (
                    <button
                      key={k}
                      onClick={() => press(k)}
                      className={`h-12 min-w-0 flex-1 rounded-md text-sm font-bold transition sm:max-w-[40px] ${
                        keyState[k] === 'hit' ? 'bg-emerald-600 text-white' : keyState[k] === 'near' ? 'bg-amber-500 text-white' : keyState[k] === 'miss' ? 'bg-stone-400 text-white' : 'bg-line hover:bg-secondary/50'
                      }`}
                    >
                      {k}
                    </button>
                  ))}
                  {i === 2 && <button onClick={() => press('BACK')} className="flex h-12 items-center rounded-md bg-ink px-3 text-white sm:px-4" aria-label="Backspace"><Delete className="h-4 w-4" /></button>}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default function NewsdlePage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-md px-4 py-12"><Skeleton className="h-72" /></div>}>
      <NewsdleGame />
    </Suspense>
  )
}
