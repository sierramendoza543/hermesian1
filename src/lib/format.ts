export function timeAgo(iso?: string | number | null): string {
  if (!iso) return ''
  const t = typeof iso === 'number' ? iso : Date.parse(iso)
  if (!Number.isFinite(t)) return ''
  const mins = Math.max(0, Math.round((Date.now() - t) / 60000))
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.round(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.round(hrs / 24)
  return `${days}d ago`
}

export function signed(n: number): string {
  return `${n > 0 ? '+' : ''}${Math.round(n)}`
}

export function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n))
}

// Session cache so the story page can open instantly and survive a server
// cache rotation. Safe to call on the server (no-ops).
export function rememberStory(story: unknown & { id: string }) {
  try {
    sessionStorage.setItem(`story:${story.id}`, JSON.stringify(story))
  } catch {}
}

export function recallStory<T>(id: string): T | null {
  try {
    const raw = sessionStorage.getItem(`story:${id}`)
    return raw ? (JSON.parse(raw) as T) : null
  } catch {
    return null
  }
}
