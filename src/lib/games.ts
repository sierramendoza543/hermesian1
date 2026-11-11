import { generateJSON } from '@/lib/llm'
import { getAllStories, StoryArticle } from '@/lib/stories'
import { storyTerms } from '@/lib/wordgames'

// News Quiz content for one story. Questions are easy and recall-level.
// AI writes comprehension questions; a few more are built from real data
// (which outlet ran a headline, which word the headlines use most) so the quiz
// still works if AI is unavailable.

export interface GameItem {
  id: string
  prompt: string
  body?: string
  options: string[]
  answer: number
  explanation: string
  reveal?: string
  highlights?: string[]
  origin: 'ai' | 'data'
}

export interface GameStoryInput {
  id: string
  headline: string
  category: string
  articles: Pick<StoryArticle, 'title' | 'source' | 'outlet' | 'lean' | 'domain'>[]
}

export interface QuizSet {
  items: GameItem[]
  aiUsed: boolean
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

const name = (a: GameStoryInput['articles'][number]) => a.outlet || a.source
let uid = 0
const nid = (p: string) => `${p}${++uid}`

function withOptions(correct: string, distractors: string[]): { options: string[]; answer: number } {
  const options = shuffle([correct, ...distractors.filter((d) => d !== correct)].slice(0, 4))
  return { options, answer: options.indexOf(correct) }
}

async function dataQuiz(story: GameStoryInput): Promise<GameItem[]> {
  const items: GameItem[] = []
  const arts = shuffle(story.articles)

  for (const target of arts.slice(0, 2)) {
    const others = shuffle(story.articles.filter((a) => name(a) !== name(target))).slice(0, 3).map(name)
    if (others.length < 2) continue
    const { options, answer } = withOptions(name(target), others)
    items.push({
      id: nid('dq'),
      prompt: 'Which outlet ran this headline?',
      body: target.title,
      options,
      answer,
      explanation: `It ran in ${name(target)}.`,
      origin: 'data',
    })
  }

  try {
    const all = await getAllStories()
    const mine = storyTerms(story)[0]
    if (mine) {
      const distractors = shuffle(
        all
          .filter((s) => s.id !== story.id)
          .flatMap((s) => storyTerms(s).slice(0, 1))
          .map((t) => t.word)
          .filter((w) => w !== mine.word)
      ).slice(0, 3)
      if (distractors.length >= 2) {
        const up = (w: string) => w.charAt(0).toUpperCase() + w.slice(1)
        const { options, answer } = withOptions(up(mine.word), distractors.map(up))
        items.push({
          id: nid('dq'),
          prompt: 'Which word do the headlines for this story use the most?',
          options,
          answer,
          explanation: `“${up(mine.word)}” appears in ${mine.df} different headlines.`,
          origin: 'data',
        })
      }
    }
  } catch {}

  const n = story.articles.length
  const counts = [...new Set([n, Math.max(2, n - 2), n + 2, n + 4])]
  const { options, answer } = withOptions(String(n), counts.map(String))
  items.push({
    id: nid('dq'),
    prompt: 'How many outlets covered this story?',
    options,
    answer,
    explanation: `${n} outlets in our feed covered it.`,
    origin: 'data',
  })
  return items
}

async function aiQuiz(story: GameStoryInput): Promise<GameItem[]> {
  const lines = story.articles.slice(0, 14).map((a) => `- [${name(a)}] ${a.title}`).join('\n')
  const { data } = await generateJSON<any>({
    system: 'You write short, easy, friendly news quiz questions grounded strictly in the headlines provided. No outside facts.',
    prompt: `Headlines from different outlets about ONE news story:

${lines}

Write exactly 5 EASY multiple-choice questions anyone could answer after skimming these headlines (who, what, where, what happened next). Keep each question under 15 words and each option under 8 words. Make wrong options clearly wrong but plausible.

Return JSON: { "quiz": [ { "prompt": string, "options": [3 or 4 strings], "answer": index of the right option, "explanation": "one short sentence" } ] }`,
    maxTokens: 1800,
    temperature: 0.4,
    fast: true,
    timeoutMs: 15000,
    validate: (d) => {
      if (!Array.isArray(d?.quiz)) throw new Error('Quiz JSON missing')
    },
  })
  return (data.quiz as any[])
    .filter((q) => q?.prompt && Array.isArray(q.options) && q.options.length >= 2 && Number.isInteger(q.answer) && q.answer >= 0 && q.answer < q.options.length)
    .slice(0, 5)
    .map((q) => ({
      id: nid('aq'),
      prompt: String(q.prompt).slice(0, 200),
      options: q.options.slice(0, 4).map((o: any) => String(o).slice(0, 120)),
      answer: q.answer,
      explanation: String(q.explanation || '').slice(0, 240),
      origin: 'ai' as const,
    }))
}

const cache = new Map<string, { at: number; set: QuizSet }>()
const TTL = 6 * 60 * 60 * 1000

export async function getQuiz(story: GameStoryInput): Promise<QuizSet> {
  const hit = cache.get(story.id)
  if (hit && Date.now() - hit.at < TTL) return hit.set

  let ai: GameItem[] = []
  try {
    ai = await aiQuiz(story)
  } catch (err) {
    console.warn('[quiz] AI unavailable, using data-driven questions:', err instanceof Error ? err.message.slice(0, 140) : err)
  }
  const data = await dataQuiz(story)
  const items = ai.length >= 3 ? [...ai.slice(0, 5), ...data.slice(0, 1)] : data
  const set: QuizSet = { items, aiUsed: ai.length >= 3 }
  if (set.aiUsed) {
    cache.set(story.id, { at: Date.now(), set })
    if (cache.size > 100) cache.delete(cache.keys().next().value as string)
  }
  return set
}
