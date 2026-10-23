// Builds src/zackos/jevitations/meditations.json from George Long's translation
// (Project Gutenberg eBook #15877, kept in scripts/sources/meditations-long.txt) and the
// plain-English glosses in scripts/sources/meditations-glosses.json.
//   node scripts/build-meditations.mjs
// Long's notes, footnote markers and square brackets around words he supplied are dropped,
// and each passage is stored as numbered sentences so the app can highlight them.

import { readFileSync, writeFileSync, existsSync } from 'node:fs'

const src = new URL('./sources/meditations-long.txt', import.meta.url)
const glossFile = new URL('./sources/meditations-glosses.json', import.meta.url)
const out = new URL('../src/zackos/jevitations/meditations.json', import.meta.url)

const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII']
// Long's section counts per book, used to check the parse
const EXPECTED = [17, 17, 16, 51, 36, 59, 75, 61, 42, 38, 39, 36]

const lines = readFileSync(src, 'utf8').replace(/\r/g, '').split('\n')
const start = lines.findIndex((l, i) => l === 'THE THOUGHTS' && lines.slice(i, i + 8).includes('I.'))
const end = lines.indexOf('INDEXES.')
if (start < 0 || end < 0) throw new Error('could not find the start or end of the text')

const sections = []
let book = 0
let current = null
let inNote = false
for (const line of lines.slice(start, end)) {
  const bookMatch = line.match(/^([IVX]+)\.$/)
  if (bookMatch && ROMAN.includes(bookMatch[1])) {
    book = ROMAN.indexOf(bookMatch[1]) + 1
    current = { book, section: 1, paras: [[]] }
    sections.push(current)
    inNote = false
    continue
  }
  if (!book || line.startsWith('[Illustration')) continue
  // a few notes sit unindented after a passage ("[A] See Aristophanes ..."), and quoted verse
  // carries an indented source line ("HESIOD, Works and Days, 184.")
  if (/^\[[A-Z]\] /.test(line) || /^ {9,}(?:[A-Z]{3,}\b|_[A-Z])/.test(line)) continue
  // Long's notes are indented blocks that open with a marker such as "    [A]"
  if (/^ {4}\[[A-Z]\]/.test(line)) inNote = true
  if (inNote) {
    if (line === '' || /^ /.test(line)) continue
    inNote = false
  }
  if (line.trim() === '') {
    if (current.paras.at(-1).length) current.paras.push([])
    continue
  }
  const numbered = line.match(/^(\d+)\. (.*)$/)
  if (numbered && Number(numbered[1]) === current.section + 1) {
    current = { book, section: current.section + 1, paras: [[numbered[2]]] }
    sections.push(current)
    continue
  }
  current.paras.at(-1).push(line.trim())
}

// Long marks words he supplied with square brackets. Words that carry the sentence along lose
// the brackets; an alternative rendering after a word, such as "Eudaemonia [happiness]",
// becomes a parenthesis so the sentence still reads.
const FLOWING = /^(?:to|of|for|by|in|into|with|between|on|from|at|about|which|that|and|be|I)\b/
const FUNCTION_WORDS = new Set(['not', 'to', 'of', 'the', 'a', 'an', 'in', 'from', 'and', 'or', 'is', 'are', 'be', 'been', 'if', 'that', 'as', 'with', 'for', 'by', 'on', 'at', 'than', 'but', 'nor', 'so', 'like'])

function unbracket(text) {
  return text.replace(/(\S*)(\s*)\[([^\]]+)\]/g, (_, prev, space, inner) => {
    const word = prev.replace(/[^A-Za-z]/g, '').toLowerCase()
    if (/^or\b/.test(inner)) return `${prev}${space}(${inner})`
    if (FLOWING.test(inner) || !/[A-Za-z]$/.test(prev) || FUNCTION_WORDS.has(word)) return `${prev}${space}${inner}`
    return `${prev}${space}(${inner})`
  })
}

function clean(text) {
  const unmarked = text
    .replace(/\[\[Greek: ([^\]]+)\]\]/g, '($1)')
    .replace(/\[Greek: ([^\]]+)\]/g, '($1)')
    .replace(/\[[A-Z]\]/g, '')
    // Long's cross-references such as (vi. 28) and his + marks for doubtful readings
    .replace(/\s*\((?=[^()]*\b[ivx]+\.)(?:[ivx\d.,; ]|note|c\.)+\)/g, '')
    .replace(/\+/g, '')
    .replace(/\s*\(Epictetus,[^)]*\)/g, '')
    .replace(/\s*\[The three last words[^\]]*\]/g, '')
  return unbracket(unmarked)
    .replace(/_([^_]+)_/g, '$1')
    .replace(/--/g, '—')
    .replace(/\s+/g, ' ')
    .replace(/ ([,;:.?!])/g, '$1')
    .replace(/\( /g, '(')
    .replace(/,$/, '.')
    .trim()
}

// Abbreviations and initials that end in a full stop without ending a sentence
const NO_BREAK = /(?:\b(?:Mr|Mrs|Dr|St|viz|i\.e|e\.g|c|cf|ch|Ep|Epp|Capitol|vol|p|pp)|\b[A-Z])\.$/

// Sentences longer than this are split again at semicolons, so a highlight can pick out a clause
const LONG_SENTENCE = 350
const MIN_CLAUSE = 100

function splitSentences(text) {
  const parts = text.split(/(?<=[.?!]["')]?)\s+(?=["'(]?[A-Z])/)
  const sentences = []
  for (const part of parts) {
    if (sentences.length && NO_BREAK.test(sentences.at(-1))) sentences[sentences.length - 1] += ' ' + part
    else sentences.push(part)
  }
  return sentences.flatMap(splitClauses)
}

function splitClauses(sentence) {
  if (sentence.length <= LONG_SENTENCE) return [sentence]
  const clauses = []
  for (const piece of sentence.split(/(?<=;)\s+/)) {
    if (clauses.length && (clauses.at(-1).length < MIN_CLAUSE || piece.length < MIN_CLAUSE / 2)) clauses[clauses.length - 1] += ' ' + piece
    else clauses.push(piece)
  }
  return clauses
}

const glosses = existsSync(glossFile) ? JSON.parse(readFileSync(glossFile, 'utf8')) : {}
const passages = sections.map(s => {
  const id = `${s.book}.${s.section}`
  const paragraphs = []
  for (const para of s.paras.filter(p => p.length).map(p => clean(p.join(' ')))) {
    // a quoted verse runs on from the paragraph before it when that one has no closing stop
    if (paragraphs.length && !/[.?!:]["')]?$/.test(paragraphs.at(-1))) paragraphs[paragraphs.length - 1] += ' ' + para
    else paragraphs.push(para)
  }
  const sentences = paragraphs.flatMap(splitSentences)
  // The app and worker rebuild the passage text as sentences.join(' ')
  return { id, book: s.book, section: s.section, sentences, principle: glosses[id] ?? '' }
})

const counts = EXPECTED.map((_, i) => passages.filter(p => p.book === i + 1).length)
const mismatched = counts.map((n, i) => (n === EXPECTED[i] ? null : `book ${i + 1}: ${n}, expected ${EXPECTED[i]}`)).filter(Boolean)
if (mismatched.length) console.warn(`section counts differ from Long's numbering:\n  ${mismatched.join('\n  ')}`)
const missing = passages.filter(p => !p.principle).map(p => p.id)
if (missing.length) console.warn(`${missing.length} passages have no gloss yet, e.g. ${missing.slice(0, 5).join(', ')}`)

writeFileSync(
  out,
  JSON.stringify(
    {
      persona: 'marcus-aurelius',
      source: 'Meditations, translated by George Long (1862). Project Gutenberg eBook #15877.',
      passages,
    },
    null,
    1,
  ) + '\n',
)
console.log(`wrote ${passages.length} passages, ${passages.reduce((n, p) => n + p.sentences.length, 0)} sentences`)
