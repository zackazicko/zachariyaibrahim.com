// Scores the matcher's rankings against hand-picked expected passages.
// Run against a worker with the real AI binding, for example the branch preview:
//   node scripts/eval-jev.mjs https://jevitations-zachariyaibrahimdotcom.zacki917.workers.dev
// Compare prompt variants (honoured on preview and local hosts only):
//   node scripts/eval-jev.mjs <url> score:gloss noul:gloss score:plain
// Each case is one full search, so it spends one search of the daily cap.

import { readFileSync } from 'node:fs'

const [base = 'http://localhost:8787', ...variantArgs] = process.argv.slice(2)
const variants = variantArgs.length ? variantArgs : ['default']
const corpus = JSON.parse(readFileSync(new URL('../src/zackos/jevitations/meditations.json', import.meta.url)))
const byId = new Map(corpus.passages.map(p => [p.id, p]))

const CASES = [
  ["I'd rather get caught with it than without it", ['3.XIV', '5.XV', '7.XXXIII', '10.XXXV', '7.VI']],
  ['The obstacle is the way', ['5.XVII', '4.I', '8.XXXIII']],
  ['This too shall pass', ['4.XXXV', '9.XXVII', '12.XX']],
  ["Don't sweat the small stuff", ['7.VI', '8.XLVII', '4.XXXVIII']],
  ['Haters gonna hate', ['5.III', '9.XXXII', '7.XII']],
  ['You only live once', ['2.II', '7.XL', '4.XIV', '2.VIII']],
  ['Touch grass', ['4.III', '8.XLVI', '5.XXIII']],
  ['Nobody will remember your name in a hundred years', ['4.XVI', '4.XXVIII', '5.XXVII', '6.XVII']],
]

function headersFor(variant) {
  const headers = { 'content-type': 'application/json' }
  if (variant !== 'default') {
    const [prompt, gloss] = variant.split(':')
    headers['x-jev-prompt'] = prompt
    headers['x-jev-gloss'] = gloss === 'plain' ? 'false' : 'true'
  }
  return headers
}

async function run(quote, variant) {
  const res = await fetch(`${base}/api/jev/match`, {
    method: 'POST',
    headers: headersFor(variant),
    body: JSON.stringify({ quote }),
  })
  if (res.status === 429 && (await res.clone().json()).error === 'rate_limited') {
    await new Promise(r => setTimeout(r, 61_000))
    return run(quote, variant)
  }
  if (!res.ok) throw new Error(`${res.status} ${await res.text()}`)
  const lines = (await res.text()).trim().split('\n').map(l => JSON.parse(l))
  return { done: lines.find(e => e.type === 'done'), cache: res.headers.get('x-jev-cache') }
}

const snippet = id => (byId.get(id)?.text ?? '').slice(0, 70).replace(/\s+/g, ' ')

for (const variant of variants) {
  console.log(`\n=== ${variant} ===`)
  let top1 = 0
  let top5 = 0
  let rr = 0
  let tokens = 0
  for (const [quote, expected] of CASES) {
    const t = Date.now()
    const { done, cache } = await run(quote, variant)
    if (!done.ranked.length) {
      console.log(`FAIL  "${quote}"  ${done.error ?? 'no results'}`)
      continue
    }
    const ranks = expected.map(id => done.ranked.findIndex(r => r.id === id) + 1).filter(r => r > 0)
    const best = Math.min(...ranks)
    if (best === 1) top1++
    if (best <= 5) top5++
    rr += 1 / best
    tokens += done.inputTokens
    const spread = `${done.ranked[0].score.toFixed(2)}..${done.ranked[done.ranked.length - 1].score.toFixed(2)}`
    console.log(`${best <= 5 ? 'ok  ' : 'MISS'} best expected #${best}  ${Date.now() - t}ms ${cache}${done.partial ? ' PARTIAL' : ''}  scores ${spread}  "${quote}"`)
    for (const r of done.ranked.slice(0, 3)) {
      console.log(`       ${expected.includes(r.id) ? '*' : ' '} ${r.id.padEnd(9)} ${r.score.toFixed(2)}  ${snippet(r.id)}`)
    }
  }
  console.log(`--- ${variant}: top1 ${top1}/${CASES.length}, top5 ${top5}/${CASES.length}, MRR ${(rr / CASES.length).toFixed(2)}, ${tokens} input tokens`)
}
