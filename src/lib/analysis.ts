import { generateJSON } from '@/lib/llm'
import { findTerms, KIND_LABEL, TermKind } from '@/lib/lexicon'

// ---------- Types shared with the UI (import type only on the client) ----------

export interface TextStats {
  words: number
  sentences: number
  avgSentenceWords: number
  readingEase: number
  gradeLevel: number
  quotes: number
  quotedWordShare: number
  attributions: number
  anonymousSources: number
  numbers: number
  hedges: number
  intensifiers: number
  exclamations: number
  allCapsWords: number
  firstPersonPer1000: number
  loadedTerms: { charged: number; leftCoded: number; rightCoded: number }
  loadedPer1000: number
  topTerms: { term: string; kind: TermKind; count: number }[]
  lexiconLean: number | null
}

export type EvidenceDirection = 'left' | 'right' | 'neutral'

export interface BiasEvidence {
  quote: string
  direction: EvidenceDirection
  technique: string
  explanation: string
  severity: number
  start: number
  end: number
}

export interface LoadedPhrase {
  phrase: string
  direction: EvidenceDirection
  neutralAlternative: string
  why: string
  start: number
  end: number
}

export interface FallacyItem {
  quote: string
  name: string
  explanation: string
  start: number
  end: number
}

export interface ClaimItem {
  quote: string
  type: string
  support: 'cited' | 'partially cited' | 'uncited'
  checkability: 'easy' | 'moderate' | 'hard'
  howToVerify: string
  start: number
  end: number
}

export interface AIAnalysis {
  summary: string
  leanScore: number
  leanConfidence: number
  leanReasoning: string
  scores: {
    tone: number
    subjectivity: number
    sensationalism: number
    evidenceQuality: number
    balance: number
  }
  biasEvidence: BiasEvidence[]
  loadedLanguage: LoadedPhrase[]
  fallacies: FallacyItem[]
  claims: ClaimItem[]
  sources: {
    named: { name: string; role: string; perspective: string }[]
    missingPerspectives: string[]
  }
  framing: {
    frame: string
    emphasized: string[]
    downplayed: string[]
    oppositeFraming: string
  }
  entities: { people: string[]; organizations: string[]; places: string[] }
}

export type HighlightKind = 'evidence' | 'loaded' | 'fallacy' | 'claim' | TermKind

export interface Highlight {
  start: number
  end: number
  kind: HighlightKind
  label: string
}

export interface AnalysisResult {
  mode: 'ai' | 'data-only'
  provider: string | null
  aiError: string | null
  article: {
    title: string
    url: string
    source: string
    domain: string
    text: string
    totalWords: number
    truncated: boolean
  }
  outlet: { name: string; lean: number; label: string; reliability: string } | null
  stats: TextStats
  analysis: AIAnalysis | null
  highlights: Highlight[]
  verification: { requested: number; verified: number }
  generatedAt: string
}

// ---------- Deterministic text statistics ----------

function syllables(word: string): number {
  const w = word.toLowerCase().replace(/[^a-z]/g, '')
  if (!w) return 0
  if (w.length <= 3) return 1
  const groups = w.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '').replace(/^y/, '').match(/[aeiouy]{1,2}/g)
  return Math.max(1, groups ? groups.length : 1)
}

const count = (text: string, re: RegExp) => (text.match(re) || []).length

export function computeTextStats(text: string): TextStats {
  const wordList = text.split(/\s+/).filter(Boolean)
  const words = wordList.length || 1
  const sentenceList = text.split(/(?<=[.!?])["”’']?\s+(?=["“‘']?[A-Z0-9])/).filter((s) => s.trim().length > 0)
  const sentences = sentenceList.length || 1
  const syll = wordList.reduce((s, w) => s + syllables(w), 0)
  const readingEase = Math.round((206.835 - 1.015 * (words / sentences) - 84.6 * (syll / words)) * 10) / 10
  const gradeLevel = Math.round((0.39 * (words / sentences) + 11.8 * (syll / words) - 15.59) * 10) / 10

  const quoteMatches = [...text.matchAll(/[“"]([^”"]{15,400})[”"]/g)]
  const quotedWords = quoteMatches.reduce((s, m) => s + m[1].split(/\s+/).length, 0)

  const hits = findTerms(text)
  const charged = hits.filter((h) => h.kind === 'charged').length
  const leftCoded = hits.filter((h) => h.kind === 'left-coded').length
  const rightCoded = hits.filter((h) => h.kind === 'right-coded').length

  const tally = new Map<string, { term: string; kind: TermKind; count: number }>()
  for (const h of hits) {
    const key = `${h.kind}:${h.term}`
    const cur = tally.get(key)
    if (cur) cur.count++
    else tally.set(key, { term: h.term, kind: h.kind, count: 1 })
  }

  const partisan = leftCoded + rightCoded
  const per1000 = (n: number) => Math.round((n / words) * 10000) / 10

  return {
    words,
    sentences,
    avgSentenceWords: Math.round((words / sentences) * 10) / 10,
    readingEase,
    gradeLevel,
    quotes: quoteMatches.length,
    quotedWordShare: Math.round((quotedWords / words) * 1000) / 10,
    attributions: count(text, /\b(said|says|according to|told|stated|announced|argued|claimed|noted|added|wrote|tweeted|explained|confirmed|denied)\b/gi),
    anonymousSources: count(text, /\b(sources? (?:familiar|close|said)|people familiar|on (?:the )?condition of anonymity|speaking anonymously|anonymous(?:ly)?|unnamed|declined to be named)\b/gi),
    numbers: count(text, /\b\d[\d,.]*\s?(?:%|percent|million|billion|trillion|thousand)?\b/gi),
    hedges: count(text, /\b(allegedly|reportedly|apparently|possibly|perhaps|appears? to|seems? to|suggests?|likely|unclear|may|might|could)\b/gi),
    intensifiers: count(text, /\b(very|extremely|incredibly|massive|huge|totally|absolutely|completely|utterly|literally|clearly|obviously|undoubtedly|devastating)\b/gi),
    exclamations: count(text, /!/g),
    allCapsWords: count(text, /\b[A-Z]{4,}\b/g),
    firstPersonPer1000: per1000(count(text, /\b(i|we|my|our|us|me)\b/gi)),
    loadedTerms: { charged, leftCoded, rightCoded },
    loadedPer1000: per1000(hits.length),
    topTerms: [...tally.values()].sort((a, b) => b.count - a.count).slice(0, 8),
    lexiconLean: partisan >= 3 ? Math.round(((rightCoded - leftCoded) / partisan) * 60) : null,
  }
}

// ---------- Quote verification ----------
// The model must quote the article verbatim. We locate every quote in the real
// text and drop anything that cannot be found, so no evidence is invented.

interface NormIndex {
  norm: string
  map: number[]
}

function buildIndex(text: string): NormIndex {
  let norm = ''
  const map: number[] = []
  for (let i = 0; i < text.length; i++) {
    const ch = text[i].toLowerCase()
    if (/[a-z0-9]/.test(ch)) {
      norm += ch
      map.push(i)
    }
  }
  return { norm, map }
}

function normalize(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, '')
}

function locate(index: NormIndex, quote: string): { start: number; end: number } | null {
  const tryFind = (q: string) => {
    const n = normalize(q)
    if (n.length < 12) return null
    const at = index.norm.indexOf(n)
    if (at === -1) return null
    return { start: index.map[at], end: index.map[at + n.length - 1] + 1 }
  }
  const exact = tryFind(quote)
  if (exact) return exact
  // Allow elided quotes: use the longest verbatim segment
  const segments = quote.split(/\.\.\.|…|\[[^\]]*\]/).map((s) => s.trim()).filter(Boolean)
  segments.sort((a, b) => normalize(b).length - normalize(a).length)
  for (const seg of segments) {
    const hit = tryFind(seg)
    if (hit && normalize(seg).length >= 20) return hit
  }
  return null
}

// ---------- Model call ----------

const SYSTEM = `You are a rigorous media-bias analyst for a high-school civics classroom. You examine ONE article and report what the TEXT itself shows.

Evidence discipline (critical):
- Every "quote" or "phrase" you output MUST be copied character-for-character from the article text provided: 6-40 words for quotes, 1-6 words for phrases. No paraphrasing, no ellipses, no stitching sentences together. If you cannot find a verbatim quote for a point, omit that point.
- Judge the writing, not the outlet's reputation, and do not guess the outlet.
- Be calibrated: ordinary straight news usually scores |leanScore| under 30 and low sensationalism. Do not manufacture bias. If the text is largely neutral, say so and return fewer items.
- Neutral, precise explanations a student can verify against the quote.`

function schemaPrompt(title: string, source: string, text: string): string {
  return `Article title: ${title || '(unknown)'}
Publisher: ${source || '(unknown)'}

--- ARTICLE TEXT START ---
${text}
--- ARTICLE TEXT END ---

Return JSON with exactly this shape:
{
  "summary": "2-3 neutral sentences",
  "leanScore": number from -100 (strongly left-leaning framing) to 100 (strongly right-leaning framing), 0 = neutral,
  "leanConfidence": number 0-100,
  "leanReasoning": "2-3 sentences citing the specific textual signals behind the lean score",
  "scores": {
    "tone": number -100 (hostile/negative) to 100 (warm/positive), 0 neutral,
    "subjectivity": number 0-100 (0 = purely factual reporting, 100 = pure opinion),
    "sensationalism": number 0-100,
    "evidenceQuality": number 0-100 (named sources, data, documents, attribution),
    "balance": number 0-100 (how fairly competing viewpoints are represented)
  },
  "biasEvidence": [ up to 6 of {
    "quote": "VERBATIM 6-40 word excerpt",
    "direction": "left" | "right" | "neutral",   // which side the framing favors; neutral = loaded but not partisan
    "technique": "loaded language" | "framing" | "omission" | "source selection" | "emotional appeal" | "false balance" | "selective emphasis" | "unsupported assertion" | "other",
    "explanation": "1-2 sentences on why this signals bias",
    "severity": integer 1-5
  } ],
  "loadedLanguage": [ up to 7 of {
    "phrase": "VERBATIM 1-6 words",
    "direction": "left" | "right" | "neutral",
    "neutralAlternative": "a more neutral wording",
    "why": "short reason"
  } ],
  "fallacies": [ up to 3 of { "quote": "VERBATIM excerpt", "name": "fallacy name", "explanation": "1-2 sentences" } ],
  "claims": [ up to 5 of {
    "quote": "VERBATIM excerpt containing a checkable claim",
    "type": "statistic" | "attribution" | "causal" | "prediction" | "opinion presented as fact" | "factual",
    "support": "cited" | "partially cited" | "uncited",
    "checkability": "easy" | "moderate" | "hard",
    "howToVerify": "concrete way to verify (what to search, which record/source to check)"
  } ],
  "sources": {
    "named": [ { "name": "person/organization quoted", "role": "their role", "perspective": "official" | "expert" | "left" | "right" | "neutral" | "affected party" } ],
    "missingPerspectives": [ "viewpoints a fair article would likely include but this one does not" ]
  },
  "framing": {
    "frame": "the central frame the article uses, in one sentence",
    "emphasized": [ "what it foregrounds" ],
    "downplayed": [ "what it minimizes or omits" ],
    "oppositeFraming": "2 sentences showing how someone on the other side might frame the same facts"
  },
  "entities": { "people": [ ], "organizations": [ ], "places": [ ] }
}
If a list has no valid items, return an empty list.`
}

const num = (v: unknown, lo: number, hi: number, fallback = 0) => {
  const n = typeof v === 'number' ? v : parseFloat(String(v))
  return Number.isFinite(n) ? Math.max(lo, Math.min(hi, Math.round(n))) : fallback
}
const str = (v: unknown, max = 600) => (typeof v === 'string' ? v.trim().slice(0, max) : '')
const strList = (v: unknown, max = 8) =>
  Array.isArray(v) ? v.map((x) => str(x, 200)).filter(Boolean).slice(0, max) : []
const dir = (v: unknown): EvidenceDirection => (v === 'left' || v === 'right' ? v : 'neutral')
const list = (v: unknown) => (Array.isArray(v) ? v : [])

export const MAX_ANALYZED_CHARS = 9_000

export async function runAnalysis(input: { title: string; source: string; text: string }) {
  const text = input.text.slice(0, MAX_ANALYZED_CHARS)
  const index = buildIndex(text)

  const { data: raw, provider } = await generateJSON<any>({
    system: SYSTEM,
    prompt: schemaPrompt(input.title, input.source, text),
    maxTokens: 3600,
    temperature: 0.15,
    timeoutMs: 50000,
    validate: (d) => {
      if (!d || typeof d !== 'object' || typeof d.leanScore === 'undefined' || !d.scores) {
        throw new Error('Analysis JSON missing required fields')
      }
    },
  })

  let requested = 0
  let verified = 0
  const check = (quote: unknown) => {
    const q = str(quote, 500)
    if (!q) return null
    requested++
    const hit = locate(index, q)
    if (hit) verified++
    return hit && { q: text.slice(hit.start, hit.end), ...hit }
  }

  const biasEvidence: BiasEvidence[] = []
  for (const e of list(raw.biasEvidence).slice(0, 10)) {
    const hit = check(e?.quote)
    if (!hit) continue
    biasEvidence.push({
      quote: hit.q,
      direction: dir(e.direction),
      technique: str(e.technique, 60) || 'other',
      explanation: str(e.explanation),
      severity: num(e.severity, 1, 5, 2),
      start: hit.start,
      end: hit.end,
    })
  }

  const loadedLanguage: LoadedPhrase[] = []
  for (const e of list(raw.loadedLanguage).slice(0, 12)) {
    const hit = check(e?.phrase)
    // single words are shorter than the 12-char quote floor, so locate them directly
    const phrase = str(e?.phrase, 80)
    let found = hit
    if (!found && phrase) {
      const at = text.toLowerCase().indexOf(phrase.toLowerCase())
      if (at !== -1) {
        verified++
        found = { q: text.slice(at, at + phrase.length), start: at, end: at + phrase.length }
      }
    }
    if (!found) continue
    loadedLanguage.push({
      phrase: found.q,
      direction: dir(e.direction),
      neutralAlternative: str(e.neutralAlternative, 120),
      why: str(e.why),
      start: found.start,
      end: found.end,
    })
  }

  const fallacies: FallacyItem[] = []
  for (const e of list(raw.fallacies).slice(0, 6)) {
    const hit = check(e?.quote)
    if (!hit) continue
    fallacies.push({ quote: hit.q, name: str(e.name, 60), explanation: str(e.explanation), start: hit.start, end: hit.end })
  }

  const claims: ClaimItem[] = []
  for (const e of list(raw.claims).slice(0, 10)) {
    const hit = check(e?.quote)
    if (!hit) continue
    claims.push({
      quote: hit.q,
      type: str(e.type, 60) || 'factual',
      support: e.support === 'cited' || e.support === 'partially cited' ? e.support : 'uncited',
      checkability: e.checkability === 'easy' || e.checkability === 'hard' ? e.checkability : 'moderate',
      howToVerify: str(e.howToVerify),
      start: hit.start,
      end: hit.end,
    })
  }

  const analysis: AIAnalysis = {
    summary: str(raw.summary, 900),
    leanScore: num(raw.leanScore, -100, 100),
    leanConfidence: num(raw.leanConfidence, 0, 100, 50),
    leanReasoning: str(raw.leanReasoning, 900),
    scores: {
      tone: num(raw.scores?.tone, -100, 100),
      subjectivity: num(raw.scores?.subjectivity, 0, 100),
      sensationalism: num(raw.scores?.sensationalism, 0, 100),
      evidenceQuality: num(raw.scores?.evidenceQuality, 0, 100),
      balance: num(raw.scores?.balance, 0, 100),
    },
    biasEvidence,
    loadedLanguage,
    fallacies,
    claims,
    sources: {
      named: list(raw.sources?.named)
        .slice(0, 10)
        .map((s: any) => ({ name: str(s?.name, 100), role: str(s?.role, 120), perspective: str(s?.perspective, 40) }))
        .filter((s: { name: string }) => s.name),
      missingPerspectives: strList(raw.sources?.missingPerspectives, 5),
    },
    framing: {
      frame: str(raw.framing?.frame),
      emphasized: strList(raw.framing?.emphasized, 5),
      downplayed: strList(raw.framing?.downplayed, 5),
      oppositeFraming: str(raw.framing?.oppositeFraming, 700),
    },
    entities: {
      people: strList(raw.entities?.people, 10),
      organizations: strList(raw.entities?.organizations, 10),
      places: strList(raw.entities?.places, 10),
    },
  }

  return { analysis, provider, verification: { requested, verified }, text }
}

// ---------- Highlights ----------
// Two layers so a loaded word can sit inside a longer evidence quote:
//   spans: evidence / fallacy / claim   marks: loaded phrases + lexicon terms
// Within a layer ranges never overlap (higher priority wins).

export const SPAN_KINDS: HighlightKind[] = ['evidence', 'fallacy', 'claim']

function resolveLayer(candidates: (Highlight & { priority: number })[]): Highlight[] {
  candidates.sort((a, b) => a.priority - b.priority || a.start - b.start)
  const accepted: Highlight[] = []
  for (const c of candidates) {
    if (accepted.some((a) => c.start < a.end && c.end > a.start)) continue
    accepted.push({ start: c.start, end: c.end, kind: c.kind, label: c.label })
  }
  return accepted
}

export function buildHighlights(text: string, analysis: AIAnalysis | null): Highlight[] {
  const spans: (Highlight & { priority: number })[] = []
  const marks: (Highlight & { priority: number })[] = []
  if (analysis) {
    for (const e of analysis.biasEvidence)
      spans.push({ start: e.start, end: e.end, kind: 'evidence', label: `${e.technique} (${e.direction})`, priority: 1 })
    for (const f of analysis.fallacies)
      spans.push({ start: f.start, end: f.end, kind: 'fallacy', label: f.name, priority: 0 })
    for (const c of analysis.claims)
      spans.push({ start: c.start, end: c.end, kind: 'claim', label: `claim: ${c.type}`, priority: 2 })
    for (const l of analysis.loadedLanguage)
      marks.push({ start: l.start, end: l.end, kind: 'loaded', label: `loaded → “${l.neutralAlternative}”`, priority: 0 })
  }
  for (const h of findTerms(text))
    marks.push({ start: h.start, end: h.end, kind: h.kind, label: KIND_LABEL[h.kind], priority: 1 })

  return [...resolveLayer(spans), ...resolveLayer(marks)].sort((a, b) => a.start - b.start || b.end - a.end)
}
