import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'

/* =============================================================================
   JEVITATIONS
   Type a quote, Jev scores every passage of the Meditations by shared idea,
   and the ranked passages spin on a looping drum. Matching runs in the site
   worker at /api/jev/match and streams one event per batch.
   ============================================================================= */

interface Passage {
  id: string
  book: number
  section: string
  text: string
}

interface Match {
  passage: Passage
  score: number
}

type MatchEvent =
  | { type: 'start'; batches: number; passages: number }
  | { type: 'batch'; index: number; ok: boolean }
  | { type: 'done'; partial: boolean; ranked: { id: string; score: number }[] }

const PLACEHOLDER = "I'd rather get caught with it than without it"
const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII']
const PERSONAS = [
  { id: 'marcus-aurelius', name: 'Marcus Aurelius', ready: true, beard: true },
  { id: 'seneca', name: 'Seneca', ready: false, beard: false },
  { id: 'epictetus', name: 'Epictetus', ready: false, beard: true },
]
const UNREACHABLE = 'Marcus could not be reached. Try again.'

// Drum geometry: row height, rows drawn each side of centre, degrees per row
const ROW_H = 30
const SPAN = 3
const STEP = 24
const LENS_TOP = 60
const WHEEL_STEP = 36

let corpusPromise: Promise<Map<string, Passage>> | null = null
function loadCorpus() {
  corpusPromise ??= import('./meditations.json').then(m => new Map(m.default.passages.map(p => [p.id, p])))
  return corpusPromise
}

function scoreColor(s: number) {
  return s >= 0.7 ? '#28c840' : s >= 0.35 ? '#febc2e' : '#ff5f57'
}

function cite(p: Passage) {
  return `Book ${ROMAN[p.book]} · ${p.section}`
}

function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function Bust({ beard = true }: { beard?: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <g stroke="currentColor" strokeWidth="1" strokeLinejoin="round">
        <path d="M5.5 6.5c0-2.4 1.2-4 3-4s3 1.4 3 3.5c0 .8-.2 1.5-.5 2l.6 1.4-.9.3c0 1-.5 1.8-1.6 1.8H8" />
        <path d="M5.2 4.6c.4-.9 1-1.4 1.6-1.6M4.8 6.2l.9-.3M5 8l.8-.2" />
        {beard && <path d="M6 9.5c.4 1 1.2 1.6 2.4 1.6" />}
        <path d="M7 11.2v1.3M3 15.5c.4-2 2-3 4.5-3h1c2.5 0 4.1 1 4.5 3z" />
      </g>
    </svg>
  )
}

function Score({ score }: { score: number }) {
  return (
    <span className="jev-score">
      <i className="jev-sq" style={{ background: scoreColor(score) }} />
      {score.toFixed(2)}
    </span>
  )
}

function scoreNode(score: number) {
  const span = document.createElement('span')
  span.className = 'jev-score'
  const sq = document.createElement('i')
  sq.className = 'jev-sq'
  sq.style.background = scoreColor(score)
  span.append(sq, score.toFixed(2))
  return span
}

function Featured({ match, rank, animate, error }: { match: Match | null; rank: number; animate: boolean; error: string | null }) {
  const textRef = useRef<HTMLDivElement>(null)
  const [expanded, setExpanded] = useState(false)
  const [clips, setClips] = useState(false)

  useEffect(() => setExpanded(false), [match])

  useLayoutEffect(() => {
    const el = textRef.current
    if (!el || !match) return
    const text = match.passage.text
    const measure = () => setClips(el.scrollHeight > el.clientHeight + 1)
    if (!animate || prefersReducedMotion()) {
      el.textContent = text
      measure()
      return
    }
    el.textContent = ''
    const out = document.createElement('span')
    const caret = document.createElement('span')
    caret.className = 'jev-caret'
    caret.textContent = '|'
    el.append(out, caret)
    const step = Math.max(2, Math.ceil(text.length / 180))
    let i = 0
    const id = window.setInterval(() => {
      i += step
      out.textContent = text.slice(0, i)
      if (i >= text.length) {
        window.clearInterval(id)
        caret.remove()
        measure()
      }
    }, 12)
    return () => window.clearInterval(id)
  }, [match, animate])

  if (error) {
    return (
      <section className="jev-featured" aria-live="polite">
        <div className="jev-alert">
          <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M8 1h8l7 7v8l-7 7H8l-7-7V8z" fill="#fff" stroke="#000" />
            <rect x="11" y="6" width="2" height="8" fill="#000" />
            <rect x="11" y="16" width="2" height="2" fill="#000" />
          </svg>
          <p>{error}</p>
        </div>
      </section>
    )
  }

  return (
    <section className={`jev-featured${expanded ? ' open' : ''}`} aria-live="polite">
      <div className="jev-passage" ref={textRef} />
      {match && (
        <div className="jev-fcite">
          <span className="jev-cite">{cite(match.passage)}</span>
          <span className="jev-cite jev-rank">#{rank + 1}</span>
          {(clips || expanded) && (
            <button className="jev-more" type="button" onClick={() => setExpanded(e => !e)}>
              {expanded ? 'less' : 'more'}
            </button>
          )}
          <Score score={match.score} />
        </div>
      )}
    </section>
  )
}

function Dial({ matches, onSettle }: { matches: Match[]; onSettle: (index: number) => void }) {
  const dialRef = useRef<HTMLDivElement>(null)
  const api = useRef<{ reset: (m: Match[]) => void } | null>(null)
  const onSettleRef = useRef(onSettle)
  onSettleRef.current = onSettle

  useEffect(() => {
    const dial = dialRef.current!
    const cards: HTMLDivElement[] = []
    for (let j = 0; j < SPAN * 2 + 2; j++) {
      const c = document.createElement('div')
      c.className = 'jev-card'
      c.setAttribute('role', 'option')
      dial.appendChild(c)
      cards.push(c)
    }

    let list: Match[] = []
    let pos = 0
    let target = 0
    let raf = 0
    let settleTimer = 0
    let settledAt = 0
    let wheelAcc = 0
    let drag: { y: number; p: number; t: number; v: number; ly: number; moved: boolean } | null = null
    const reduce = prefersReducedMotion()
    const wrap = (i: number) => ((i % list.length) + list.length) % list.length

    const fill = (c: HTMLDivElement, i: number) => {
      const { passage: p, score } = list[i]
      const rk = document.createElement('span')
      rk.className = 'jev-rk'
      rk.textContent = String(i + 1)
      const rt = document.createElement('span')
      rt.className = 'jev-rt'
      const b = document.createElement('b')
      b.textContent = `${ROMAN[p.book]}.${p.section}`
      rt.append(b, p.text.slice(0, 140))
      c.replaceChildren(rk, rt, scoreNode(score))
      c.dataset.i = String(i)
    }

    const draw = () => {
      const base = Math.floor(pos)
      cards.forEach((c, j) => {
        const v = base + j - SPAN
        const off = v - pos
        if (!list.length || Math.abs(off) > SPAN + 0.5) {
          c.style.visibility = 'hidden'
          return
        }
        const i = wrap(v)
        if (c.dataset.i !== String(i)) fill(c, i)
        const a = off * STEP
        c.style.visibility = 'visible'
        c.style.transform = `rotateX(${-a}deg)`
        c.style.opacity = String(Math.max(0, Math.cos((a * Math.PI) / 180)) ** 1.5)
        const centre = Math.abs(off) < 0.5
        c.classList.toggle('center', centre)
        c.setAttribute('aria-selected', String(centre))
      })
    }

    const settled = () => {
      window.clearTimeout(settleTimer)
      settleTimer = window.setTimeout(() => {
        if (!list.length) return
        const i = wrap(Math.round(pos))
        if (i !== settledAt) {
          settledAt = i
          onSettleRef.current(i)
        }
      }, 60)
    }

    const tick = () => {
      const d = target - pos
      if (reduce || Math.abs(d) < 0.002) {
        pos = target
        draw()
        raf = 0
        settled()
        return
      }
      pos += d * 0.2
      draw()
      raf = requestAnimationFrame(tick)
    }

    const goTo = (v: number) => {
      if (!list.length) return
      target = v
      if (!raf) raf = requestAnimationFrame(tick)
    }

    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      wheelAcc += e.deltaY
      const n = Math.trunc(wheelAcc / WHEEL_STEP)
      if (n) {
        wheelAcc -= n * WHEEL_STEP
        goTo(target + n)
      }
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') goTo(target + 1)
      else if (e.key === 'ArrowUp') goTo(target - 1)
      else if (e.key === 'Home') goTo(Math.round(pos) - wrap(Math.round(pos)))
      else return
      e.preventDefault()
    }
    const onDown = (e: PointerEvent) => {
      if (!list.length) return
      drag = { y: e.clientY, p: pos, t: performance.now(), v: 0, ly: e.clientY, moved: false }
      dial.setPointerCapture(e.pointerId)
      cancelAnimationFrame(raf)
      raf = 0
    }
    const onMove = (e: PointerEvent) => {
      if (!drag) return
      const now = performance.now()
      const dy = e.clientY - drag.y
      if (Math.abs(dy) > 3) drag.moved = true
      drag.v = (e.clientY - drag.ly) / Math.max(1, now - drag.t)
      drag.ly = e.clientY
      drag.t = now
      pos = drag.p - dy / ROW_H
      target = pos
      draw()
    }
    const onUp = (e: PointerEvent) => {
      if (!drag) return
      const d = drag
      drag = null
      if (!d.moved) {
        const r = dial.getBoundingClientRect()
        goTo(Math.round(pos) + Math.round((e.clientY - r.top - LENS_TOP - ROW_H / 2) / ROW_H))
        return
      }
      goTo(Math.round(pos - (d.v * 120) / ROW_H))
    }

    dial.addEventListener('wheel', onWheel, { passive: false })
    dial.addEventListener('keydown', onKey)
    dial.addEventListener('pointerdown', onDown)
    dial.addEventListener('pointermove', onMove)
    dial.addEventListener('pointerup', onUp)
    dial.addEventListener('pointercancel', onUp)

    api.current = {
      reset(m) {
        list = m
        cancelAnimationFrame(raf)
        raf = 0
        pos = target = 0
        settledAt = 0
        cards.forEach(c => (c.dataset.i = ''))
        draw()
      },
    }

    return () => {
      cancelAnimationFrame(raf)
      window.clearTimeout(settleTimer)
      dial.removeEventListener('wheel', onWheel)
      dial.removeEventListener('keydown', onKey)
      dial.removeEventListener('pointerdown', onDown)
      dial.removeEventListener('pointermove', onMove)
      dial.removeEventListener('pointerup', onUp)
      dial.removeEventListener('pointercancel', onUp)
      cards.forEach(c => c.remove())
      api.current = null
    }
  }, [])

  useEffect(() => api.current?.reset(matches), [matches])

  return (
    <div className="jev-dial" ref={dialRef} tabIndex={0} role="listbox" aria-label="Ranked passages">
      <div className="jev-lens" />
    </div>
  )
}

async function* readEvents(res: Response) {
  const reader = res.body!.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  for (;;) {
    const { done, value } = await reader.read()
    if (value) buffer += decoder.decode(value, { stream: true })
    let nl
    while ((nl = buffer.indexOf('\n')) >= 0) {
      const line = buffer.slice(0, nl).trim()
      buffer = buffer.slice(nl + 1)
      if (line) yield JSON.parse(line) as MatchEvent
    }
    if (done) return
  }
}

export function JevitationsContent() {
  const [quote, setQuote] = useState('')
  const [persona, setPersona] = useState(PERSONAS[0])
  const [menuOpen, setMenuOpen] = useState(false)
  const [running, setRunning] = useState(false)
  const [pips, setPips] = useState<boolean[]>([])
  const [matches, setMatches] = useState<Match[]>([])
  const [featured, setFeatured] = useState({ index: 0, animate: false })
  const [error, setError] = useState<string | null>(null)
  const runningRef = useRef(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const run = useCallback(async (text: string) => {
    if (runningRef.current) return
    runningRef.current = true
    setRunning(true)
    setPips([])
    try {
      const [res, corpus] = await Promise.all([
        fetch('/api/jev/match', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ quote: text, persona: persona.id }),
        }),
        loadCorpus(),
      ])
      if (!res.ok || !res.body) {
        const body = await res.json().catch(() => null)
        throw new Error(body?.message || UNREACHABLE)
      }
      let lit: boolean[] = []
      for await (const e of readEvents(res)) {
        if (e.type === 'start') {
          lit = new Array(e.batches).fill(false)
          setPips(lit)
        } else if (e.type === 'batch' && e.ok) {
          lit = lit.map((on, i) => on || i === e.index)
          setPips(lit)
        } else if (e.type === 'done') {
          const ranked = e.ranked.flatMap(r => {
            const passage = corpus.get(r.id)
            return passage ? [{ passage, score: r.score }] : []
          })
          if (!ranked.length) throw new Error(UNREACHABLE)
          setError(null)
          setMatches(ranked)
          setFeatured({ index: 0, animate: true })
        }
      }
    } catch (err) {
      setError(err instanceof Error && err.message !== 'Failed to fetch' ? err.message : UNREACHABLE)
    } finally {
      runningRef.current = false
      setRunning(false)
      setPips([])
    }
  }, [persona])

  useEffect(() => {
    run(PLACEHOLDER)
  }, [run])

  useEffect(() => {
    if (!menuOpen) return
    const close = () => setMenuOpen(false)
    document.addEventListener('click', close)
    return () => document.removeEventListener('click', close)
  }, [menuOpen])

  const onSettle = useCallback((index: number) => setFeatured({ index, animate: false }), [])
  const current = matches[featured.index] ?? null

  return (
    <div className={`jev${running ? ' busy' : ''}`}>
      <form
        className="jev-search"
        autoComplete="off"
        onSubmit={e => {
          e.preventDefault()
          inputRef.current?.blur()
          run(quote.trim() || PLACEHOLDER)
        }}
      >
        <label className="jev-sbox">
          <svg width="13" height="13" viewBox="0 0 13 13" aria-hidden="true">
            <circle cx="5" cy="5" r="3.5" fill="none" stroke="#000" strokeWidth="1.5" />
            <path d="M7.6 7.6l4 4" stroke="#000" strokeWidth="2" />
          </svg>
          <input
            ref={inputRef}
            type="search"
            maxLength={400}
            placeholder={PLACEHOLDER}
            aria-label="Your quote"
            enterKeyHint="search"
            value={quote}
            onChange={e => setQuote(e.target.value)}
          />
          <span className="jev-pips" aria-hidden="true">
            {pips.map((on, i) => <i key={i} className={`jev-pip${on ? ' on' : ''}`} />)}
          </span>
        </label>
        <div className="jev-persona">
          <button
            className="jev-persona-btn"
            type="button"
            aria-haspopup="true"
            aria-expanded={menuOpen}
            onClick={e => {
              e.stopPropagation()
              setMenuOpen(o => !o)
            }}
          >
            <Bust beard={persona.beard} />
            <span className="jev-persona-name">{persona.name}</span>
            <i className="jev-tri" />
          </button>
          {menuOpen && (
            <div className="jev-menu" role="menu">
              {PERSONAS.map(p => (
                <button key={p.id} type="button" role="menuitem" disabled={!p.ready} onClick={() => setPersona(p)}>
                  <span className="jev-tick">{p.id === persona.id ? '✓' : ''}</span>
                  <Bust beard={p.beard} />
                  {p.name}
                  {!p.ready && ' (soon)'}
                </button>
              ))}
            </div>
          )}
        </div>
      </form>
      <Featured match={current} rank={featured.index} animate={featured.animate} error={error} />
      <Dial matches={matches} onSettle={onSettle} />
    </div>
  )
}
