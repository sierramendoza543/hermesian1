import Anthropic from '@anthropic-ai/sdk'

// One entry point for structured AI output. Tries providers in order and
// falls through on any failure (missing key, quota, bad JSON), so the app
// keeps working as long as one provider is healthy.

export type Provider = 'claude' | 'gemini' | 'groq'

export interface GenerateOptions {
  system: string
  prompt: string
  maxTokens?: number
  temperature?: number
  /** Return the parsed value if valid, or throw to trigger the next provider. */
  validate?: (value: any) => void
  order?: Provider[]
  /** Overall time limit across all attempts (default 45s). */
  timeoutMs?: number
  /** Prefer the quickest model — for short, simple jobs. */
  fast?: boolean
}

const CLAUDE_MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-5-5'
// Google retires Gemini models quickly, so try a short list in order.
const GEMINI_MODELS = process.env.GEMINI_MODEL
  ? [process.env.GEMINI_MODEL]
  : ['gemini-3.5-flash', 'gemini-3.1-flash-lite', 'gemini-3.8-flash']
const GEMINI_FAST = process.env.GEMINI_MODEL ? [process.env.GEMINI_MODEL] : ['gemini-3.1-flash-lite', 'gemini-3.5-flash']
// Groq retires models too; these are the ones the key can use today. gpt-oss-120b is strongest, 20b is the quick fallback.
const GROQ_MODELS = process.env.GROQ_MODEL ? [process.env.GROQ_MODEL] : ['openai/gpt-oss-120b', 'openai/gpt-oss-20b']

const TIMEOUT_MS = 45_000
const cooldown = new Map<Provider, number>()

// Free-tier Gemini keys have tight per-minute limits: never run more than two requests at once
let geminiInFlight = 0
const geminiQueue: (() => void)[] = []
async function geminiSlot<T>(fn: () => Promise<T>): Promise<T> {
  if (geminiInFlight >= 2) await new Promise<void>((r) => geminiQueue.push(r))
  geminiInFlight++
  try {
    return await fn()
  } finally {
    geminiInFlight--
    geminiQueue.shift()?.()
  }
}
const modelCooldown = new Map<string, number>()

export function availableProviders(): Provider[] {
  const list: Provider[] = []
  if (process.env.ANTHROPIC_API_KEY) list.push('claude')
  if (process.env.GOOGLE_API_KEY) list.push('gemini')
  if (process.env.GROQ_API_KEY) list.push('groq')
  return list
}

export function extractJson(text: string): any {
  const trimmed = text.trim()
  try {
    return JSON.parse(trimmed)
  } catch {}
  const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i)
  if (fence) {
    try {
      return JSON.parse(fence[1].trim())
    } catch {}
  }
  const start = trimmed.search(/[\[{]/)
  if (start === -1) throw new Error('No JSON found in model output')
  const open = trimmed[start]
  const close = open === '{' ? '}' : ']'
  let depth = 0
  let inString = false
  let escaped = false
  for (let i = start; i < trimmed.length; i++) {
    const ch = trimmed[i]
    if (inString) {
      if (escaped) escaped = false
      else if (ch === '\\') escaped = true
      else if (ch === '"') inString = false
      continue
    }
    if (ch === '"') inString = true
    else if (ch === open) depth++
    else if (ch === close) {
      depth--
      if (depth === 0) return JSON.parse(trimmed.slice(start, i + 1))
    }
  }
  throw new Error('Unterminated JSON in model output')
}

async function callClaude(o: GenerateOptions, deadline: number): Promise<string> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY!, timeout: Math.floor(Math.max(3000, deadline - Date.now())), maxRetries: 0 })
  const res = await client.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: o.maxTokens ?? 4096,
    temperature: o.temperature ?? 0.2,
    system: `${o.system}\n\nRespond with a single valid JSON value and nothing else — no markdown fences, no commentary.`,
    messages: [{ role: 'user', content: o.prompt }],
  })
  const block = res.content.find((b): b is Anthropic.TextBlock => b.type === 'text')
  if (!block?.text) throw new Error('Empty Claude response')
  return block.text
}

async function callGemini(o: GenerateOptions, deadline: number): Promise<string> {
  let lastError = 'no model tried'
  const models = o.fast ? GEMINI_FAST : GEMINI_MODELS
  // Every model cooling down (e.g. Google is briefly overloaded)? Wait for the first to come back rather than give up.
  if (models.every((m) => (modelCooldown.get(m) ?? 0) > Date.now())) {
    const wait = Math.min(...models.map((m) => modelCooldown.get(m) ?? 0)) - Date.now()
    if (wait < deadline - Date.now() - 4000) await new Promise((r) => setTimeout(r, wait + 50))
  }
  for (let mi = 0; mi < models.length; mi++) {
    const model = models[mi]
    if ((modelCooldown.get(model) ?? 0) > Date.now()) continue // out of quota / overloaded a moment ago
    const remaining = deadline - Date.now()
    if (remaining < 1500) break
    // leave room for the next model if this one stalls
    const slice = Math.floor(mi < models.length - 1 ? Math.max(4000, remaining * 0.6) : remaining)
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': process.env.GOOGLE_API_KEY! },
      signal: AbortSignal.timeout(slice),
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: o.system }] },
        contents: [{ role: 'user', parts: [{ text: o.prompt }] }],
        generationConfig: {
          temperature: o.temperature ?? 0.2,
          maxOutputTokens: o.maxTokens ?? 4096,
          responseMimeType: 'application/json',
          thinkingConfig: { thinkingBudget: 0 },
        },
      }),
    }).catch((e) => ({ ok: false, status: 0, text: async () => String(e), json: async () => ({}) }) as unknown as Response)
    if (!res.ok) {
      const body = await res.text().catch(() => '')
      lastError = `Gemini ${model} ${res.status}: ${body.slice(0, 160)}`
      // Per-minute limits clear fast; a daily quota doesn't
      if (res.status === 429) modelCooldown.set(model, Date.now() + (/PerDay/i.test(body) ? 20 * 60_000 : 25_000))
      else if (res.status === 503 || res.status === 404) modelCooldown.set(model, Date.now() + 15_000)
      continue
    }
    const data = await res.json()
    const text = (data?.candidates?.[0]?.content?.parts || []).map((p: any) => p?.text || '').join('')
    if (text.trim()) return text
    lastError = `Empty Gemini response from ${model} (${data?.candidates?.[0]?.finishReason || 'unknown'})`
  }
  throw new Error(lastError)
}

async function callGroq(o: GenerateOptions, deadline: number): Promise<string> {
  let lastError = 'no model tried'
  for (const model of GROQ_MODELS) {
    if ((modelCooldown.get(model) ?? 0) > Date.now()) continue
    const remaining = deadline - Date.now()
    if (remaining < 1500) break
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.GROQ_API_KEY}`, 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(Math.floor(remaining)),
      body: JSON.stringify({
        model,
        temperature: o.temperature ?? 0.2,
        max_tokens: Math.min((o.maxTokens ?? 4096) + 1500, 8000), // gpt-oss spends some tokens thinking first
        ...(model.startsWith('openai/gpt-oss') ? { reasoning_effort: 'low' } : {}),
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: `${o.system}\n\nReturn a single JSON object.` },
          { role: 'user', content: o.prompt },
        ],
      }),
    }).catch((e) => ({ ok: false, status: 0, text: async () => String(e), json: async () => ({}) }) as unknown as Response)
    if (!res.ok) {
      const body = await res.text().catch(() => '')
      lastError = `Groq ${model} ${res.status}: ${body.slice(0, 160)}`
      if (res.status === 401) throw new Error(lastError) // bad key: let the provider-level cooldown handle it
      modelCooldown.set(model, Date.now() + (res.status === 429 ? 20_000 : 60_000))
      continue
    }
    const data = await res.json()
    const text = data?.choices?.[0]?.message?.content
    if (text) return text
    lastError = `Empty Groq response from ${model}`
  }
  throw new Error(lastError)
}

const CALLERS: Record<Provider, (o: GenerateOptions, deadline: number) => Promise<string>> = {
  claude: callClaude,
  gemini: (o, d) => geminiSlot(() => callGemini(o, d)),
  groq: callGroq,
}

export async function generateJSON<T = any>(options: GenerateOptions): Promise<{ data: T; provider: Provider }> {
  // Dev-only: feed a canned response through the real validation pipeline.
  if (process.env.NODE_ENV !== 'production' && process.env.LLM_MOCK_FILE) {
    const mock = JSON.parse((await import('node:fs')).readFileSync(process.env.LLM_MOCK_FILE, 'utf8'))
    options.validate?.(mock)
    return { data: mock as T, provider: 'claude' }
  }
  const deadline = Date.now() + (options.timeoutMs ?? TIMEOUT_MS)
  const have = new Set(availableProviders())
  const wanted = (options.order || ['groq', 'gemini', 'claude']).filter((p) => have.has(p))
  let order = wanted.filter((p) => (cooldown.get(p) ?? 0) < Date.now())
  if (order.length === 0 && wanted.length > 0) {
    // Everything is cooling down; if the soonest one is back shortly, wait for it instead of failing
    const soonest = Math.min(...wanted.map((p) => cooldown.get(p) ?? 0))
    if (soonest - Date.now() < deadline - Date.now() - 3000) {
      await new Promise((r) => setTimeout(r, Math.max(0, soonest - Date.now()) + 50))
      order = wanted.filter((p) => (cooldown.get(p) ?? 0) < Date.now())
    }
  }
  if (order.length === 0) {
    throw new Error('No AI provider is available right now.')
  }
  const errors: string[] = []
  for (const provider of order) {
    if (Date.now() > deadline - 1000) break
    try {
      const text = await CALLERS[provider](options, deadline)
      const data = extractJson(text)
      options.validate?.(data)
      return { data: data as T, provider }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      errors.push(`${provider}: ${msg}`)
      // Don't keep waiting on a provider that is down: skip it for a while
      cooldown.set(provider, Date.now() + (/\b(401|403)\b|credit|invalid.*key/i.test(msg) ? 30 * 60_000 : 6_000))
      console.warn(`[llm] ${provider} failed — ${msg.slice(0, 160)}`)
    }
  }
  throw new Error(`All AI providers failed. ${errors.join(' | ')}`)
}
