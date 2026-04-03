export type AppId = 'about' | 'projects' | 'ftns' | 'notepad' | 'sketchpad' | 'noslop' | 'pomodoro'

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
  isOpening?: boolean
  prevBounds?: { x: number; y: number; width: number; height: number }
}

export interface DesktopIcon {
  id: AppId
  label: string
  icon: 'person' | 'folder' | 'barbell' | 'notepad' | 'sketchpad' | 'germ' | 'timer'
}

export interface IconPosition {
  x: number
  y: number
}
