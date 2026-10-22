// Scores the dumps from scripts/tune/run.mjs against the labels in quotes.json.
//   node scripts/tune/analyze.mjs dump.jsonl [more.jsonl...]
// Besides each design on its own, it reports:
//   shortlist A>B   rank by A, keep the top K, rerank those by B (how a cheap first pass would do)
//   A-prior         A minus each passage's mean score over all quotes (passages that score high
//                   for every quote stop crowding the top)
import { readFileSync } from 'node:fs'

const labels = new Map(JSON.parse(readFileSync(new URL('./quotes.json', import.meta.url))).map(q => [q.quote, q]))
const runs = {}
for (const file of process.argv.slice(2)) {
  for (const line of readFileSync(file, 'utf8').split('\n')) {
    if (!line.trim()) continue
    const r = JSON.parse(line)
    if (!r.scores || !labels.has(r.quote)) continue
    ;(runs[r.design] ??= {})[r.quote] = r.scores
  }
}

const rankOf = (scores, best) => {
  const ranked = Object.entries(scores).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
  const ranks = best.map(id => ranked.findIndex(([pid]) => pid === id) + 1).filter(r => r > 0)
  return ranks.length ? Math.min(...ranks) : Infinity
}

function report(name, byQuote) {
  const qs = Object.keys(byQuote)
  if (!qs.length) return
  let t1 = 0, t3 = 0, t10 = 0, rr = 0
  const misses = []
  for (const q of qs) {
    const r = rankOf(byQuote[q], labels.get(q).best)
    if (r === 1) t1++
    if (r <= 3) t3++
    if (r <= 10) t10++
    rr += 1 / r
    if (r > 3) misses.push(`${r}:${q}`)
  }
  const pct = n => `${Math.round((100 * n) / qs.length)}%`.padStart(4)
  console.log(`${name.padEnd(44)} n=${qs.length}  top1 ${pct(t1)}  top3 ${pct(t3)}  top10 ${pct(t10)}  MRR ${(rr / qs.length).toFixed(2)}`)
  return misses
}

function prior(byQuote) {
  const sum = {}, n = {}
  for (const s of Object.values(byQuote)) for (const [id, v] of Object.entries(s)) { sum[id] = (sum[id] ?? 0) + v; n[id] = (n[id] ?? 0) + 1 }
  const out = {}
  for (const [q, s] of Object.entries(byQuote)) {
    out[q] = Object.fromEntries(Object.entries(s).map(([id, v]) => [id, v - sum[id] / n[id]]))
  }
  return out
}

function shortlist(a, b, k) {
  const out = {}
  for (const q of Object.keys(a)) {
    if (!b[q]) continue
    const keep = Object.entries(a[q]).sort((x, y) => y[1] - x[1]).slice(0, k).map(([id]) => id)
    out[q] = Object.fromEntries(keep.map(id => [id, (b[q][id] ?? 0) + 1e-6 * a[q][id]]))
  }
  return out
}

const verbose = process.env.VERBOSE
for (const [d, byQuote] of Object.entries(runs)) {
  const m = report(d, byQuote)
  if (verbose) console.log('   misses', m.join(' | '))
  report(`${d}-prior`, prior(byQuote))
}
const names = Object.keys(runs)
for (const a of names) for (const b of names) {
  if (a === b || !/gloss$/.test(a) || /gloss$/.test(b)) continue
  for (const k of [12, 25, 50]) report(`shortlist ${a}>${b} K=${k}`, shortlist(runs[a], runs[b], k))
}
// how deep the shortlist must go to keep a right passage
for (const a of names.filter(n => /-gloss$/.test(n))) {
  const ranks = Object.keys(runs[a]).map(q => rankOf(runs[a][q], labels.get(q).best)).sort((x, y) => x - y)
  const at = p => ranks[Math.min(ranks.length - 1, Math.floor(p * ranks.length))]
  console.log(`${a}: rank of first right passage  median ${at(0.5)}  p80 ${at(0.8)}  p90 ${at(0.9)}  max ${ranks.at(-1)}`)
}
