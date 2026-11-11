'use client'

import { Fragment, useCallback, useEffect, useMemo, useState } from 'react'
import { Check, X, ArrowRight, RotateCcw } from 'lucide-react'
import type { GameItem } from '@/lib/games'

function Highlighted({ text, terms }: { text: string; terms?: string[] }) {
  if (!terms || terms.length === 0) return <>{text}</>
  const escaped = terms.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
  const re = new RegExp(`(${escaped.join('|')})`, 'gi')
  return (
    <>
      {text.split(re).map((part, i) =>
        terms.some((t) => t.toLowerCase() === part.toLowerCase()) ? (
          <mark key={i} className="rounded bg-red-200 px-0.5 font-semibold text-red-950">{part}</mark>
        ) : (
          <Fragment key={i}>{part}</Fragment>
        )
      )}
    </>
  )
}

function Ring({ pct }: { pct: number }) {
  const r = 52
  const c = 2 * Math.PI * r
  return (
    <svg viewBox="0 0 130 130" className="h-36 w-36">
      <circle cx="65" cy="65" r={r} fill="none" stroke="#eadfd6" strokeWidth="12" />
      <circle
        cx="65" cy="65" r={r} fill="none" stroke={pct >= 80 ? '#059669' : pct >= 50 ? '#966c6b' : '#dc2626'} strokeWidth="12"
        strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - pct / 100)} transform="rotate(-90 65 65)"
        style={{ transition: 'stroke-dashoffset 0.8s ease-out' }}
      />
      <text x="65" y="72" textAnchor="middle" className="fill-ink font-headline text-3xl font-black">{pct}%</text>
    </svg>
  )
}

export interface RunnerResult {
  score: number
  total: number
}

export default function GameRunner({
  items,
  onFinish,
  onReplay,
  footer,
}: {
  items: GameItem[]
  onFinish: (r: RunnerResult) => void
  onReplay: () => void
  footer?: React.ReactNode
}) {
  const [index, setIndex] = useState(0)
  const [picked, setPicked] = useState<number | null>(null)
  const [results, setResults] = useState<boolean[]>([])
  const [done, setDone] = useState(false)

  const item = items[index]
  const score = results.filter(Boolean).length
  const answered = picked !== null

  const choose = useCallback(
    (i: number) => {
      if (picked !== null || !item) return
      setPicked(i)
      setResults((r) => [...r, i === item.answer])
    },
    [picked, item]
  )

  const next = useCallback(() => {
    if (index + 1 >= items.length) {
      setDone(true)
      return
    }
    setIndex((i) => i + 1)
    setPicked(null)
  }, [index, items.length])

  useEffect(() => {
    if (done) onFinish({ score, total: items.length })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [done])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (done) return
      if (e.key === 'Enter' && answered) next()
      const n = Number(e.key)
      if (!answered && n >= 1 && n <= (item?.options.length || 0)) choose(n - 1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [answered, done, item, choose, next])

  const bestStreak = useMemo(() => {
    let best = 0
    let cur = 0
    for (const r of results) {
      cur = r ? cur + 1 : 0
      best = Math.max(best, cur)
    }
    return best
  }, [results])

  if (done) {
    const pct = Math.round((score / items.length) * 100)
    const verdict = pct === 100 ? 'Flawless. Editor-in-chief material.' : pct >= 80 ? 'Sharp eyes — you read the news like a pro.' : pct >= 50 ? 'Solid. A little more practice and you\'ll spot everything.' : 'Good start — read the explanations below and try again.'
    return (
      <div className="card animate-pop p-6 text-center md:p-10">
        <div className="flex justify-center"><Ring pct={pct} /></div>
        <h2 className="mt-4 font-headline text-3xl font-black">{score} / {items.length} correct</h2>
        <p className="mt-2 text-muted">{verdict}</p>
        <p className="label-mono mt-3">Best streak: {bestStreak}</p>
        {footer}
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button onClick={onReplay} className="btn-primary"><RotateCcw className="h-4 w-4" /> Play again</button>
        </div>
        <div className="mt-8 space-y-3 text-left">
          {items.map((it, i) => (
            <div key={it.id} className="flex gap-3 rounded-xl border border-line p-3 text-sm">
              <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-white ${results[i] ? 'bg-emerald-600' : 'bg-red-500'}`}>
                {results[i] ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
              </span>
              <div>
                <p className="font-semibold">{it.body || it.prompt}</p>
                <p className="mt-0.5 text-muted">Answer: {it.options[it.answer]} — {it.explanation}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-5 flex items-center justify-between text-sm">
        <span className="label-mono">Question {index + 1} of {items.length}</span>
        <span className="font-semibold tabular-nums">Score {score}</span>
      </div>
      <div className="mb-6 h-1.5 overflow-hidden rounded-full bg-line">
        <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${((index + (answered ? 1 : 0)) / items.length) * 100}%` }} />
      </div>

      <div key={item.id} className="card animate-rise p-5 md:p-8">
        <div className="flex items-center gap-2">
          <p className="font-headline text-lg font-bold leading-snug md:text-xl">{item.prompt}</p>
        </div>
        {item.body && (
          <blockquote className="mt-4 rounded-xl border-l-4 border-primary bg-paper p-4 font-headline text-base leading-relaxed md:text-lg">
            {answered ? <Highlighted text={item.body} terms={item.highlights} /> : item.body}
          </blockquote>
        )}

        <div className={`mt-6 grid gap-3 ${item.options.length === 2 ? 'sm:grid-cols-2' : ''}`}>
          {item.options.map((opt, i) => {
            const correct = i === item.answer
            const chosen = i === picked
            const style = !answered
              ? 'border-line bg-white hover:border-primary hover:bg-accent/40'
              : correct
              ? 'border-emerald-500 bg-emerald-50'
              : chosen
              ? 'border-red-400 bg-red-50'
              : 'border-line bg-white opacity-60'
            return (
              <button
                key={i}
                onClick={() => choose(i)}
                disabled={answered}
                className={`flex items-center gap-3 rounded-xl border-2 p-4 text-left text-sm font-medium transition ${style}`}
              >
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-line bg-paper font-mono text-xs">{i + 1}</span>
                <span className="flex-1">{opt}</span>
                {answered && correct && <Check className="h-4 w-4 text-emerald-600" />}
                {answered && chosen && !correct && <X className="h-4 w-4 text-red-500" />}
              </button>
            )
          })}
        </div>

        {answered && (
          <div className="mt-6 animate-rise rounded-xl bg-ink p-4 text-sm leading-relaxed text-white">
            <p className="font-semibold">{picked === item.answer ? '✓ Correct' : '✗ Not quite'}</p>
            {item.reveal && <p className="mt-1 text-white/70">{item.reveal}</p>}
            <p className="mt-1.5 text-white/85">{item.explanation}</p>
            {item.origin === 'ai' && <p className="label-mono mt-2 !text-white/50">AI-written question</p>}
          </div>
        )}

        {answered && (
          <button onClick={next} className="btn-primary mt-5 w-full sm:w-auto">
            {index + 1 >= items.length ? 'See results' : 'Next'} <ArrowRight className="h-4 w-4" />
          </button>
        )}
      </div>
      <p className="mt-3 text-center text-xs text-muted">Tip: press 1–{item.options.length} to answer, Enter for next.</p>
    </div>
  )
}
