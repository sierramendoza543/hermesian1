import type { Story } from '@/lib/stories'
import { BUCKET_META, BUCKET_ORDER } from '@/lib/outlets'

export default function CoverageBreakdown({ story }: { story: Pick<Story, 'spectrum' | 'ratedCount'> }) {
  const total = story.ratedCount || 1
  return (
    <div>
      <div className="flex h-3 overflow-hidden rounded-full bg-sand">
        {BUCKET_ORDER.map((b) => {
          const n = story.spectrum[b]
          if (!n) return null
          return <div key={b} style={{ width: `${(n / total) * 100}%`, background: BUCKET_META[b].color }} title={`${BUCKET_META[b].label}: ${n}`} />
        })}
      </div>
      <div className="mt-3 grid grid-cols-5 gap-2">
        {BUCKET_ORDER.map((b) => (
          <div key={b} className="rounded-xl border border-sand bg-white p-2 text-center">
            <div className="text-lg font-bold tabular-nums" style={{ color: BUCKET_META[b].color }}>{story.spectrum[b]}</div>
            <div className="font-mono text-[9px] uppercase tracking-wider text-dim sm:text-[10px]">{BUCKET_META[b].label}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
