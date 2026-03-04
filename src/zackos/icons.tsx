export function PersonIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
      <rect x="1" y="1" width="30" height="30" fill="#fff" stroke="#000" strokeWidth="1"/>
      <circle cx="16" cy="11" r="5" fill="#000"/>
      <path d="M8 28c0-6 4-9 8-9s8 3 8 9" fill="#000"/>
    </svg>
  )
}

export function FolderIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
      <path d="M2 8h10l2-3h16v22H2V8z" fill="#fff" stroke="#000" strokeWidth="1"/>
      <path d="M2 10h28v17H2V10z" fill="#fff" stroke="#000" strokeWidth="1"/>
    </svg>
  )
}

export function AppIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
      <rect x="1" y="1" width="30" height="30" fill="#fff" stroke="#000" strokeWidth="1"/>
      <rect x="6" y="6" width="20" height="4" fill="#000"/>
      <rect x="6" y="14" width="20" height="2" fill="#000"/>
      <rect x="6" y="20" width="14" height="2" fill="#000"/>
      <rect x="6" y="26" width="10" height="2" fill="#000"/>
    </svg>
  )
}

export function NotepadIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
      <rect x="4" y="1" width="24" height="30" fill="#fff" stroke="#000" strokeWidth="1"/>
      <line x1="8" y1="8" x2="24" y2="8" stroke="#000" strokeWidth="1"/>
      <line x1="8" y1="12" x2="24" y2="12" stroke="#000" strokeWidth="1"/>
      <line x1="8" y1="16" x2="24" y2="16" stroke="#000" strokeWidth="1"/>
      <line x1="8" y1="20" x2="20" y2="20" stroke="#000" strokeWidth="1"/>
      <line x1="8" y1="24" x2="16" y2="24" stroke="#000" strokeWidth="1"/>
    </svg>
  )
}

export function SketchpadIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
      <rect x="1" y="1" width="30" height="30" fill="#fff" stroke="#000" strokeWidth="1"/>
      <path d="M6 26L12 8L18 20L24 12L26 26" stroke="#000" strokeWidth="1.5" fill="none"/>
      <circle cx="22" cy="8" r="3" fill="#000"/>
    </svg>
  )
}

export function CloseIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
      <rect width="12" height="12" fill="#fff" stroke="#000" strokeWidth="1"/>
      <line x1="3" y1="3" x2="9" y2="9" stroke="#000" strokeWidth="1.5"/>
      <line x1="9" y1="3" x2="3" y2="9" stroke="#000" strokeWidth="1.5"/>
    </svg>
  )
}

export function MaximizeIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
      <rect x="1" y="1" width="10" height="10" fill="#fff" stroke="#000" strokeWidth="1.5"/>
    </svg>
  )
}

export function DownloadIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M7 1v8M3 6l4 4 4-4" stroke="#000" strokeWidth="1.5" fill="none"/>
      <line x1="2" y1="12" x2="12" y2="12" stroke="#000" strokeWidth="1.5"/>
    </svg>
  )
}

export function GermIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
      <rect x="1" y="1" width="30" height="30" fill="#fff" stroke="#000" strokeWidth="1"/>
      {/* Germ body */}
      <ellipse cx="16" cy="16" rx="7" ry="6" fill="#000"/>
      {/* Flagella/tentacles */}
      <path d="M9 12 Q5 8, 4 10" stroke="#000" strokeWidth="1.5" fill="none"/>
      <path d="M23 12 Q27 8, 28 10" stroke="#000" strokeWidth="1.5" fill="none"/>
      <path d="M9 20 Q5 24, 4 22" stroke="#000" strokeWidth="1.5" fill="none"/>
      <path d="M23 20 Q27 24, 28 22" stroke="#000" strokeWidth="1.5" fill="none"/>
      <path d="M12 10 Q10 5, 12 4" stroke="#000" strokeWidth="1.5" fill="none"/>
      <path d="M20 10 Q22 5, 20 4" stroke="#000" strokeWidth="1.5" fill="none"/>
      <path d="M12 22 Q10 27, 12 28" stroke="#000" strokeWidth="1.5" fill="none"/>
      <path d="M20 22 Q22 27, 20 28" stroke="#000" strokeWidth="1.5" fill="none"/>
      {/* Eyes */}
      <circle cx="14" cy="15" r="1.5" fill="#fff"/>
      <circle cx="18" cy="15" r="1.5" fill="#fff"/>
    </svg>
  )
}
