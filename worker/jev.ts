/* =============================================================================
   JEVITATIONS MATCHING
   One decision model (Jev, or its drop-in peer Clef) is the only model called
   per search. It reads the quote as state and scores every passage on how
   closely it makes the quote's point. The plain-English glosses are written
   ahead of time.
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
  prompt: PromptStyle
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

// v1: one yes/no question per passage, with the reading guide repeated in each question.
const MATCH_CRITERIA = {
  true: 'The passage expresses the same underlying idea, advice or attitude that the quote means, even if its topic, images and wording are completely different.',
  false: 'The passage is about a different idea, or it only shares words, images or a surface topic with the literal wording of the quote.',
}

const READING_GUIDE =
  '`quote` is something a person typed: a saying, tweet, lyric or slogan. First read it the way a fluent native speaker would, taking idioms, slang, sarcasm and metaphors figuratively, and settle on the general idea or attitude it expresses.'

// v2: the reading guide lives once in the state, and each passage gets a graded score, so
// near-ties between the many passages that touch a theme are ranked by how closely they match.
const SCORE_RUBRIC = [
  'A different idea',
  'Same broad theme, but a different point',
  'A closely related point',
  'The same core idea',
]

// point: the same graded score, with a scale that names surface overlap as its own low level
const POINT_RUBRIC = [
  'Unrelated: a different idea',
  'Shares only a topic, word or image with the quote, not its point',
  'Related: supports or overlaps with the point the quote makes',
  'Same point: says what the quote means, in its own terms',
]

// guided: the point scale, with worked examples of reading a saying for its point. The examples
// are deliberately far from the eval quotes so they teach the reading, not the answers.
const READING_EXAMPLES = [
  '"Don\'t count your chickens before they hatch" is about not relying on results before they arrive, not about farming.',
  '"Too many cooks spoil the broth" is about a job going wrong when too many people run it, not about soup.',
  '"Let them cook" is about giving someone room to work before judging them, not about food.',
  '"Sleep on it" is advice to wait until you are calm before deciding, not about sleep.',
]

export const PROMPT_STYLES = ['noul', 'score', 'point', 'guided'] as const
export type PromptStyle = (typeof PROMPT_STYLES)[number]
export const PROMPT_REVISION = 2

export function buildState(quote: string, style: PromptStyle) {
  if (style === 'noul') return { quote }
  if (style === 'guided') {
    return (
      `A person typed this quote: "${quote}"\n` +
      'People type sayings, slang, lyrics and jokes whose point is not in their literal words. ' +
      'Read it the way a fluent native speaker would and work out the idea, advice or attitude it expresses. For example:\n' +
      READING_EXAMPLES.map(e => `- ${e}`).join('\n') +
      '\nThat idea is what each passage is compared against. A passage matches only when it makes the same point; ' +
      'sharing a word, image or mood with the literal quote is not enough.'
    )
  }
  return (
    `A person typed this quote: "${quote}"\n` +
    'Read it the way a fluent native speaker would, taking idioms, slang, sarcasm and metaphors figuratively, ' +
    'and work out the idea, advice or attitude it expresses. That idea is what each passage is compared against.'
  )
}

export function questionKey(id: string) {
  return 'p_' + id.replace('.', '_')
}

export function buildQuestions(batch: Passage[], useGloss: boolean, style: PromptStyle) {
  const questions: Record<string, unknown> = {}
  for (const p of batch) {
    if (style === 'noul') {
      const gloss = useGloss ? `\nPlain-English gloss of the passage: ${p.principle}` : ''
      questions[questionKey(p.id)] = {
        type: 'noul',
        instructions:
          `Passage from Marcus Aurelius's Meditations (1634 translation, archaic English):\n"${p.text}"${gloss}\n\n` +
          `${READING_GUIDE} Does this passage share that core idea? Judge the idea, not the words.`,
        criteria: MATCH_CRITERIA,
      }
      continue
    }
    const gloss = useGloss ? `\nIn plain English: ${p.principle}` : ''
    questions[questionKey(p.id)] = {
      type: 'score',
      instructions:
        `Meditations passage (1634 English): "${p.text}"${gloss}\n` +
        'How closely does this passage express the idea behind the quote? Judge meaning, not shared words.',
      criteria: style === 'score' ? SCORE_RUBRIC : POINT_RUBRIC,
    }
  }
  return questions
}

interface JevAnswer { noul?: number; score?: number }
interface JevResponse { answers?: Record<string, JevAnswer>; usage?: { input_tokens?: number } }

async function runBatch(ai: Ai, cfg: MatchConfig, quote: string, batch: Passage[]) {
  if (cfg.mock) return mockJev(quote, batch)
  // Clef speaks the same System One API as Jev but also wants its short name in the body
  const clef = cfg.jevModel.match(/^@cf\/cloudflare\/(clef(?:-flash)?)$/)?.[1]
  const res = (await ai.run(cfg.jevModel as keyof AiModels, {
    ...(clef ? { model: clef } : {}),
    state: buildState(quote, cfg.prompt),
    questions: buildQuestions(batch, cfg.useGloss, cfg.prompt),
  } as never)) as JevResponse
  const scores: Record<string, number> = {}
  for (const p of batch) {
    const a = res?.answers?.[questionKey(p.id)]
    // Scores come back as an expected rubric level; scale them to 0..1 like noul probabilities
    const v = cfg.prompt === 'noul' ? a?.noul : (a?.score ?? NaN) / (SCORE_RUBRIC.length - 1)
    if (typeof v === 'number' && Number.isFinite(v)) scores[p.id] = Math.round(v * 1000) / 1000
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
