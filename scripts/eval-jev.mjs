// Scores Jev's matches against hand-picked expected passages.
// Run against a worker with the real AI binding, e.g.
//   npx wrangler dev --remote --port 8787        (needs CLOUDFLARE_API_TOKEN)
//   node scripts/eval-jev.mjs http://localhost:8787
// Flip JEV_USE_GLOSS in wrangler.json and rerun to compare with and without glosses.

const base = process.argv[2] || 'http://localhost:8787'

const CASES = [
  ["I'd rather get caught with it than without it", ['3.XIV', '5.XV', '7.XXXIII', '10.XXXV', '7.VI']],
  ['The obstacle is the way', ['5.XVII', '4.I', '8.XXXIII']],
  ['This too shall pass', ['4.XXXV', '9.XXVII', '12.XX']],
  ["Don't sweat the small stuff", ['7.VI', '8.XLVII', '4.XXXVIII']],
  ['Haters gonna hate', ['5.III', '9.XXXII', '7.XII']],
  ['You only live once', ['2.II', '7.XL', '4.XIV', '2.VIII']],
  ['Live in the moment', ['2.XII', '3.X', '8.XLII']],
  ['Touch grass', ['4.III', '8.XLVI', '5.XXIII']],
  ['Stop talking about it and just be good', ['7.XII', '11.IV', '8.XXI', '4.XIV']],
  ['Nobody will remember your name in a hundred years', ['4.XVI', '4.XXVIII', '5.XXVII', '6.XVII']],
]

async function run(quote) {
  const res = await fetch(`${base}/api/jev/match`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ quote }),
  })
  if (res.status === 429 && (await res.clone().json()).error === 'rate_limited') {
    await new Promise(r => setTimeout(r, 61_000))
    return run(quote)
  }
  if (!res.ok) throw new Error(`${res.status} ${await res.text()}`)
  const lines = (await res.text()).trim().split('\n').map(l => JSON.parse(l))
  return { done: lines.find(e => e.type === 'done'), cache: res.headers.get('x-jev-cache') }
}

let hits = 0
let tokens = 0
for (const [quote, expected] of CASES) {
  const t = Date.now()
  const { done, cache } = await run(quote)
  const ranks = expected.map(id => done.ranked.findIndex(r => r.id === id) + 1)
  const best = Math.min(...ranks.filter(r => r > 0))
  if (best <= 5) hits++
  tokens += done.inputTokens
  const top = done.ranked.slice(0, 3).map(r => `${r.id} ${r.score.toFixed(2)}`).join(', ')
  console.log(`${best <= 5 ? 'ok  ' : 'MISS'} best expected #${best}  ${Date.now() - t}ms ${cache}${done.partial ? ' partial' : ''}  "${quote}"  top: ${top}`)
}
console.log(`\n${hits}/${CASES.length} with an expected passage in the top 5, ${tokens} input tokens`)
