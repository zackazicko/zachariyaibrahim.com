import { useState, useCallback, useRef, useEffect } from 'react'
import type { AppId, WindowState, DesktopIcon, IconPosition } from './types'
import { PersonIcon, FolderIcon, AppIcon, NotepadIcon, SketchpadIcon, GermIcon, TimerIcon } from './icons'
import { Window } from './Window'
import { BootScreen } from './BootScreen'

const MOBILE_BREAKPOINT = 640
const MENUBAR_HEIGHT = 22
const INTRO_ICON_CURSOR_X = 30
const INTRO_ICON_CURSOR_Y = 24

interface WindowPlacement {
  x?: number
  y?: number
  width?: number
  height?: number
  isMaximized?: boolean
  animateOpen?: boolean
}

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(() => 
    typeof window !== 'undefined' && window.innerWidth <= MOBILE_BREAKPOINT
  )
  
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= MOBILE_BREAKPOINT)
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])
  
  return isMobile
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function getAutoLaunchWindowPlacements() {
  if (typeof window === 'undefined') {
    return {
      about: { x: 120, y: 120, width: 400, height: 320 },
      projects: { x: 460, y: 84, width: 760, height: 560 },
    }
  }

  const viewportWidth = window.innerWidth
  const viewportHeight = window.innerHeight
  const overlap = clamp(Math.round(viewportWidth * 0.055), 56, 96)
  let aboutWidth = clamp(Math.round(viewportWidth * 0.3), 360, 440)
  let projectsWidth = clamp(Math.round(viewportWidth * 0.56), 620, 860)
  const usableWidth = Math.max(560, viewportWidth - 96)
  const totalWidth = aboutWidth + projectsWidth - overlap

  if (totalWidth > usableWidth) {
    const overflow = totalWidth - usableWidth
    const projectsShrink = Math.min(overflow, projectsWidth - 560)
    projectsWidth -= projectsShrink
    aboutWidth -= Math.min(overflow - projectsShrink, aboutWidth - 320)
  }

  const aboutHeight = clamp(Math.round(viewportHeight * 0.42), 300, 360)
  const projectsHeight = clamp(Math.round(viewportHeight * 0.7), 500, 600)
  const fittedWidth = aboutWidth + projectsWidth - overlap
  const left = Math.max(32, Math.round((viewportWidth - fittedWidth) / 2))
  const projectsY = clamp(
    Math.round((viewportHeight - projectsHeight) / 2) + 6,
    MENUBAR_HEIGHT + 18,
    Math.max(MENUBAR_HEIGHT + 18, viewportHeight - projectsHeight - 36)
  )
  const aboutY = clamp(
    projectsY + 54,
    MENUBAR_HEIGHT + 42,
    Math.max(MENUBAR_HEIGHT + 42, viewportHeight - aboutHeight - 36)
  )

  return {
    about: { x: left, y: aboutY, width: aboutWidth, height: aboutHeight },
    projects: {
      x: left + aboutWidth - overlap,
      y: projectsY,
      width: projectsWidth,
      height: projectsHeight,
    },
  }
}

const ICONS: DesktopIcon[] = [
  { id: 'about', label: 'zachariyaibrahim.about', icon: 'person' },
  { id: 'projects', label: 'projects', icon: 'folder' },
  { id: 'ftns', label: 'ftns', icon: 'app' },
  { id: 'noslop', label: 'NOSLOP.', icon: 'germ' },
  { id: 'notepad', label: 'notepad', icon: 'notepad' },
  { id: 'sketchpad', label: 'sketchpad', icon: 'sketchpad' },
  { id: 'pomodoro', label: 'pomodoro', icon: 'timer' },
]

const WINDOW_TITLES: Record<AppId, string> = {
  about: 'About',
  projects: 'Projects',
  ftns: 'ftns',
  noslop: 'NOSLOP.',
  notepad: 'Notepad',
  sketchpad: 'Sketchpad',
  pomodoro: 'Pomodoro',
}

const WINDOW_SIZES: Record<AppId, { width: number; height: number }> = {
  about: { width: 400, height: 300 },
  projects: { width: 800, height: 580 },
  ftns: { width: 400, height: 300 },
  noslop: { width: 500, height: 400 },
  notepad: { width: 480, height: 400 },
  sketchpad: { width: 560, height: 450 },
  pomodoro: { width: 300, height: 360 },
}

function getDefaultIconPositions(): Record<AppId, IconPosition> {
  const positions: Record<string, IconPosition> = {}
  ICONS.forEach((icon, i) => {
    positions[icon.id] = { x: 16, y: 32 + i * 80 } // Account for menubar height
  })
  return positions as Record<AppId, IconPosition>
}

function getIcon(type: DesktopIcon['icon']) {
  switch (type) {
    case 'person': return <PersonIcon />
    case 'folder': return <FolderIcon />
    case 'app': return <AppIcon />
    case 'notepad': return <NotepadIcon />
    case 'sketchpad': return <SketchpadIcon />
    case 'germ': return <GermIcon />
    case 'timer': return <TimerIcon />
  }
}

let windowIdCounter = 0
let topZIndex = 1

function MenuBar() {
  const [time, setTime] = useState(() => {
    const now = new Date()
    return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
  })

  useEffect(() => {
    const updateTime = () => {
      const now = new Date()
      setTime(`${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`)
    }
    const interval = setInterval(updateTime, 1000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="zackos-menubar">
      <span className="zackos-menubar-brand">zackOS</span>
      <span className="zackos-menubar-clock">{time}</span>
    </div>
  )
}

export function Desktop() {
  const isMobile = useIsMobile()
  const [isBooting, setIsBooting] = useState(true)
  const [windows, setWindows] = useState<WindowState[]>([])
  const [iconPositions, setIconPositions] = useState<Record<AppId, IconPosition>>(getDefaultIconPositions)
  const [selectedIcon, setSelectedIcon] = useState<AppId | null>(null)
  const [introTarget, setIntroTarget] = useState<AppId | null>(null)
  const [introPulse, setIntroPulse] = useState<{ appId: AppId; key: number } | null>(null)
  const [introCursor, setIntroCursor] = useState<{ x: number; y: number; clicking: boolean } | null>(null)
  
  const lastClickRef = useRef<{ time: number; target: AppId | null }>({ time: 0, target: null })
  const dragIconRef = useRef<{ id: AppId; startX: number; startY: number; iconStartX: number; iconStartY: number; moved: boolean } | null>(null)
  const introTimeoutsRef = useRef<number[]>([])
  const introPulseKeyRef = useRef(0)
  const introHasPlayedRef = useRef(false)
  const introIsRunningRef = useRef(false)
  const windowAnimationTimeoutsRef = useRef<number[]>([])

  const clearIntroTimeouts = useCallback(() => {
    introTimeoutsRef.current.forEach(window.clearTimeout)
    introTimeoutsRef.current = []
  }, [])

  const clearWindowAnimationTimeouts = useCallback(() => {
    windowAnimationTimeoutsRef.current.forEach(window.clearTimeout)
    windowAnimationTimeoutsRef.current = []
  }, [])

  const clearIntroVisuals = useCallback(() => {
    setIntroTarget(null)
    setIntroPulse(null)
    setIntroCursor(null)
  }, [])

  const openWindow = useCallback((appId: AppId, placement?: WindowPlacement) => {
    windowIdCounter++
    topZIndex++
    const offset = (windowIdCounter % 5) * 30
    const size = WINDOW_SIZES[appId]
    const windowId = `win-${windowIdCounter}`
    const newWindow: WindowState = {
      id: windowId,
      appId,
      title: WINDOW_TITLES[appId],
      x: placement?.x ?? 120 + offset,
      y: placement?.y ?? 80 + offset,
      width: placement?.width ?? size.width,
      height: placement?.height ?? size.height,
      zIndex: topZIndex,
      isMaximized: placement?.isMaximized ?? isMobile,
      isOpening: placement?.animateOpen && !isMobile,
    }
    setWindows(prev => [...prev, newWindow])

    if (newWindow.isOpening) {
      const timeoutId = window.setTimeout(() => {
        setWindows(prev => prev.map(win => (
          win.id === windowId ? { ...win, isOpening: false } : win
        )))
      }, 280)
      windowAnimationTimeoutsRef.current.push(timeoutId)
    }
  }, [isMobile])

  const closeWindow = useCallback((id: string) => {
    setWindows(prev => prev.filter(w => w.id !== id))
  }, [])

  const focusWindow = useCallback((id: string) => {
    topZIndex++
    setWindows(prev => prev.map(w => w.id === id ? { ...w, zIndex: topZIndex } : w))
  }, [])

  const moveWindow = useCallback((id: string, x: number, y: number) => {
    setWindows(prev => prev.map(w => w.id === id ? { ...w, x, y } : w))
  }, [])

  const resizeWindow = useCallback((id: string, x: number, y: number, width: number, height: number) => {
    setWindows(prev => prev.map(w => w.id === id ? { ...w, x, y, width, height } : w))
  }, [])

  const toggleMaximize = useCallback((id: string) => {
    setWindows(prev => prev.map(w => {
      if (w.id !== id) return w
      if (w.isMaximized) {
        return {
          ...w,
          isMaximized: false,
          x: w.prevBounds?.x ?? 100,
          y: w.prevBounds?.y ?? 80,
          width: w.prevBounds?.width ?? 400,
          height: w.prevBounds?.height ?? 300,
          prevBounds: undefined,
        }
      } else {
        return {
          ...w,
          isMaximized: true,
          prevBounds: { x: w.x, y: w.y, width: w.width, height: w.height },
        }
      }
    }))
  }, [])

  const moveIntroCursorTo = useCallback((appId: AppId) => {
    const pos = iconPositions[appId]
    setIntroCursor({
      x: pos.x + INTRO_ICON_CURSOR_X,
      y: pos.y + INTRO_ICON_CURSOR_Y,
      clicking: false,
    })
    setIntroTarget(appId)
  }, [iconPositions])

  const triggerIntroClick = useCallback((appId: AppId) => {
    introPulseKeyRef.current += 1
    const pulseKey = introPulseKeyRef.current

    setSelectedIcon(appId)
    setIntroTarget(appId)
    setIntroPulse({ appId, key: pulseKey })
    setIntroCursor(prev => prev ? { ...prev, clicking: true } : prev)

    const releaseId = window.setTimeout(() => {
      setIntroCursor(prev => prev ? { ...prev, clicking: false } : prev)
    }, 120)
    const pulseResetId = window.setTimeout(() => {
      setIntroPulse(current => current?.key === pulseKey ? null : current)
    }, 220)

    introTimeoutsRef.current.push(releaseId, pulseResetId)
  }, [])

  const cancelAutoLaunch = useCallback(() => {
    if (!introIsRunningRef.current) return
    introIsRunningRef.current = false
    clearIntroTimeouts()
    clearIntroVisuals()
    setSelectedIcon(null)
  }, [clearIntroTimeouts, clearIntroVisuals])

  useEffect(() => {
    return () => {
      clearIntroTimeouts()
      clearWindowAnimationTimeouts()
    }
  }, [clearIntroTimeouts, clearWindowAnimationTimeouts])

  useEffect(() => {
    if (isBooting || isMobile || introHasPlayedRef.current) return

    introHasPlayedRef.current = true
    introIsRunningRef.current = true

    const placements = getAutoLaunchWindowPlacements()
    let totalDelay = 320

    const schedule = (delay: number, callback: () => void) => {
      const timeoutId = window.setTimeout(() => {
        if (!introIsRunningRef.current) return
        callback()
      }, delay)
      introTimeoutsRef.current.push(timeoutId)
    }

    schedule(totalDelay, () => moveIntroCursorTo('about'))
    totalDelay += 520
    schedule(totalDelay, () => triggerIntroClick('about'))
    totalDelay += 320
    schedule(totalDelay, () => {
      triggerIntroClick('about')
      openWindow('about', { ...placements.about, animateOpen: true })
    })
    totalDelay += 620
    schedule(totalDelay, () => moveIntroCursorTo('projects'))
    totalDelay += 560
    schedule(totalDelay, () => triggerIntroClick('projects'))
    totalDelay += 320
    schedule(totalDelay, () => {
      triggerIntroClick('projects')
      openWindow('projects', { ...placements.projects, animateOpen: true })
    })
    totalDelay += 520
    schedule(totalDelay, () => {
      introIsRunningRef.current = false
      clearIntroVisuals()
      setSelectedIcon(null)
    })

    return () => clearIntroTimeouts()
  }, [isBooting, isMobile, clearIntroTimeouts, clearIntroVisuals, moveIntroCursorTo, openWindow, triggerIntroClick])

  // Icon interaction handlers
  const handleIconPointerDown = useCallback((appId: AppId, e: React.PointerEvent<HTMLDivElement>) => {
    // On mobile, don't capture for dragging
    if (isMobile) return
    
    e.preventDefault()
    e.currentTarget.setPointerCapture(e.pointerId)
    setSelectedIcon(appId)
    
    const pos = iconPositions[appId]
    dragIconRef.current = {
      id: appId,
      startX: e.clientX,
      startY: e.clientY,
      iconStartX: pos.x,
      iconStartY: pos.y,
      moved: false
    }
  }, [iconPositions, isMobile])

  const handleIconPointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (isMobile || !dragIconRef.current) return
    
    const dx = e.clientX - dragIconRef.current.startX
    const dy = e.clientY - dragIconRef.current.startY
    
    // Only start "moving" if we've moved more than 5px (prevents accidental drags)
    if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
      dragIconRef.current.moved = true
    }
    
    if (dragIconRef.current.moved) {
      const newX = Math.max(0, dragIconRef.current.iconStartX + dx)
      const newY = Math.max(0, dragIconRef.current.iconStartY + dy)
      
      setIconPositions(prev => ({
        ...prev,
        [dragIconRef.current!.id]: { x: newX, y: newY }
      }))
    }
  }, [isMobile])

  const handleIconPointerUp = useCallback((appId: AppId) => {
    const wasDragging = dragIconRef.current?.moved
    dragIconRef.current = null
    
    // If we didn't drag, handle as click (for double-click detection)
    if (!wasDragging) {
      const now = Date.now()
      const last = lastClickRef.current
      // On mobile, single tap opens; on desktop, double-click
      if (isMobile || (last.target === appId && now - last.time < 400)) {
        openWindow(appId)
        lastClickRef.current = { time: 0, target: null }
      } else {
        lastClickRef.current = { time: now, target: appId }
      }
    }
  }, [openWindow, isMobile])

  // Deselect icon when clicking on desktop background
  const handleDesktopClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      setSelectedIcon(null)
    }
  }, [])

  const handleDesktopPointerDownCapture = useCallback(() => {
    if (isBooting) return
    cancelAutoLaunch()
  }, [cancelAutoLaunch, isBooting])

  const iconElements = ICONS.map(icon => {
    const pos = iconPositions[icon.id]
    const isSelected = selectedIcon === icon.id
    const isIntroTarget = introTarget === icon.id
    return (
      <div
        key={icon.id}
        className={`zackos-icon ${isSelected ? 'selected' : ''} ${isIntroTarget ? 'intro-target' : ''}`}
        style={isMobile ? undefined : { left: pos.x, top: pos.y }}
        onPointerDown={(e) => handleIconPointerDown(icon.id, e)}
        onPointerMove={handleIconPointerMove}
        onPointerUp={() => handleIconPointerUp(icon.id)}
      >
        <div className="zackos-icon-image">
          {introPulse?.appId === icon.id ? (
            <span key={introPulse.key} className="zackos-icon-demo-pulse" aria-hidden="true" />
          ) : null}
          {getIcon(icon.icon)}
        </div>
        <span className="zackos-icon-label">{icon.label}</span>
      </div>
    )
  })

  const hasMaximized = windows.some(w => w.isMaximized)

  return (
    <div
      className="zackos-desktop"
      onClick={handleDesktopClick}
      onPointerDownCapture={handleDesktopPointerDownCapture}
    >
      {isBooting && <BootScreen onComplete={() => setIsBooting(false)} />}
      {!hasMaximized && <MenuBar />}
      {isMobile ? (
        <div className="zackos-icons-grid">{iconElements}</div>
      ) : (
        iconElements
      )}
      {windows.map(win => (
        <Window
          key={win.id}
          window={win}
          isMobile={isMobile}
          onClose={closeWindow}
          onFocus={focusWindow}
          onMove={moveWindow}
          onResize={resizeWindow}
          onToggleMaximize={toggleMaximize}
        />
      ))}
      {!isMobile && introCursor && (
        <div
          className={`zackos-demo-cursor ${introCursor.clicking ? 'clicking' : ''}`}
          style={{ left: introCursor.x, top: introCursor.y }}
          aria-hidden="true"
        >
          <span className="zackos-demo-cursor-ring" />
        </div>
      )}
    </div>
  )
}
