'use client'

import { useEffect, useRef, useState } from 'react'

const memo = new Map<string, string | null>()

const GRADIENTS = [
  'linear-gradient(135deg,#966c6b,#1c1620)',
  'linear-gradient(135deg,#1d4ed8,#1c1620)',
  'linear-gradient(135deg,#7c3aed,#1c1620)',
  'linear-gradient(135deg,#059669,#1c1620)',
  'linear-gradient(135deg,#b45309,#1c1620)',
]

/** Lazy lead image for a story; falls back to a tinted placeholder. */
export default function StoryImage({
  id,
  articles,
  label,
  className = '',
}: {
  id: string
  articles: { url: string; domain: string }[]
  label?: string
  className?: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [src, setSrc] = useState<string | null | undefined>(memo.get(id))
  const [broken, setBroken] = useState(false)

  useEffect(() => {
    if (memo.has(id) || !ref.current) return
    const el = ref.current
    const io = new IntersectionObserver(
      (entries) => {
        if (!entries[0].isIntersecting) return
        io.disconnect()
        const a = encodeURIComponent(JSON.stringify(articles.slice(0, 5).map((x) => ({ u: x.url, d: x.domain }))))
        fetch(`/api/story-image?id=${id}&a=${a}`)
          .then((r) => r.json())
          .then((d) => {
            memo.set(id, d.url || null)
            setSrc(d.url || null)
          })
          .catch(() => setSrc(null))
      },
      { rootMargin: '300px' }
    )
    io.observe(el)
    return () => io.disconnect()
  }, [id, articles])

  const gradient = GRADIENTS[id.charCodeAt(0) % GRADIENTS.length]
  return (
    <div ref={ref} className={`relative overflow-hidden bg-sand ${className}`} style={{ background: src && !broken ? undefined : gradient }}>
      {src && !broken && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt=""
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={() => setBroken(true)}
          className="absolute inset-0 h-full w-full animate-pop object-cover"
        />
      )}
      {(!src || broken) && label && (
        <span className="absolute bottom-2 left-2 rounded bg-black/30 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-white/80">{label}</span>
      )}
    </div>
  )
}
