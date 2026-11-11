'use client'

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { ArrowLeft, Check, Copy, Delete } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { recordActivity, saveGameScore } from '@/lib/firebase/userData'
import Skeleton from '@/components/ui/Skeleton'
import Notice from '@/components/ui/Notice'

interface Game {
  word: string
  hint: string
  storyId: string
  storyHeadline: string
  outlets: number
  category: string
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
  const { user } = useAuth()
  const [game, setGame] = useState<Game | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [guesses, setGuesses] = useState<string[]>([])
  const [current, setCurrent] = useState('')
  const [toast, setToast] = useState('')
  const [copied, setCopied] = useState(false)
  const [saved, setSaved] = useState(false)
  const [hintLevel, setHintLevel] = useState(0)
  const savedRef = useRef(false)

  useEffect(() => {
    setGame(null)
    setError(null)
    fetch(`/api/games/newsdle${storyParam ? `?story=${storyParam}` : ''}`)
      .then((r) => r.json().then((d) => (r.ok ? d : Promise.reject(new Error(d.error)))))
      .then((g: Game) => {
        setGame(g)
        savedRef.current = false
        try {
          const raw = localStorage.getItem(`newsdle:${g.storyId}:${g.word}`)
          setGuesses(raw ? JSON.parse(raw) : [])
        } catch {
          setGuesses([])
        }
        setCurrent('')
      })
      .catch((e) => setError(e.message || 'Could not load the puzzle'))
  }, [storyParam])

  const word = game?.word || ''
  const len = word.length
  const won = guesses.includes(word)
  const lost = !won && guesses.length >= ROWS
  const over = won || lost

  const flash = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(''), 1400)
  }

  const submit = useCallback(() => {
    if (!game || over) return
    if (current.length < len) return flash('Not enough letters')
    const next = [...guesses, current]
    setGuesses(next)
    setCurrent('')
    try {
      localStorage.setItem(`newsdle:${game.storyId}:${game.word}`, JSON.stringify(next))
    } catch {}
  }, [game, over, current, len, guesses])

  const press = useCallback(
    (k: string) => {
      if (!game || over) return
      if (k === 'ENTER') return submit()
      if (k === 'BACK') return setCurrent((c) => c.slice(0, -1))
      if (/^[A-Z]$/.test(k)) setCurrent((c) => (c.length < len ? c + k : c))
    },
    [game, over, submit, len]
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
    savedRef.current = true
    const score = won ? ROWS + 1 - guesses.length : 0
    saveGameScore(user.uid, { game: 'newsdle', storyId: game.storyId, storyHeadline: game.storyHeadline, score, total: ROWS })
      .then(() => recordActivity(user.uid, 10 + score * 5))
      .then(() => setSaved(true))
      .catch(() => {})
  }, [over, user, game, won, guesses.length])

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
                  <div key={r} className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${len}, minmax(0, 1fr))` }}>
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
                <Link href={`/story/${game.storyId}`} className="btn-primary !py-2">Read the story</Link>
                <button onClick={share} className="btn-ghost !py-2">{copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />} {copied ? 'Copied' : 'Share'}</button>
              </div>
              <p className="mt-3 text-xs text-muted">
                {user ? (saved ? 'Score saved to your profile.' : '') : <><Link href="/login" className="font-semibold text-primary hover:underline">Sign in</Link> to save scores.</>}
              </p>
              <div className="mt-5 border-t border-line pt-4 text-left">
                <p className="label-mono mb-2">Play another story&apos;s word</p>
                <div className="space-y-1.5">
                  {game.options.filter((o) => o.id !== game.storyId).slice(0, 3).map((o) => (
                    <Link key={o.id} href={`/games/newsdle?story=${o.id}`} className="block rounded-lg border border-line px-3 py-2 text-sm hover:border-primary">
                      {o.headline.length > 70 ? `${o.headline.slice(0, 68)}…` : o.headline}
                    </Link>
                  ))}
                </div>
              </div>
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
