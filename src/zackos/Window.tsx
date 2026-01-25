import { useRef, useCallback } from 'react'
import type { WindowState } from './types'
import { CloseIcon, MaximizeIcon } from './icons'
import { AboutContent, ProjectsContent, FtnsContent, NotepadContent, SketchpadContent } from './apps'

const MIN_WIDTH = 240
const MIN_HEIGHT = 160

interface WindowProps {
  window: WindowState
  isMobile?: boolean
  onClose: (id: string) => void
  onFocus: (id: string) => void
  onMove: (id: string, x: number, y: number) => void
  onResize: (id: string, x: number, y: number, width: number, height: number) => void
  onToggleMaximize: (id: string) => void
}

type ResizeHandle = 'nw' | 'ne' | 'sw' | 'se'

export function Window({ window: win, isMobile = false, onClose, onFocus, onMove, onResize, onToggleMaximize }: WindowProps) {
  const dragOffset = useRef<{ x: number; y: number } | null>(null)
  const resizeStart = useRef<{ handle: ResizeHandle; startX: number; startY: number; bounds: { x: number; y: number; w: number; h: number } } | null>(null)

  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (isMobile || win.isMaximized) return
    e.preventDefault()
    e.currentTarget.setPointerCapture(e.pointerId)
    dragOffset.current = { x: e.clientX - win.x, y: e.clientY - win.y }
    onFocus(win.id)
  }, [win.id, win.x, win.y, win.isMaximized, onFocus, isMobile])

  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragOffset.current) return
    const newX = e.clientX - dragOffset.current.x
    const newY = e.clientY - dragOffset.current.y
    onMove(win.id, newX, newY)
  }, [win.id, onMove])

  const handlePointerUp = useCallback(() => {
    dragOffset.current = null
  }, [])

  // Resize handlers
  const handleResizePointerDown = useCallback((handle: ResizeHandle) => (e: React.PointerEvent<HTMLDivElement>) => {
    if (win.isMaximized) return
    e.preventDefault()
    e.stopPropagation()
    e.currentTarget.setPointerCapture(e.pointerId)
    resizeStart.current = {
      handle,
      startX: e.clientX,
      startY: e.clientY,
      bounds: { x: win.x, y: win.y, w: win.width, h: win.height }
    }
    onFocus(win.id)
  }, [win.id, win.x, win.y, win.width, win.height, win.isMaximized, onFocus])

  const handleResizePointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!resizeStart.current) return
    const { handle, startX, startY, bounds } = resizeStart.current
    const dx = e.clientX - startX
    const dy = e.clientY - startY

    let newX = bounds.x
    let newY = bounds.y
    let newW = bounds.w
    let newH = bounds.h

    if (handle === 'nw') {
      newX = bounds.x + dx
      newY = bounds.y + dy
      newW = bounds.w - dx
      newH = bounds.h - dy
    } else if (handle === 'ne') {
      newY = bounds.y + dy
      newW = bounds.w + dx
      newH = bounds.h - dy
    } else if (handle === 'sw') {
      newX = bounds.x + dx
      newW = bounds.w - dx
      newH = bounds.h + dy
    } else if (handle === 'se') {
      newW = bounds.w + dx
      newH = bounds.h + dy
    }

    // Enforce minimums
    if (newW < MIN_WIDTH) {
      if (handle === 'nw' || handle === 'sw') {
        newX = bounds.x + bounds.w - MIN_WIDTH
      }
      newW = MIN_WIDTH
    }
    if (newH < MIN_HEIGHT) {
      if (handle === 'nw' || handle === 'ne') {
        newY = bounds.y + bounds.h - MIN_HEIGHT
      }
      newH = MIN_HEIGHT
    }

    onResize(win.id, newX, newY, newW, newH)
  }, [win.id, onResize])

  const handleResizePointerUp = useCallback(() => {
    resizeStart.current = null
  }, [])

  const style: React.CSSProperties = win.isMaximized
    ? { top: 0, left: 0, width: '100%', height: '100%', zIndex: win.zIndex }
    : { top: win.y, left: win.x, width: win.width, height: win.height, zIndex: win.zIndex }

  const renderContent = () => {
    switch (win.appId) {
      case 'about':
        return <AboutContent />
      case 'projects':
        return <ProjectsContent />
      case 'ftns':
        return <FtnsContent />
      case 'notepad':
        return <NotepadContent />
      case 'sketchpad':
        return <SketchpadContent />
    }
  }

  return (
    <div
      className="zackos-window"
      style={style}
      onMouseDown={() => onFocus(win.id)}
    >
      <div
        className="zackos-window-titlebar"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onDoubleClick={() => !isMobile && onToggleMaximize(win.id)}
      >
        {isMobile ? (
          <button
            className="zackos-back-btn"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => { e.stopPropagation(); onClose(win.id) }}
          >
            ← Back
          </button>
        ) : (
          <button
            className="zackos-window-btn zackos-close-btn"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => { e.stopPropagation(); onClose(win.id) }}
            aria-label="Close"
          >
            <CloseIcon />
          </button>
        )}
        <span className="zackos-window-title">{win.title}</span>
        <button
          className="zackos-window-btn zackos-maximize-btn"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => { e.stopPropagation(); onToggleMaximize(win.id) }}
          aria-label="Maximize"
        >
          <MaximizeIcon />
        </button>
      </div>
      <div className="zackos-window-content">
        {renderContent()}
      </div>
      {/* Resize handles */}
      {!win.isMaximized && (
        <>
          <div
            className="zackos-resize-handle nw"
            onPointerDown={handleResizePointerDown('nw')}
            onPointerMove={handleResizePointerMove}
            onPointerUp={handleResizePointerUp}
          />
          <div
            className="zackos-resize-handle ne"
            onPointerDown={handleResizePointerDown('ne')}
            onPointerMove={handleResizePointerMove}
            onPointerUp={handleResizePointerUp}
          />
          <div
            className="zackos-resize-handle sw"
            onPointerDown={handleResizePointerDown('sw')}
            onPointerMove={handleResizePointerMove}
            onPointerUp={handleResizePointerUp}
          />
          <div
            className="zackos-resize-handle se"
            onPointerDown={handleResizePointerDown('se')}
            onPointerMove={handleResizePointerMove}
            onPointerUp={handleResizePointerUp}
          />
        </>
      )}
    </div>
  )
}
