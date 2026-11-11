'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import type { StoryArticle } from '@/lib/stories'
import { BUCKET_META, BUCKET_ORDER, leanColor } from '@/lib/outlets'
import RatingsNote from './RatingsNote'
import OutletIcon from './OutletIcon'

interface Props {
  articles: StoryArticle[]
  /** Optional marker, e.g. an analyzed article's text-based lean. */
  marker?: { lean: number; label: string } | null
}

const ICON = 36
const STEP = ICON + 6 // vertical space per stacked icon
const MIN_DX = ICON + 6 // horizontal space an icon needs in its row
const LABELS_H = 22
const BAR_H = 10
const GAP = 10

export default function SpectrumChart({ articles, marker }: Props) {
  const box = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(700)

  useEffect(() => {
    if (!box.current) return
    const ro = new ResizeObserver((entries) => setWidth(entries[0].contentRect.width))
    ro.observe(box.current)
    return () => ro.disconnect()
  }, [])

  const { placed, rows, unrated } = useMemo(() => {
    const rated = articles.filter((a) => a.lean !== null).sort((a, b) => (a.lean as number) - (b.lean as number))
    const ends: number[] = [] // right edge (px) of the last icon in each row
    const placed = rated.map((a) => {
      const pct = Math.min(96, Math.max(4, ((a.lean as number) + 100) / 2))
      const px = (pct / 100) * width
      let row = ends.findIndex((end) => px - end >= MIN_DX)
      if (row === -1) row = ends.length
      ends[row] = px
      return { a, pct, row }
    })
    return { placed, rows: Math.max(1, ends.length), unrated: articles.filter((a) => a.lean === null) }
  }, [articles, width])

  const barBottom = LABELS_H + 6
  const iconBase = barBottom + BAR_H + GAP
  const height = iconBase + rows * STEP + 44 // 44 = room for the hover tooltip above the top row

  return (
    <div>
      <div ref={box} className="relative" style={{ height }}>
        {/* stems: bar -> icon, drawn behind the icons */}
        {placed.map(({ a, pct, row }) => (
          <span
            key={`s-${a.source}-${a.url}`}
            className="absolute z-0 w-px -translate-x-1/2 bg-charcoal/15"
            style={{ left: `${pct}%`, bottom: barBottom + BAR_H, height: GAP + row * STEP + ICON / 2 }}
          />
        ))}

        {/* track */}
        <div className="absolute inset-x-0" style={{ bottom: barBottom }}>
          <div className="relative rounded-full" style={{ height: BAR_H, background: 'linear-gradient(90deg,#1d4ed8 0%,#60a5fa 28%,#a3a3b2 50%,#fb923c 72%,#b91c1c 100%)' }}>
            {[-60, -20, 20, 60].map((t) => (
              <span key={t} className="absolute top-0 h-full w-px bg-white/80" style={{ left: `${(t + 100) / 2}%` }} />
            ))}
            {placed.map(({ a, pct }) => (
              <span
                key={`d-${a.source}-${a.url}`}
                className="absolute top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow"
                style={{ left: `${pct}%`, background: leanColor(a.lean as number) }}
              />
            ))}
            {marker && (
              <span className="absolute -top-1 -translate-x-1/2" style={{ left: `${Math.min(98, Math.max(2, (marker.lean + 100) / 2))}%` }}>
                <span className="block h-6 w-1 rounded bg-charcoal" />
                <span className="absolute left-1/2 top-7 -translate-x-1/2 whitespace-nowrap rounded bg-charcoal px-1.5 py-0.5 text-[10px] font-semibold text-white">{marker.label}</span>
              </span>
            )}
          </div>
        </div>

        {/* section labels */}
        <div className="absolute inset-x-0 bottom-0 grid grid-cols-5 text-center font-mono text-[10px] uppercase tracking-wider text-dim" style={{ height: LABELS_H - 4 }}>
          {BUCKET_ORDER.map((b) => (
            <span key={b} className="truncate">{BUCKET_META[b].label}</span>
          ))}
        </div>

        {/* icons */}
        {placed.map(({ a, pct, row }) => (
          <div
            key={`i-${a.source}-${a.url}`}
            className="absolute z-10 -translate-x-1/2 transition-transform hover:z-20 hover:scale-110"
            style={{ left: `${pct}%`, bottom: iconBase + row * STEP }}
          >
            <OutletIcon name={a.outlet || a.source} domain={a.domain} lean={a.lean} size={ICON} />
          </div>
        ))}
      </div>

      {unrated.length > 0 && (
        <div className="mt-3 flex items-center gap-3">
          <span className="label-mono">Not rated</span>
          <div className="flex flex-wrap gap-2">
            {unrated.map((a) => (
              <OutletIcon key={a.source + a.url} name={a.source} domain={a.domain} lean={null} size={28} />
            ))}
          </div>
        </div>
      )}
      <RatingsNote />
    </div>
  )
}
