/* =============================================================================
   CALL DESIGN TUNING
   Preview-only endpoint that scores every passage of Long's translation for one quote
   under a named call design and returns the raw scores, so rankings can be compared
   against labelled quotes offline. Nothing here serves the app.
   ============================================================================= */

import long from './long.json'

interface LongPassage { id: string; sentences: string[]; principle: string }
const PASSAGES = (long as { passages: LongPassage[] }).passages.map(p => ({
  id: p.id,
  text: p.sentences.join(' '),
  gloss: p.principle,
}))
type Passage = (typeof PASSAGES)[number]

export interface TuneEnv {
  AI: Ai
  JEV_KV: KVNamespace
  JEV_DAILY_TOKENS?: string
}

interface Design {
  // what of each passage the question shows
  show: 'full' | 'full+gloss' | 'gloss'
  state: (quote: string) => string
  ask: string
  rubric: string[]
}

const PLAIN_STATE = (quote: string) =>
  `A person typed this quote: "${quote}"\n` +
  'Read it the way a fluent native speaker would, taking idioms, slang, sarcasm and metaphors figuratively, ' +
  'and work out the idea, advice or attitude it expresses. That idea is what each passage is compared against.'

// The production point scale, kept as the baseline
const POINT_RUBRIC = [
  'Unrelated: a different idea',
  'Shares only a topic, word or image with the quote, not its point',
  'Related: supports or overlaps with the point the quote makes',
  'Same point: says what the quote means, in its own terms',
]
const POINT_ASK = 'How closely does this passage express the idea behind the quote? Judge meaning, not shared words.'

// "situation": the quote and the passage meet on the same situation or attitude, and Marcus may
// agree with the quote or answer it. The best match makes that its main point.
const SITUATION_STATE = (quote: string) =>
  `Someone said: "${quote}"\n` +
  'First work out what they mean in plain words: the situation, attitude or advice behind it, ' +
  'reading slang, jokes and figures of speech the way a native speaker would. ' +
  'Then judge each Meditations passage by whether Marcus is talking about that same thing. ' +
  'He may agree with the person or answer them with his own view; either counts.'
const SITUATION_RUBRIC = [
  'About something else',
  'Shares a word, image or broad theme, but is about something else',
  'Touches the same thing in passing, among other points',
  "The same thing is the passage's main point",
]
const SITUATION_ASK = 'Is Marcus talking about the same thing the person means?'

export const DESIGNS: Record<string, Design> = {
  'point-full+gloss': { show: 'full+gloss', state: PLAIN_STATE, ask: POINT_ASK, rubric: POINT_RUBRIC },
  'point-full': { show: 'full', state: PLAIN_STATE, ask: POINT_ASK, rubric: POINT_RUBRIC },
  'point-gloss': { show: 'gloss', state: PLAIN_STATE, ask: POINT_ASK, rubric: POINT_RUBRIC },
  'situation-full+gloss': { show: 'full+gloss', state: SITUATION_STATE, ask: SITUATION_ASK, rubric: SITUATION_RUBRIC },
  'situation-full': { show: 'full', state: SITUATION_STATE, ask: SITUATION_ASK, rubric: SITUATION_RUBRIC },
  'situation-gloss': { show: 'gloss', state: SITUATION_STATE, ask: SITUATION_ASK, rubric: SITUATION_RUBRIC },
}

const MODEL = '@cf/cloudflare/clef-flash'
const MAX_BATCH = 60
const MAX_BATCH_CHARS = 36_000
// Tuning may use at most this much of the day's shared token budget, so the app keeps the rest
const TUNE_SHARE = 0.75

function describe(p: Passage, show: Design['show']) {
  if (show === 'gloss') return `Meditations ${p.id}, in plain English: ${p.gloss}`
  const text = `Meditations ${p.id} (George Long's 1862 translation): "${p.text}"`
  return show === 'full' ? text : `${text}\nIn plain English: ${p.gloss}`
}

function batches(passages: Passage[], d: Design) {
  const out: Passage[][] = []
  let cur: Passage[] = []
  let chars = 0
  for (const p of passages) {
    const cost = describe(p, d.show).length + 400
    if (cur.length && (cur.length >= MAX_BATCH || chars + cost > MAX_BATCH_CHARS)) {
      out.push(cur)
      cur = []
      chars = 0
    }
    cur.push(p)
    chars += cost
  }
  if (cur.length) out.push(cur)
  return out
}

const key = (id: string) => 'p_' + id.replace('.', '_')

async function runBatch(ai: Ai, d: Design, quote: string, batch: Passage[]) {
  const questions: Record<string, unknown> = {}
  for (const p of batch) {
    questions[key(p.id)] = { type: 'score', instructions: `${describe(p, d.show)}\n${d.ask}`, criteria: d.rubric }
  }
  const res = (await ai.run(MODEL as keyof AiModels, {
    model: 'clef-flash',
    state: d.state(quote),
    questions,
  } as never)) as { answers?: Record<string, { score?: number }>; usage?: { input_tokens?: number } }
  const scores: Record<string, number> = {}
  for (const p of batch) {
    const s = res?.answers?.[key(p.id)]?.score
    if (typeof s === 'number' && Number.isFinite(s)) scores[p.id] = Math.round((s / (d.rubric.length - 1)) * 1000) / 1000
  }
  if (!Object.keys(scores).length) throw new Error(`no answers: ${JSON.stringify(res).slice(0, 200)}`)
  return { scores, tokens: res?.usage?.input_tokens ?? 0 }
}

export async function handleTune(request: Request, env: TuneEnv) {
  const json = (status: number, body: unknown) =>
    new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })
  if (request.method !== 'POST') return json(405, { error: 'method' })
  let body: { quote?: unknown; design?: unknown; ids?: unknown }
  try {
    body = await request.json()
  } catch {
    return json(400, { error: 'bad_json' })
  }
  const quote = typeof body.quote === 'string' ? body.quote.replace(/\s+/g, ' ').trim().slice(0, 400) : ''
  const d = typeof body.design === 'string' ? DESIGNS[body.design] : undefined
  if (quote.length < 2 || !d) return json(400, { error: 'quote_or_design', designs: Object.keys(DESIGNS) })
  const only = Array.isArray(body.ids) ? new Set(body.ids.map(String)) : null
  const passages = only ? PASSAGES.filter(p => only.has(p.id)) : PASSAGES

  const day = new Date().toISOString().slice(0, 10)
  const budgetKey = `tokens:${day}`
  const budget = (Number(env.JEV_DAILY_TOKENS) || 2_800_000) * TUNE_SHARE
  const estimate = passages.reduce((n, p) => n + describe(p, d.show).length / 3 + 120, 0)
  const used = Number(await env.JEV_KV.get(budgetKey)) || 0
  if (used + estimate > budget) return json(429, { error: 'daily_cap', used })

  const scores: Record<string, number> = {}
  let tokens = 0
  const errors: string[] = []
  await Promise.all(
    batches(passages, d).map(async batch => {
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          const r = await runBatch(env.AI, d, quote, batch)
          Object.assign(scores, r.scores)
          tokens += r.tokens
          return
        } catch (err) {
          if (attempt === 2) errors.push((err instanceof Error ? err.message : String(err)).slice(0, 200))
        }
      }
    }),
  )
  await env.JEV_KV.put(budgetKey, String(used + (tokens || estimate)), { expirationTtl: 60 * 60 * 48 })
  return json(200, { scores, tokens, errors })
}
