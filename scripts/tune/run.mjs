// Scores every passage for each labelled quote under one or more call designs and prints one
// JSON line per (design, quote) with all scores, for scripts/tune/analyze.mjs.
//   node scripts/tune/run.mjs <preview url> <split: dev|test|all> <design> [design...]
import { readFileSync } from 'node:fs'

const [base, split, ...designs] = process.argv.slice(2)
const quotes = JSON.parse(readFileSync(new URL('./quotes.json', import.meta.url))).filter(
  q => split === 'all' || q.split === split,
)

async function score(quote, design) {
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(`${base}/api/jev/tune`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ quote, design }),
    })
    const body = await res.json().catch(() => ({}))
    if (res.ok) return body
    if (res.status === 429 || attempt >= 2) throw new Error(`${res.status} ${JSON.stringify(body)}`)
    await new Promise(r => setTimeout(r, 5000))
  }
}

// Quotes run one at a time because the worker's daily token counter is a plain read-then-write
for (const design of designs) {
  for (const q of quotes) {
    try {
      const r = await score(q.quote, design)
      console.log(JSON.stringify({ design, quote: q.quote, tokens: r.tokens, errors: r.errors, scores: r.scores }))
    } catch (err) {
      console.log(JSON.stringify({ design, quote: q.quote, fatal: String(err) }))
      if (String(err).includes('daily_cap')) process.exit(0)
    }
  }
}
