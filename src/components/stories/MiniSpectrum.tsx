import type { StoryArticle } from '@/lib/stories'
import { leanColor } from '@/lib/outlets'

export default function MiniSpectrum({ articles }: { articles: StoryArticle[] }) {
  const rated = articles.filter((a) => a.lean !== null)
  return (
    <div className="relative h-2 rounded-full" style={{ background: 'linear-gradient(90deg,#dbe6fb,#e9e6ee 50%,#f8dcd7)' }} aria-label="Outlet spectrum">
      {rated.map((a) => (
        <span
          key={a.source}
          className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow"
          style={{ left: `${Math.min(97, Math.max(3, ((a.lean as number) + 100) / 2))}%`, background: leanColor(a.lean as number) }}
          title={`${a.outlet || a.source}`}
        />
      ))}
    </div>
  )
}
