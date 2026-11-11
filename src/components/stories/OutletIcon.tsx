'use client'

import { useState } from 'react'
import { faviconUrl, leanColor, leanLabel } from '@/lib/outlets'

export default function OutletIcon({
  name,
  domain,
  lean,
  size = 32,
}: {
  name: string
  domain?: string
  lean: number | null
  size?: number
}) {
  const [failed, setFailed] = useState(false)
  const ring = lean === null ? '#cfc6bd' : leanColor(lean)
  return (
    <span className="group/icon relative inline-flex" style={{ width: size, height: size }}>
      <span
        className="flex h-full w-full items-center justify-center overflow-hidden rounded-full bg-white text-[11px] font-bold text-ink"
        style={{ boxShadow: `0 0 0 2px ${ring}` }}
      >
        {domain && !failed ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={faviconUrl(domain, 64)}
            alt=""
            width={size - 10}
            height={size - 10}
            loading="lazy"
            onError={() => setFailed(true)}
            className="h-[70%] w-[70%] object-contain"
          />
        ) : (
          name.slice(0, 2).toUpperCase()
        )}
      </span>
      <span className="pointer-events-none absolute bottom-full left-1/2 z-30 mb-2 hidden w-max max-w-[200px] -translate-x-1/2 rounded-lg bg-ink px-2.5 py-1.5 text-center text-xs font-semibold leading-snug text-white shadow-lift group-hover/icon:block">
        {name}
        {lean !== null && <span className="block text-[10px] font-normal opacity-70">{leanLabel(lean)}</span>}
      </span>
    </span>
  )
}
