'use client'

import { useEffect, useState } from 'react'
import { etDay, formatCountdown, secondsUntilNextPuzzle } from '@/lib/daily'

export type PlayMode = 'daily' | 'unlimited'

export function ModeSwitch({ mode, onChange }: { mode: PlayMode; onChange: (m: PlayMode) => void }) {
  return (
    <div className="mx-auto mt-4 flex w-fit rounded-full border border-line bg-white p-1 text-sm font-semibold">
      {(['daily', 'unlimited'] as PlayMode[]).map((m) => (
        <button
          key={m}
          onClick={() => onChange(m)}
          className={`rounded-full px-4 py-1.5 capitalize transition ${mode === m ? 'bg-ink text-white' : 'text-ink/70 hover:text-ink'}`}
        >
          {m === 'daily' ? 'Daily' : 'Unlimited'}
        </button>
      ))}
    </div>
  )
}

/** Counts down to the next daily puzzle (midnight Eastern). */
export function NextPuzzleCountdown() {
  const [left, setLeft] = useState<number | null>(null)
  useEffect(() => {
    const tick = () => setLeft(secondsUntilNextPuzzle())
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [])
  return <span className="font-mono tabular-nums">{left === null ? '–:––:––' : formatCountdown(left)}</span>
}

export function dailyLabel(): string {
  const [y, m, d] = etDay().split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString(undefined, { timeZone: 'UTC', month: 'long', day: 'numeric' })
}
