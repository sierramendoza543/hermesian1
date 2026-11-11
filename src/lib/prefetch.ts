import type { Story } from '@/lib/stories'

// Warms the AI brief while the reader is still deciding to open a story,
// so the story page appears already filled in.

const started = new Set<string>()

export function briefRequestBody(s: Pick<Story, 'id' | 'headline' | 'category' | 'articles'>) {
  return {
    id: s.id,
    story: {
      headline: s.headline,
      category: s.category,
      articles: s.articles.map((a) => ({ title: a.title, source: a.source, domain: a.domain })),
    },
  }
}

export function prefetchBrief(s: Pick<Story, 'id' | 'headline' | 'category' | 'articles'>) {
  if (started.has(s.id)) return
  started.add(s.id)
  try {
    if (sessionStorage.getItem(`brief:${s.id}`)) return
  } catch {}
  fetch('/api/stories/brief', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(briefRequestBody(s)),
  })
    .then((r) => (r.ok ? r.json() : null))
    .then((d) => {
      if (d?.brief) {
        try {
          sessionStorage.setItem(`brief:${s.id}`, JSON.stringify({ brief: d.brief, provider: d.provider }))
        } catch {}
      }
    })
    .catch(() => {})
}
