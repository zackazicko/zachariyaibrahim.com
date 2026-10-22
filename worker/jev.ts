/* =============================================================================
   JEVITATIONS MATCHING
   One decision model (Jev, or its drop-in peer Clef) is the only model called
   per search. It reads the quote as state and scores every passage on how
   closely it makes the quote's point, then scores each sentence of the top
   passages so the app can bold the one that says it. The plain-English glosses
   are written ahead of time.
   ============================================================================= */

export interface Passage {
  id: string
  book: number
  section: number
  sentences: string[]
  principle: string
}

export function passageText(p: Passage) {
  return p.sentences.join(' ')
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
  rank: RankBy
  batchSize: number
  // preview only: batch events also carry each passage's probability per rubric level
  levels: boolean
  mock: boolean
}

// mean: the probability-weighted rubric level. top: the probability of the highest level alone.
export const RANK_BY = ['mean', 'top'] as const
export type RankBy = (typeof RANK_BY)[number]

export type MatchEvent =
  | { type: 'start'; batches: number; passages: number }
  | {
      type: 'batch'
      index: number
      ok: boolean
      scores: Record<string, number>
      // preview only: probabilities per rubric level, and one raw answer to show its shape
      levels?: Record<string, number[]>
      sample?: unknown
      error?: string
    }
  | {
      type: 'done'
      partial: boolean
      inputTokens: number
      ranked: { id: string; score: number }[]
      // sentence indices to bold in each of the top passages
      highlights?: Record<string, number[]>
      error?: string
    }

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
    const cost = passageText(p).length + p.principle.length + 600
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

// agree: asks from the point of view of the person who typed the quote
const AGREE_RUBRIC = [
  'No: it tells them something else',
  'Only on the surface: it shares a topic, word or image, not the message',
  'Partly: it backs up or overlaps with their message',
  'Yes: it tells them the same thing',
]

// guided: the point scale, with worked examples of reading a saying for its point. The examples
// are deliberately far from the eval quotes so they teach the reading, not the answers.
const READING_EXAMPLES = [
  '"Don\'t count your chickens before they hatch" is about not relying on results before they arrive, not about farming.',
  '"Too many cooks spoil the broth" is about a job going wrong when too many people run it, not about soup.',
  '"Let them cook" is about giving someone room to work before judging them, not about food.',
  '"Sleep on it" is advice to wait until you are calm before deciding, not about sleep.',
]

export const PROMPT_STYLES = ['noul', 'score', 'point', 'guided', 'agree'] as const
export type PromptStyle = (typeof PROMPT_STYLES)[number]
export const PROMPT_REVISION = 3

const RUBRICS: Record<Exclude<PromptStyle, 'noul'>, string[]> = {
  score: SCORE_RUBRIC,
  point: POINT_RUBRIC,
  guided: POINT_RUBRIC,
  agree: AGREE_RUBRIC,
}

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
          `Passage from Marcus Aurelius's Meditations (George Long's 1862 translation):\n"${passageText(p)}"${gloss}\n\n` +
          `${READING_GUIDE} Does this passage share that core idea? Judge the idea, not the words.`,
        criteria: MATCH_CRITERIA,
      }
      continue
    }
    const gloss = useGloss ? `\nIn plain English: ${p.principle}` : ''
    const ask =
      style === 'agree'
        ? 'Would the person who typed the quote agree this passage tells them the same thing? Judge meaning, not shared words.'
        : 'How closely does this passage express the idea behind the quote? Judge meaning, not shared words.'
    questions[questionKey(p.id)] = {
      type: 'score',
      instructions: `Meditations passage (George Long's translation): "${passageText(p)}"${gloss}\n${ask}`,
      criteria: RUBRICS[style],
    }
  }
  return questions
}

interface JevAnswer { noul?: number; score?: number; probabilities?: Record<string, number> }
interface JevResponse { answers?: Record<string, JevAnswer>; usage?: { input_tokens?: number } }

async function ask(ai: Ai, model: string, state: unknown, questions: Record<string, unknown>) {
  // Clef speaks the same System One API as Jev but also wants its short name in the body
  const clef = model.match(/^@cf\/cloudflare\/(clef(?:-flash)?)$/)?.[1]
  return (await ai.run(model as keyof AiModels, {
    ...(clef ? { model: clef } : {}),
    state,
    questions,
  } as never)) as JevResponse
}

// A score answer carries the probability of each rubric level, keyed "0" to "n-1", next to
// the weighted score
export function levelProbs(a: JevAnswer | undefined, n: number): number[] | null {
  const probs = Array.from({ length: n }, (_, i) => a?.probabilities?.[i])
  return probs.every(p => typeof p === 'number') ? (probs as number[]) : null
}

const round = (v: number) => Math.round(v * 1000) / 1000

// Scales an answer to 0..1: noul is already a probability, and a score is either its expected
// level over the top level or, ranking by top, the probability of the top level
function answerValue(a: JevAnswer | undefined, levels: number, rank: RankBy, noul: boolean) {
  if (noul) return a?.noul
  if (rank === 'top') return levelProbs(a, levels)?.[levels - 1] ?? (a?.score ?? NaN) / (levels - 1)
  return (a?.score ?? NaN) / (levels - 1)
}

async function runBatch(ai: Ai, cfg: MatchConfig, quote: string, batch: Passage[]) {
  if (cfg.mock) return mockJev(quote, batch)
  const res = await ask(ai, cfg.jevModel, buildState(quote, cfg.prompt), buildQuestions(batch, cfg.useGloss, cfg.prompt))
  const n = cfg.prompt === 'noul' ? 2 : RUBRICS[cfg.prompt].length
  const scores: Record<string, number> = {}
  const levels: Record<string, number[]> = {}
  for (const p of batch) {
    const a = res?.answers?.[questionKey(p.id)]
    const v = answerValue(a, n, cfg.rank, cfg.prompt === 'noul')
    if (typeof v === 'number' && Number.isFinite(v)) scores[p.id] = round(v)
    const probs = cfg.levels && levelProbs(a, n)
    if (probs) levels[p.id] = probs.map(round)
  }
  if (!Object.keys(scores).length) throw new Error(`no answers in response: ${JSON.stringify(res).slice(0, 200)}`)
  const sample = cfg.levels ? res?.answers?.[questionKey(batch[0].id)] : undefined
  return { scores, levels: cfg.levels ? levels : undefined, sample, inputTokens: res?.usage?.input_tokens ?? 0 }
}

// The sentences of each top passage get their own small call, so the app can bold the one
// that says what the quote means
export const HIGHLIGHT_PASSAGES = 3
const SENTENCE_RUBRIC = [
  'Does not carry the idea',
  'Sets up or gives background for the idea',
  'Supports or illustrates the idea',
  'States the idea most directly',
]
// A second sentence is bolded only when it scores nearly as well as the best one
const SECOND_SENTENCE_GAP = 0.1

export function buildHighlightState(quote: string, p: Passage) {
  return (
    buildState(quote, 'point') +
    `\n\nThis passage from the Meditations (George Long's translation) matches that idea:\n"${passageText(p)}"\n` +
    'Each question is one sentence of the passage.'
  )
}

export function buildHighlightQuestions(p: Passage) {
  const questions: Record<string, unknown> = {}
  p.sentences.forEach((s, i) => {
    questions[`s_${i}`] = {
      type: 'score',
      instructions: `Sentence ${i + 1}: "${s}"\nHow directly does this sentence say what the quote means?`,
      criteria: SENTENCE_RUBRIC,
    }
  })
  return questions
}

export function pickSentences(values: number[]) {
  const order = values.map((v, i) => [v, i]).filter(([v]) => Number.isFinite(v)).sort((a, b) => b[0] - a[0])
  if (!order.length) return []
  const picked = [order[0][1]]
  if (order[1] && order[1][0] >= order[0][0] - SECOND_SENTENCE_GAP) picked.push(order[1][1])
  return picked.sort((a, b) => a - b)
}

async function highlight(ai: Ai, cfg: MatchConfig, quote: string, p: Passage) {
  if (p.sentences.length < 2) return { sentences: [0], inputTokens: 0 }
  if (cfg.mock) return { sentences: [hash(quote + p.id) % p.sentences.length], inputTokens: 0 }
  const res = await ask(ai, cfg.jevModel, buildHighlightState(quote, p), buildHighlightQuestions(p))
  const values = p.sentences.map((_, i) => res?.answers?.[`s_${i}`]?.score ?? NaN)
  return { sentences: pickSentences(values), inputTokens: res?.usage?.input_tokens ?? 0 }
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
          emit({ type: 'batch', index, ok: true, scores: r.scores, ...(r.levels ? { levels: r.levels, sample: r.sample } : {}) })
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

  // A failed highlight only costs the bold sentence, so it never marks the result partial
  const byId = new Map(corpus.passages.map(p => [p.id, p]))
  const highlights: Record<string, number[]> = {}
  await Promise.all(
    ranked.slice(0, HIGHLIGHT_PASSAGES).map(async ({ id }) => {
      try {
        const h = await highlight(ai, cfg, quote, byId.get(id)!)
        inputTokens += h.inputTokens
        if (h.sentences.length) highlights[id] = h.sentences
      } catch (err) {
        console.error(`jev highlight ${id} failed: ${(err instanceof Error ? err.message : String(err)).slice(0, 300)}`)
      }
    }),
  )

  const done = { type: 'done' as const, partial: failed > 0, inputTokens, ranked, highlights, error: lastError }
  emit(done)
  return done
}

function hash(text: string) {
  let h = 2166136261
  for (const ch of text) h = Math.imul(h ^ ch.charCodeAt(0), 16777619)
  return h >>> 0
}

// Deterministic stand-in for local runs without Workers AI: stable pseudo-scores per quote and passage.
function mockJev(quote: string, batch: Passage[]) {
  const scores: Record<string, number> = {}
  for (const p of batch) scores[p.id] = Math.round((hash(quote + p.id) % 1000) ** 2 / 1000) / 1000
  return { scores, levels: undefined, sample: undefined, inputTokens: 0 }
}
