import React, { useState, useEffect, useRef, useCallback } from 'react'
import useEmblaCarousel from 'embla-carousel-react'
import { DownloadIcon } from './icons'
import { PROJECTS, type ProjectEntry, type ProjectMedia } from './projects'

/* =============================================================================
   TYPED PAGE WRAPPER
   Provides typewriter animation for content pages.
   ============================================================================= */

const animatedPages = new Set<string>()

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

function processNode(node: React.ReactNode, remaining: number): [React.ReactNode, number] {
  if (remaining <= 0) return [null, 0]
  if (node == null || typeof node === 'boolean') return [node, remaining]

  if (typeof node === 'string') {
    if (node.length <= remaining) return [node, remaining - node.length]
    return [node.slice(0, remaining), 0]
  }

  if (typeof node === 'number') {
    const str = String(node)
    if (str.length <= remaining) return [node, remaining - str.length]
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
    if (children == null) return [node, remaining]
    const [processedChildren, left] = processNode(children, remaining)
    return [React.cloneElement(node, props, processedChildren), left]
  }

  return [node, remaining]
}

function TypedPage({ children, speed = 12, pageId }: { children: React.ReactNode; speed?: number; pageId: string }) {
  const skip = useRef(animatedPages.has(pageId))
  const [charCount, setCharCount] = useState(0)
  const totalChars = countChars(children)
  const done = skip.current || charCount >= totalChars

  useEffect(() => {
    animatedPages.add(pageId)
  }, [pageId])

  useEffect(() => {
    if (skip.current || done) return
    const timer = setInterval(() => setCharCount(c => c + 1), speed)
    return () => clearInterval(timer)
  }, [speed, done])

  if (skip.current) {
    return <div className="zackos-page">{children}</div>
  }

  const [processed] = processNode(children, charCount)
  return (
    <div className="zackos-page">
      {processed}
      {!done && <span className="zackos-cursor">|</span>}
    </div>
  )
}

function ProjectMediaFrame({
  media,
  isActive,
  setVideoRef,
  priority = false,
}: {
  media: ProjectMedia
  isActive: boolean
  setVideoRef?: (node: HTMLVideoElement | null) => void
  priority?: boolean
}) {
  return (
    <div className="zackos-project-media-frame">
      {media.type === 'video' ? (
        <video
          ref={setVideoRef}
          className="zackos-project-media"
          controls
          playsInline
          preload={isActive ? 'metadata' : 'none'}
          poster={media.poster}
        >
          <source src={media.src} />
        </video>
      ) : (
        <img
          src={media.src}
          alt={media.alt}
          className="zackos-project-media"
          loading={priority ? 'eager' : 'lazy'}
        />
      )}
    </div>
  )
}

function ProjectCarousel({ project }: { project: ProjectEntry }) {
  const mediaCount = project.media.length
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [canScrollPrev, setCanScrollPrev] = useState(false)
  const [canScrollNext, setCanScrollNext] = useState(mediaCount > 1)
  const [emblaRef, emblaApi] = useEmblaCarousel({
    align: 'center',
    containScroll: 'trimSnaps',
    loop: false,
  })
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([])

  const pauseInactiveVideos = useCallback((activeIndex: number) => {
    videoRefs.current.forEach((video, index) => {
      if (!video || index === activeIndex) return
      video.pause()
    })
  }, [])

  const updateCarouselState = useCallback(() => {
    if (!emblaApi) return
    const nextIndex = emblaApi.selectedScrollSnap()
    setSelectedIndex(nextIndex)
    setCanScrollPrev(emblaApi.canScrollPrev())
    setCanScrollNext(emblaApi.canScrollNext())
    pauseInactiveVideos(nextIndex)
  }, [emblaApi, pauseInactiveVideos])

  useEffect(() => {
    if (!emblaApi) return
    updateCarouselState()
    emblaApi.on('select', updateCarouselState)
    emblaApi.on('reInit', updateCarouselState)

    return () => {
      emblaApi.off('select', updateCarouselState)
      emblaApi.off('reInit', updateCarouselState)
    }
  }, [emblaApi, updateCarouselState])

  const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi])
  const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi])

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
    if (mediaCount < 2) return
    if (e.key === 'ArrowLeft') {
      e.preventDefault()
      scrollPrev()
    }
    if (e.key === 'ArrowRight') {
      e.preventDefault()
      scrollNext()
    }
  }, [mediaCount, scrollPrev, scrollNext])

  if (mediaCount === 1) {
    const singleMedia = project.media[0]
    return (
      <section className="zackos-project-carousel" aria-label={`${project.title} media`}>
        <div className="zackos-project-stage zackos-project-stage-single">
          <ProjectMediaFrame media={singleMedia} isActive priority />
        </div>
      </section>
    )
  }

  return (
    <section className="zackos-project-carousel" aria-label={`${project.title} media`}>
      <div className="zackos-project-stage" onKeyDown={handleKeyDown} tabIndex={0}>
        <button
          type="button"
          className="zackos-project-carousel-btn"
          onClick={scrollPrev}
          disabled={!canScrollPrev}
          aria-label="Previous slide"
        >
          ←
        </button>
        <div className="zackos-project-embla" ref={emblaRef}>
          <div className="zackos-project-embla-container">
            {project.media.map((media, index) => (
              <div
                className={`zackos-project-embla-slide ${index === selectedIndex ? 'is-selected' : ''}`}
                key={`${project.slug}-${media.src}`}
              >
                <ProjectMediaFrame
                  media={media}
                  isActive={index === selectedIndex}
                  setVideoRef={(node) => {
                    videoRefs.current[index] = node
                  }}
                  priority={index === 0}
                />
              </div>
            ))}
          </div>
        </div>
        <button
          type="button"
          className="zackos-project-carousel-btn"
          onClick={scrollNext}
          disabled={!canScrollNext}
          aria-label="Next slide"
        >
          →
        </button>
      </div>

      <div className="zackos-project-carousel-footer">
        <p className="zackos-project-counter">
          {selectedIndex + 1} / {mediaCount}
        </p>
      </div>
    </section>
  )
}

function ProjectsIndex({ onOpenProject }: { onOpenProject: (slug: string) => void }) {
  return (
    <TypedPage pageId="projects">
      <div className="zackos-projects-index">
        <div className="zackos-page-section">
          <h1 className="zackos-page-title">Projects</h1>
        </div>

        <div className="zackos-projects-list">
          {PROJECTS.map((project) => (
            <button
              type="button"
              key={project.slug}
              className="zackos-project-card"
              onClick={() => onOpenProject(project.slug)}
            >
              <div className="zackos-project-card-thumb-wrap" aria-hidden="true">
                <img
                  src={project.media[0]?.src}
                  alt=""
                  className="zackos-project-card-thumb"
                  loading="lazy"
                />
              </div>
              <div className="zackos-project-card-copy">
                <div className="zackos-project-card-header">
                  <h2 className="zackos-project-title">{project.title}</h2>
                  {project.year && <span className="zackos-project-card-year">{project.year}</span>}
                </div>
                <p className="zackos-project-card-subtitle">{project.subtitle}</p>
                <div className="zackos-project-card-meta">
                  {project.platform && <span>{project.platform}</span>}
                  {project.role && <span>{project.role}</span>}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </TypedPage>
  )
}

function ProjectDetail({ project, onBack }: { project: ProjectEntry; onBack: () => void }) {
  const detailMeta = [project.year, project.platform, project.role].filter(Boolean)

  return (
    <div className="zackos-project-detail">
      <div className="zackos-project-detail-header">
        <button type="button" className="zackos-project-back" onClick={onBack}>
          ← Projects
        </button>
        <div className="zackos-project-detail-heading">
          <h1 className="zackos-page-title zackos-project-detail-title">{project.title}</h1>
          <p className="zackos-page-subtitle zackos-project-detail-subtitle">{project.subtitle}</p>
          {detailMeta.length > 0 && (
            <div className="zackos-project-detail-meta" aria-label="Project metadata">
              {detailMeta.map((item) => (
                <span key={item}>{item}</span>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="zackos-project-detail-scroll">
        <ProjectCarousel project={project} />

        <section className="zackos-project-copy-section">
          <h2 className="zackos-page-heading">Overview</h2>
          {project.description.map((paragraph) => (
            <p key={paragraph} className="zackos-page-text">
              {paragraph}
            </p>
          ))}
        </section>

        {project.links.length > 0 && (
          <section className="zackos-project-copy-section">
            <h2 className="zackos-page-heading">Links</h2>
            <ul className="zackos-page-links">
              {project.links.map((link) => (
                <li key={link.href}>
                  <a href={link.href} target="_blank" rel="noopener noreferrer">
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  )
}

/* =============================================================================
   ABOUT CONTENT
   Edit your bio, links, and info here.
   ============================================================================= */

export function AboutContent() {
  return (
    <TypedPage pageId="about">
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
  const [selectedProjectSlug, setSelectedProjectSlug] = useState<string | null>(null)
  const selectedProject = PROJECTS.find((project) => project.slug === selectedProjectSlug) || null

  if (selectedProject) {
    return <ProjectDetail project={selectedProject} onBack={() => setSelectedProjectSlug(null)} />
  }

  return <ProjectsIndex onOpenProject={setSelectedProjectSlug} />
}

/* =============================================================================
   FTNS CONTENT
   App info and privacy policy for your ftns app.
   ============================================================================= */

export function FtnsContent() {
  return (
    <TypedPage pageId="ftns">
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
   NOSLOP CONTENT
   Manifesto on the slop era.
   ============================================================================= */

export function NoslopContent() {
  return (
    <TypedPage pageId="noslop">
      <h1 className="zackos-page-title">NOSLOP.</h1>
      
      <div className="zackos-page-section">
        <p className="zackos-page-text">
          {/* Write your manifesto here */}
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
