export type AppId = 'about' | 'projects' | 'ftns' | 'notepad' | 'sketchpad'

export interface WindowState {
  id: string
  appId: AppId
  title: string
  x: number
  y: number
  width: number
  height: number
  zIndex: number
  isMaximized: boolean
  prevBounds?: { x: number; y: number; width: number; height: number }
}

export interface DesktopIcon {
  id: AppId
  label: string
  icon: 'person' | 'folder' | 'app' | 'notepad' | 'sketchpad'
}

export interface IconPosition {
  x: number
  y: number
}
