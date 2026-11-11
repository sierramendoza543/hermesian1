'use client'

import { useMemo, useState } from 'react'
import type { Highlight, HighlightKind } from '@/lib/analysis'
import { SPAN_KINDS } from '@/lib/analysis'

const STYLE: Record<HighlightKind, { label: string; cls: string }> = {
  evidence: { label: 'Bias evidence', cls: 'bg-amber-100 ring-1 ring-amber-300' },
  fallacy: { label: 'Fallacy', cls: 'bg-purple-100 ring-1 ring-purple-300' },
  claim: { label: 'Claim to check', cls: 'border-b-2 border-dotted border-sky-500' },
  loaded: { label: 'Loaded phrase', cls: 'bg-red-200 text-red-950 font-semibold rounded-sm' },
  charged: { label: 'Charged word', cls: 'bg-orange-100 rounded-sm' },
  'left-coded': { label: 'Left-coded', cls: 'bg-blue-100 rounded-sm' },
  'right-coded': { label: 'Right-coded', cls: 'bg-rose-100 rounded-sm' },
}

export default function AnnotatedText({ text, highlights }: { text: string; highlights: Highlight[] }) {
  const present = useMemo(() => [...new Set(highlights.map((h) => h.kind))], [highlights])
  const [off, setOff] = useState<Set<HighlightKind>>(new Set())

  const segments = useMemo(() => {
    const active = highlights.filter((h) => !off.has(h.kind))
    const spans = active.filter((h) => SPAN_KINDS.includes(h.kind))
    const marks = active.filter((h) => !SPAN_KINDS.includes(h.kind))
    const points = new Set<number>([0, text.length])
    for (const h of active) {
      points.add(h.start)
      points.add(h.end)
    }
    const sorted = [...points].filter((p) => p >= 0 && p <= text.length).sort((a, b) => a - b)
    const out: { text: string; span?: Highlight; mark?: Highlight }[] = []
    for (let i = 0; i < sorted.length - 1; i++) {
      const a = sorted[i]
      const b = sorted[i + 1]
      if (a === b) continue
      out.push({
        text: text.slice(a, b),
        span: spans.find((s) => s.start <= a && s.end >= b),
        mark: marks.find((m) => m.start <= a && m.end >= b),
      })
    }
    return out
  }, [text, highlights, off])

  const toggle = (k: HighlightKind) =>
    setOff((prev) => {
      const next = new Set(prev)
      if (next.has(k)) next.delete(k)
      else next.add(k)
      return next
    })

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-2">
        {present.map((k) => (
          <button
            key={k}
            onClick={() => toggle(k)}
            className={`flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium transition ${
              off.has(k) ? 'border-sand bg-white text-dim line-through' : 'border-charcoal/20 bg-white text-charcoal'
            }`}
          >
            <span className={`inline-block h-3 w-4 ${STYLE[k].cls}`} />
            {STYLE[k].label}
          </button>
        ))}
      </div>
      <div className="max-h-[560px] overflow-y-auto rounded-xl border border-sand bg-cream p-5 text-[15px] leading-8 whitespace-pre-wrap">
        {segments.map((s, i) => {
          const inner = s.mark ? (
            <span className={STYLE[s.mark.kind].cls} title={s.mark.label}>
              {s.text}
            </span>
          ) : (
            s.text
          )
          return s.span ? (
            <span key={i} className={STYLE[s.span.kind].cls} title={s.span.label}>
              {inner}
            </span>
          ) : (
            <span key={i}>{inner}</span>
          )
        })}
      </div>
      <p className="mt-2 text-xs text-dim">Hover any highlight for its label. Click a legend chip to hide that layer.</p>
    </div>
  )
}
