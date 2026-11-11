import { generateJSON } from '@/lib/llm'
import type { Story } from '@/lib/stories'

// Short, neutral card summaries: a clean title and two bullets per story,
// written in batches so a whole page of cards costs one AI call.

export interface Digest {
  title: string
  bullets: string[]
}

const cache = new Map<string, { at: number; digest: Digest }>()
const TTL = 6 * 60 * 60 * 1000

async function writeBatch(stories: Story[]): Promise<void> {
  const blocks = stories
    .map((s, i) => `STORY ${i + 1}\n${s.articles.slice(0, 7).map((a) => `- [${a.outlet || a.source}] ${a.title}`).join('\n')}`)
    .join('\n\n')

  const { data } = await generateJSON<{ items: { title: string; bullets: string[] }[] }>({
    system:
      'You write the card summaries for a neutral news app. Use ONLY facts stated in the headlines given. Never add names, numbers or claims that the headlines do not support. Plain, specific, calm language.',
    prompt: `${blocks}

For each story write:
- "title": a neutral, specific headline, max 12 words, no clickbait or loaded words
- "bullets": exactly 2 short bullets (max 18 words each): what happened, and the key detail or what happens next

Return JSON: { "items": [ { "title": string, "bullets": [string, string] } ] } with exactly ${stories.length} items, in order.`,
    maxTokens: 2200,
    temperature: 0.2,
    order: ['gemini', 'groq', 'claude'],
    fast: true,
    timeoutMs: 14000,
    validate: (d) => {
      if (!Array.isArray(d?.items) || d.items.length !== stories.length) throw new Error('digest count mismatch')
    },
  })

  stories.forEach((s, i) => {
    const it = data.items[i]
    const bullets = (Array.isArray(it?.bullets) ? it.bullets : []).map((b) => String(b).trim()).filter(Boolean).slice(0, 2)
    const title = String(it?.title || '').trim()
    if (title && bullets.length) cache.set(s.id, { at: Date.now(), digest: { title, bullets } })
  })
}

export async function getDigests(stories: Story[]): Promise<Record<string, Digest>> {
  const missing = stories.filter((s) => {
    const hit = cache.get(s.id)
    return !hit || Date.now() - hit.at > TTL
  })
  const chunks: Story[][] = []
  for (let i = 0; i < missing.length; i += 8) chunks.push(missing.slice(i, i + 8))
  await Promise.all(chunks.map((c) => writeBatch(c).catch((e) => console.warn('[digest] failed:', String(e).slice(0, 120)))))
  if (cache.size > 800) for (const k of [...cache.keys()].slice(0, 300)) cache.delete(k)

  const out: Record<string, Digest> = {}
  for (const s of stories) {
    const hit = cache.get(s.id)
    if (hit) out[s.id] = hit.digest
  }
  return out
}

/** Digests that are already written; never waits on the AI. */
export function peekDigests(stories: Story[]): Record<string, Digest> {
  const out: Record<string, Digest> = {}
  for (const s of stories) {
    const hit = cache.get(s.id)
    if (hit) out[s.id] = hit.digest
  }
  return out
}
