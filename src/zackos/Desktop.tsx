import { useState, useCallback, useRef, useEffect } from 'react'
import type { AppId, WindowState, DesktopIcon, IconPosition } from './types'
import { PersonIcon, FolderIcon, AppIcon, NotepadIcon, SketchpadIcon } from './icons'
import { Window } from './Window'
import { BootScreen } from './BootScreen'

const MOBILE_BREAKPOINT = 640

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

const ICONS: DesktopIcon[] = [
  { id: 'about', label: 'zachariyaibrahim.about', icon: 'person' },
  { id: 'projects', label: 'projects', icon: 'folder' },
  { id: 'ftns', label: 'ftns', icon: 'app' },
  { id: 'notepad', label: 'notepad', icon: 'notepad' },
  { id: 'sketchpad', label: 'sketchpad', icon: 'sketchpad' },
]

const WINDOW_TITLES: Record<AppId, string> = {
  about: 'About',
  projects: 'Projects',
  ftns: 'ftns',
  notepad: 'Notepad',
  sketchpad: 'Sketchpad',
}

const WINDOW_SIZES: Record<AppId, { width: number; height: number }> = {
  about: { width: 400, height: 300 },
  projects: { width: 400, height: 300 },
  ftns: { width: 400, height: 300 },
  notepad: { width: 480, height: 400 },
  sketchpad: { width: 560, height: 450 },
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
  
  const lastClickRef = useRef<{ time: number; target: AppId | null }>({ time: 0, target: null })
  const dragIconRef = useRef<{ id: AppId; startX: number; startY: number; iconStartX: number; iconStartY: number; moved: boolean } | null>(null)

  const openWindow = useCallback((appId: AppId) => {
    windowIdCounter++
    topZIndex++
    const offset = (windowIdCounter % 5) * 30
    const size = WINDOW_SIZES[appId]
    const newWindow: WindowState = {
      id: `win-${windowIdCounter}`,
      appId,
      title: WINDOW_TITLES[appId],
      x: 120 + offset,
      y: 80 + offset,
      width: size.width,
      height: size.height,
      zIndex: topZIndex,
      isMaximized: isMobile, // Start maximized on mobile
    }
    setWindows(prev => [...prev, newWindow])
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

  const iconElements = ICONS.map(icon => {
    const pos = iconPositions[icon.id]
    const isSelected = selectedIcon === icon.id
    return (
      <div
        key={icon.id}
        className={`zackos-icon ${isSelected ? 'selected' : ''}`}
        style={isMobile ? undefined : { left: pos.x, top: pos.y }}
        onPointerDown={(e) => handleIconPointerDown(icon.id, e)}
        onPointerMove={handleIconPointerMove}
        onPointerUp={() => handleIconPointerUp(icon.id)}
      >
        <div className="zackos-icon-image">
          {getIcon(icon.icon)}
        </div>
        <span className="zackos-icon-label">{icon.label}</span>
      </div>
    )
  })

  if (isBooting) {
    return <BootScreen onComplete={() => setIsBooting(false)} />
  }

  return (
    <div className="zackos-desktop" onClick={handleDesktopClick}>
      <MenuBar />
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
    </div>
  )
}
