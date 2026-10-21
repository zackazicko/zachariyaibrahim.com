/* =============================================================================
   JEVITATIONS MATCHING
   One decision model (Jev, or its drop-in peer Clef) is the only model called
   per search. It reads the quote as state and answers one yes/no question per
   passage: does this passage share the quote's core idea? The plain-English
   glosses are written ahead of time.
   ============================================================================= */

export interface Passage {
  id: string
  book: number
  section: string
  text: string
  principle: string
}

export interface Corpus {
  persona: string
  source: string
  passages: Passage[]
}

export interface MatchConfig {
  jevModel: string
  useGloss: boolean
  batchSize: number
  mock: boolean
}

export type MatchEvent =
  | { type: 'start'; batches: number; passages: number }
  | { type: 'batch'; index: number; ok: boolean; scores: Record<string, number>; error?: string }
  | { type: 'done'; partial: boolean; inputTokens: number; ranked: { id: string; score: number }[]; error?: string }

// Jev and its drop-in peers take at most 64 questions per request, so batches stay under that.
export const MAX_BATCH = 60
// Jev's context window is 32k tokens per request and Clef-flash's is 24k. Archaic English runs
// about 3 characters a token, so batches are packed by text length well under both.
export const MAX_BATCH_CHARS = 36_000

export function makeBatches(passages: Passage[], size: number): Passage[][] {
  const n = Math.max(1, Math.min(size, MAX_BATCH))
  const batches: Passage[][] = []
  let current: Passage[] = []
  let chars = 0
  for (const p of passages) {
    const cost = p.text.length + p.principle.length + 600
    if (current.length && (current.length >= n || chars + cost > MAX_BATCH_CHARS)) {
      batches.push(current)
      current = []
      chars = 0
    }
    current.push(p)
    chars += cost
  }
  if (current.length) batches.push(current)
  return batches
}

const MATCH_CRITERIA = {
  true: 'The passage expresses the same underlying idea, advice or attitude that the quote means, even if its topic, images and wording are completely different.',
  false: 'The passage is about a different idea, or it only shares words, images or a surface topic with the literal wording of the quote.',
}

const READING_GUIDE =
  '`quote` is something a person typed: a saying, tweet, lyric or slogan. First read it the way a fluent native speaker would, taking idioms, slang, sarcasm and metaphors figuratively, and settle on the general idea or attitude it expresses.' 

export function questionKey(id: string) {
  return 'p_' + id.replace('.', '_')
}

export function buildQuestions(batch: Passage[], useGloss: boolean) {
  const questions: Record<string, unknown> = {}
  for (const p of batch) {
    const gloss = useGloss ? `\nPlain-English gloss of the passage: ${p.principle}` : ''
    questions[questionKey(p.id)] = {
      type: 'noul',
      instructions:
        `Passage from Marcus Aurelius's Meditations (1634 translation, archaic English):\n"${p.text}"${gloss}\n\n` +
        `${READING_GUIDE} Does this passage share that core idea? Judge the idea, not the words.`,
      criteria: MATCH_CRITERIA,
    }
  }
  return questions
}

interface JevAnswer { noul?: number }
interface JevResponse { answers?: Record<string, JevAnswer>; usage?: { input_tokens?: number } }

async function runBatch(ai: Ai, cfg: MatchConfig, quote: string, batch: Passage[]) {
  if (cfg.mock) return mockJev(quote, batch)
  // Clef speaks the same System One API as Jev but also wants its short name in the body
  const clef = cfg.jevModel.match(/^@cf\/cloudflare\/(clef(?:-flash)?)$/)?.[1]
  const res = (await ai.run(cfg.jevModel as keyof AiModels, {
    ...(clef ? { model: clef } : {}),
    state: { quote },
    questions: buildQuestions(batch, cfg.useGloss),
  } as never)) as JevResponse
  const scores: Record<string, number> = {}
  for (const p of batch) {
    const v = res?.answers?.[questionKey(p.id)]?.noul
    if (typeof v === 'number') scores[p.id] = v
  }
  if (!Object.keys(scores).length) throw new Error(`no answers in response: ${JSON.stringify(res).slice(0, 200)}`)
  return { scores, inputTokens: res?.usage?.input_tokens ?? 0 }
}

export async function match(
  ai: Ai,
  cfg: MatchConfig,
  corpus: Corpus,
  quote: string,
  emit: (e: MatchEvent) => void,
): Promise<MatchEvent & { type: 'done' }> {
  const batches = makeBatches(corpus.passages, cfg.batchSize)
  emit({ type: 'start', batches: batches.length, passages: corpus.passages.length })

  const all: Record<string, number> = {}
  let inputTokens = 0
  let failed = 0
  let lastError: string | undefined
  await Promise.all(
    batches.map(async (batch, index) => {
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          const r = await runBatch(ai, cfg, quote, batch)
          Object.assign(all, r.scores)
          inputTokens += r.inputTokens
          emit({ type: 'batch', index, ok: true, scores: r.scores })
          return
        } catch (err) {
          const error = (err instanceof Error ? err.message : String(err)).slice(0, 300)
          console.error(`jev batch ${index} attempt ${attempt + 1} failed: ${error}`)
          if (attempt === 1) {
            failed++
            lastError = error
            emit({ type: 'batch', index, ok: false, scores: {}, error })
          }
        }
      }
    }),
  )

  const ranked = Object.entries(all)
    .map(([id, score]) => ({ id, score }))
    .sort((a, b) => b.score - a.score)
  const done = { type: 'done' as const, partial: failed > 0, inputTokens, ranked, error: lastError }
  emit(done)
  return done
}

// Deterministic stand-in for local runs without Workers AI: stable pseudo-scores per quote and passage.
function mockJev(quote: string, batch: Passage[]) {
  const scores: Record<string, number> = {}
  for (const p of batch) {
    let h = 2166136261
    for (const ch of quote + p.id) h = Math.imul(h ^ ch.charCodeAt(0), 16777619)
    scores[p.id] = Math.round(((h >>> 0) % 1000) ** 2 / 1000) / 1000
  }
  return { scores, inputTokens: 0 }
}
