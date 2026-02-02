import React, { useState, useEffect, useRef, useCallback } from 'react'
import { DownloadIcon } from './icons'

/* =============================================================================
   TYPED PAGE WRAPPER
   Provides typewriter animation for content pages.
   ============================================================================= */

function TypedPage({ children, speed = 12 }: { children: React.ReactNode; speed?: number }) {
  const [charCount, setCharCount] = useState(0)
  const [isComplete, setIsComplete] = useState(false)

  useEffect(() => {
    if (isComplete) return
    const timer = setInterval(() => {
      setCharCount(c => c + 1)
    }, speed)
    return () => clearInterval(timer)
  }, [speed, isComplete])

  // Count total characters in tree
  function countChars(node: React.ReactNode): number {
    if (node == null || typeof node === 'boolean') return 0
    if (typeof node === 'string') return node.length
    if (typeof node === 'number') return String(node).length
    if (Array.isArray(node)) return node.reduce((sum, n) => sum + countChars(n), 0)
    if (React.isValidElement(node) && node.props.children) {
      return countChars(node.props.children)
    }
    return 0
  }

  // Recursively process nodes, limiting visible characters
  function processNode(node: React.ReactNode, remaining: number): [React.ReactNode, number] {
    if (remaining <= 0) return [null, 0]
    if (node == null || typeof node === 'boolean') return [node, remaining]
    
    if (typeof node === 'string') {
      if (node.length <= remaining) {
        return [node, remaining - node.length]
      }
      return [node.slice(0, remaining), 0]
    }
    
    if (typeof node === 'number') {
      const str = String(node)
      if (str.length <= remaining) {
        return [node, remaining - str.length]
      }
      return [str.slice(0, remaining), 0]
    }
    
    if (Array.isArray(node)) {
      const result: React.ReactNode[] = []
      let left = remaining
      for (let i = 0; i < node.length && left > 0; i++) {
        const [processed, newLeft] = processNode(node[i], left)
        if (processed != null) result.push(processed)
        left = newLeft
      }
      return [result, left]
    }
    
    if (React.isValidElement(node)) {
      const { children, ...props } = node.props
      if (children == null) {
        return [node, remaining]
      }
      const [processedChildren, left] = processNode(children, remaining)
      return [React.cloneElement(node, props, processedChildren), left]
    }
    
    return [node, remaining]
  }

  const totalChars = countChars(children)
  
  useEffect(() => {
    if (charCount >= totalChars) {
      setIsComplete(true)
    }
  }, [charCount, totalChars])

  const [processed] = processNode(children, charCount)
  
  return (
    <div className="zackos-page">
      {processed}
      {!isComplete && <span className="zackos-cursor">|</span>}
    </div>
  )
}

/* =============================================================================
   ABOUT CONTENT
   Edit your bio, links, and info here.
   ============================================================================= */

export function AboutContent() {
  return (
    <TypedPage>
      {/* PROFILE SECTION */}
      <div className="zackos-page-section">
        {/* Uncomment and add your photo:
        <img 
          src="/your-photo.jpg" 
          alt="Zachariya Ibrahim" 
          className="zackos-profile-photo"
        />
        */}
        <h1 className="zackos-page-title">Zachariya Ibrahim</h1>
        <p className="zackos-page-subtitle">
          {/* Your tagline or role */}
          Product Manager
        </p>
      </div>

      {/* BIO SECTION */}
      <div className="zackos-page-section">
        <p className="zackos-page-text">
          {/* Write your bio here */}
          Welcome to my personal site, zackOS. This is where I publish projects and maintain my portfolio. App icons are draggable, windows are resizable, and all thoughts are my own. Feel free to look around, use some of the high-tech apps (notepad), and make zackOS your own. 
        </p>
      </div>

      {/* LINKS SECTION */}
      <div className="zackos-page-section">
        <h2 className="zackos-page-heading">Links</h2>
        <ul className="zackos-page-links">
          <li>
            <a href="https://github.com/zackazicko" target="_blank" rel="noopener noreferrer">
              GitHub
            </a>
          </li>
          <li>
            <a href="https://www.linkedin.com/in/zachariya-ibrahim-4a14a7262/" target="_blank" rel="noopener noreferrer">
              LinkedIn
            </a>
          </li>
          <li>
            <a href="mailto:zachariyaibrahim@gmail.com">
              Email
            </a>
          </li>
          {/* Add more links as needed */}
        </ul>
      </div>
    </TypedPage>
  )
}

/* =============================================================================
   PROJECTS CONTENT
   Add your projects here. Each project can have an image, title, description, and link.
   ============================================================================= */

export function ProjectsContent() {
  return (
    <TypedPage>
      <h1 className="zackos-page-title">Projects</h1>
      
      {/* PROJECT 1 */}
      <div className="zackos-project">
        {/* Uncomment to add project image:
        <img 
          src="/project1.jpg" 
          alt="Project Name" 
          className="zackos-project-image"
        />
        */}
        <h2 className="zackos-project-title">ftns.</h2>
        <p className="zackos-page-text">
          ftns. is a fitness tracking app that aims to simplify workout entry and tracking. It distills the experience of a "fitness" tracker app" into the simplest form possible. Download it via the link belowand give me some feedback. 
          I built this app with deep focus on the user experience; removing every unnecessary click and friction between the user and the end goal of tracking exercises. It is built to be easier than logging a workout into your notes app, but provide historical data and insights to enable you to see progress and continuously improve. ftns. solves a very specific painpoint I have exprienced in my years at the gym, I do not want to carry around a notebook and pen (too analog), I do not want an AI slop workout app (don't tell me what to lift today), and I do not want to put workouts into my notes app (no insights over time). 
        </p>
        <a 
          href="https://apps.apple.com/us/app/ftns/id6756637536" 
          target="_blank" 
          rel="noopener noreferrer"
          className="zackos-project-link"
        >
          App Store Link
        </a>
      </div>


    </TypedPage>
  )
}

/* =============================================================================
   FTNS CONTENT
   App info and privacy policy for your ftns app.
   ============================================================================= */

export function FtnsContent() {
  return (
    <TypedPage>
      <h1 className="zackos-page-title">ftns.</h1>
      
      <div className="zackos-page-section">
        <p className="zackos-page-text">
          ftns. is a workout tracking app available on the App Store.
        </p>
      </div>

      <div className="zackos-page-section">
        <h2 className="zackos-page-heading">Privacy Policy</h2>
        <p className="zackos-page-text">
          <a href="https://zachariyaibrahim.com/ftns/privacy" target="_blank" rel="noopener noreferrer">
            View Privacy Policy
          </a>
        </p>
      </div>

      <div className="zackos-page-section">
        <h2 className="zackos-page-heading">Contact</h2>
        <p className="zackos-page-text">
          For questions about ftns., contact: <a href="mailto:zachariyaibrahim@gmail.com">zachariyaibrahim@gmail.com</a>
        </p>
      </div>
    </TypedPage>
  )
}

/* =============================================================================
   NOTEPAD & SKETCHPAD (existing apps)
   ============================================================================= */

const NOTEPAD_KEY = 'zackos:notepad'
const SKETCHPAD_KEY = 'zackos:sketchpad'

function getDateString() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function NotepadContent() {
  const [text, setText] = useState(() => {
    try {
      return localStorage.getItem(NOTEPAD_KEY) || ''
    } catch {
      return ''
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem(NOTEPAD_KEY, text)
    } catch {
      // ignore
    }
  }, [text])

  const handleDownload = () => {
    const blob = new Blob([text], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `zackos_notes_${getDateString()}.md`
    a.click()
    URL.revokeObjectURL(url)
  }

  // Word and character counts
  const charCount = text.length
  const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0

  return (
    <div className="zackos-notepad">
      <div className="zackos-notepad-toolbar">
        <span className="zackos-notepad-stats">{wordCount} words, {charCount} chars</span>
        <button className="zackos-toolbar-btn" onClick={handleDownload} title="Download as .md">
          <DownloadIcon />
        </button>
      </div>
      <textarea
        className="zackos-notepad-textarea"
        value={text}
        onChange={e => setText(e.target.value)}
        placeholder="Type your notes here..."
      />
    </div>
  )
}

const COLORS = ['#000000', '#ff0000', '#00aa00', '#0000ff', '#ff8800']
const PEN_WIDTH = 3
const MAX_UNDO_STATES = 10

export function SketchpadContent() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [color, setColor] = useState(COLORS[0])
  const [isEraser, setIsEraser] = useState(false)
  const [isDrawing, setIsDrawing] = useState(false)
  const lastPos = useRef<{ x: number; y: number } | null>(null)
  const undoStack = useRef<ImageData[]>([])

  // Restore from localStorage on mount
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    try {
      const saved = localStorage.getItem(SKETCHPAD_KEY)
      if (saved) {
        const img = new Image()
        img.onload = () => {
          ctx.drawImage(img, 0, 0)
        }
        img.src = saved
      }
    } catch {
      // ignore
    }
  }, [])

  // Save to localStorage on changes
  const saveCanvas = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    try {
      localStorage.setItem(SKETCHPAD_KEY, canvas.toDataURL())
    } catch {
      // ignore
    }
  }, [])

  // Resize canvas to fit container
  useEffect(() => {
    const container = containerRef.current
    const canvas = canvasRef.current
    if (!container || !canvas) return

    const resizeObserver = new ResizeObserver(() => {
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      
      // Save current drawing
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
      
      // Resize
      canvas.width = container.clientWidth
      canvas.height = container.clientHeight
      
      // Fill white
      ctx.fillStyle = '#fff'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      
      // Restore drawing
      ctx.putImageData(imageData, 0, 0)
    })

    resizeObserver.observe(container)
    
    // Initial size
    canvas.width = container.clientWidth
    canvas.height = container.clientHeight
    const ctx = canvas.getContext('2d')
    if (ctx) {
      ctx.fillStyle = '#fff'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      
      // Try to restore saved drawing
      try {
        const saved = localStorage.getItem(SKETCHPAD_KEY)
        if (saved) {
          const img = new Image()
          img.onload = () => {
            ctx.drawImage(img, 0, 0)
          }
          img.src = saved
        }
      } catch {
        // ignore
      }
    }

    return () => resizeObserver.disconnect()
  }, [])

  const getPos = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    const rect = canvas.getBoundingClientRect()
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    }
  }

  const saveUndoState = useCallback(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!ctx || !canvas) return
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
    undoStack.current = [...undoStack.current.slice(-(MAX_UNDO_STATES - 1)), imageData]
  }, [])

  const handleUndo = useCallback(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!ctx || !canvas || undoStack.current.length === 0) return
    const lastState = undoStack.current.pop()
    if (lastState) {
      ctx.putImageData(lastState, 0, 0)
      saveCanvas()
    }
  }, [saveCanvas])

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    saveUndoState()
    e.currentTarget.setPointerCapture(e.pointerId)
    setIsDrawing(true)
    lastPos.current = getPos(e)
  }

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !lastPos.current) return
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!ctx) return

    const pos = getPos(e)
    ctx.beginPath()
    ctx.strokeStyle = isEraser ? '#ffffff' : color
    ctx.lineWidth = isEraser ? PEN_WIDTH * 4 : PEN_WIDTH
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.moveTo(lastPos.current.x, lastPos.current.y)
    ctx.lineTo(pos.x, pos.y)
    ctx.stroke()
    lastPos.current = pos
  }

  const handlePointerUp = () => {
    setIsDrawing(false)
    lastPos.current = null
    saveCanvas()
  }

  const handleDownload = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    canvas.toBlob(blob => {
      if (!blob) return
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `zackos_draw_${getDateString()}.png`
      a.click()
      URL.revokeObjectURL(url)
    }, 'image/png')
  }

  const handleClear = () => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!ctx || !canvas) return
    saveUndoState()
    ctx.fillStyle = '#fff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    saveCanvas()
  }

  return (
    <div className="zackos-sketchpad">
      <div className="zackos-sketchpad-toolbar">
        {COLORS.map(c => (
          <button
            key={c}
            className={`zackos-color-btn ${color === c && !isEraser ? 'selected' : ''}`}
            style={{ backgroundColor: c }}
            onClick={() => { setColor(c); setIsEraser(false) }}
            title={c}
          />
        ))}
        <button
          className={`zackos-toolbar-btn ${isEraser ? 'selected' : ''}`}
          onClick={() => setIsEraser(!isEraser)}
          title="Eraser"
        >
          Eraser
        </button>
        <button className="zackos-toolbar-btn" onClick={handleUndo} title="Undo">
          Undo
        </button>
        <button className="zackos-toolbar-btn" onClick={handleClear} title="Clear">
          Clear
        </button>
        <button className="zackos-toolbar-btn" onClick={handleDownload} title="Download as PNG">
          <DownloadIcon />
        </button>
      </div>
      <div className="zackos-sketchpad-canvas-container" ref={containerRef}>
        <canvas
          ref={canvasRef}
          className="zackos-sketchpad-canvas"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
        />
      </div>
    </div>
  )
}
