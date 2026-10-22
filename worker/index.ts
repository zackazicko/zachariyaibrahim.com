/* =============================================================================
   SITE WORKER
   Serves the built site from ./dist and handles /api/jev/match.
   No model key exists anywhere: Jev runs through the Workers AI binding.
   ============================================================================= */

import meditations from '../src/zackos/jevitations/meditations.json'
import { match, PROMPT_REVISION, PROMPT_STYLES, type Corpus, type MatchConfig, type MatchEvent, type PromptStyle } from './jev'

interface Env {
  ASSETS: Fetcher
  AI: Ai
  MATCH_LIMITER: RateLimit
  JEV_KV: KVNamespace
  JEV_MODEL?: string
  JEV_PROMPT?: string
  JEV_USE_GLOSS?: string
  JEV_BATCH_SIZE?: string
  JEV_DAILY_TOKENS?: string
  JEV_MOCK?: string
}

const CORPORA: Record<string, Corpus> = {
  'marcus-aurelius': meditations as Corpus,
}

const MIN_QUOTE = 3
const MAX_QUOTE = 400
const CACHE_TTL = 60 * 60 * 24 * 30
const CACHE_VERSION = 'v1'
// Rough input tokens per passage, measured on the point scale, used to check the budget up front
const TOKENS_PER_PASSAGE = 390

function json(status: number, body: unknown, headers: HeadersInit = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...headers },
  })
}

function fail(status: number, error: string, message: string, headers: HeadersInit = {}) {
  return json(status, { error, message }, headers)
}

function normalize(quote: string) {
  return quote.replace(/\s+/g, ' ').trim()
}

async function sha256(text: string) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('')
}

// Preview and local hosts accept per-request overrides so the eval script can compare prompt variants
function isTunable(request: Request) {
  const host = new URL(request.url).hostname
  return host.endsWith('.workers.dev') || host === 'localhost' || host === '127.0.0.1'
}

function config(env: Env, request: Request): MatchConfig {
  const tunable = isTunable(request)
  const prompt = (tunable && request.headers.get('x-jev-prompt')) || env.JEV_PROMPT
  const gloss = (tunable && request.headers.get('x-jev-gloss')) || env.JEV_USE_GLOSS
  return {
    jevModel: env.JEV_MODEL || 'typesafe/jev-1.14.0',
    prompt: PROMPT_STYLES.includes(prompt as PromptStyle) ? (prompt as PromptStyle) : 'point',
    useGloss: gloss !== 'false',
    batchSize: Number(env.JEV_BATCH_SIZE) || 60,
    mock: env.JEV_MOCK === '1',
  }
}

function ndjson(events: MatchEvent[]) {
  return events.map(e => JSON.stringify(e)).join('\n') + '\n'
}

const STREAM_HEADERS = {
  'content-type': 'application/x-ndjson; charset=utf-8',
  'cache-control': 'no-store',
  'x-content-type-options': 'nosniff',
}

async function handleMatch(request: Request, env: Env, ctx: ExecutionContext) {
  if (request.method !== 'POST') return fail(405, 'method', 'Use POST.', { allow: 'POST' })
  if (!(request.headers.get('content-type') || '').includes('application/json')) {
    return fail(415, 'content_type', 'Send JSON.')
  }

  let body: { quote?: unknown; persona?: unknown }
  try {
    body = await request.json()
  } catch {
    return fail(400, 'bad_json', 'The request body is not valid JSON.')
  }

  const persona = typeof body.persona === 'string' ? body.persona : 'marcus-aurelius'
  let corpus = CORPORA[persona]
  if (!corpus) return fail(400, 'persona', 'That persona is not available yet.')
  // Preview hosts can score a subset of passages, which keeps prompt comparisons cheap
  const subset = isTunable(request) ? request.headers.get('x-jev-ids') : null
  if (subset) {
    const ids = new Set(subset.split(','))
    corpus = { ...corpus, passages: corpus.passages.filter(p => ids.has(p.id)) }
  }

  const quote = typeof body.quote === 'string' ? normalize(body.quote) : ''
  if (quote.length < MIN_QUOTE) return fail(400, 'too_short', 'Type a few more words.')
  if (quote.length > MAX_QUOTE) return fail(400, 'too_long', `Keep it under ${MAX_QUOTE} characters.`)

  const cfg = config(env, request)
  const cacheKey = new Request(
    `https://jevitations.cache/${CACHE_VERSION}/${persona}/${cfg.jevModel}/${cfg.prompt}${PROMPT_REVISION}/${cfg.useGloss ? 'g' : 'n'}/${await sha256(quote.toLowerCase())}`,
  )
  const cache = caches.default
  const hit = subset ? undefined : await cache.match(cacheKey)
  if (hit) return new Response(hit.body, { headers: { ...STREAM_HEADERS, 'x-jev-cache': 'hit' } })

  const ip = request.headers.get('cf-connecting-ip') || 'unknown'
  const { success } = await env.MATCH_LIMITER.limit({ key: ip })
  if (!success) return fail(429, 'rate_limited', 'Marcus needs a moment. Try again in a minute.', { 'retry-after': '60' })

  // The daily budget is counted in model input tokens, the unit Workers AI bills in. The default
  // stays inside the free 10k neurons; wrangler.json sets 52M, about $2 a day on Clef-flash.
  const day = new Date().toISOString().slice(0, 10)
  const budgetKey = `tokens:${day}`
  const budget = Number(env.JEV_DAILY_TOKENS) || 2_800_000
  const estimate = corpus.passages.length * TOKENS_PER_PASSAGE
  const used = Number(await env.JEV_KV.get(budgetKey)) || 0
  if (used + estimate > budget) return fail(429, 'daily_cap', 'Marcus is resting until tomorrow.')
  const spend = (tokens: number) =>
    env.JEV_KV.put(budgetKey, String(used + tokens), { expirationTtl: 60 * 60 * 48 })

  const { readable, writable } = new TransformStream<Uint8Array, Uint8Array>()
  const writer = writable.getWriter()
  const encoder = new TextEncoder()
  const events: MatchEvent[] = []
  const emit = (e: MatchEvent) => {
    events.push(e)
    writer.write(encoder.encode(JSON.stringify(e) + '\n')).catch(() => {})
  }

  ctx.waitUntil(
    (async () => {
      try {
        const done = await match(env.AI, cfg, corpus, quote, emit)
        await spend(done.inputTokens || estimate)
        if (!subset && !done.partial && done.ranked.length) {
          const cached = new Response(ndjson(events), {
            headers: { ...STREAM_HEADERS, 'cache-control': `public, max-age=${CACHE_TTL}` },
          })
          await cache.put(cacheKey, cached)
        }
      } catch (err) {
        const error = (err instanceof Error ? err.message : String(err)).slice(0, 300)
        console.error(`jev match failed: ${error}`)
        await spend(estimate).catch(() => {})
        emit({ type: 'done', partial: true, inputTokens: 0, ranked: [], error })
      } finally {
        await writer.close().catch(() => {})
      }
    })(),
  )

  return new Response(readable, { headers: { ...STREAM_HEADERS, 'x-jev-cache': 'miss' } })
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url)
    if (url.pathname === '/api/jev/match') return handleMatch(request, env, ctx)
    if (url.pathname.startsWith('/api/')) return fail(404, 'not_found', 'No such endpoint.')
    return env.ASSETS.fetch(request)
  },
} satisfies ExportedHandler<Env>
