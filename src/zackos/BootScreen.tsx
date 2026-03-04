import { useState, useEffect, useRef } from 'react'

interface BootScreenProps {
  onComplete: () => void
}

const BOOT_ICONS = ['⌘', '⌥', '◆', '⟐', '⬡', '▣']

export function BootScreen({ onComplete }: BootScreenProps) {
  const [fadeOut, setFadeOut] = useState(false)
  const [iconCount, setIconCount] = useState(0)
  const [showWelcome, setShowWelcome] = useState(false)
  const mounted = useRef(true)

  useEffect(() => {
    mounted.current = true
    const flashTimer = setInterval(() => {
      setIconCount(prev => {
        if (prev >= BOOT_ICONS.length) {
          clearInterval(flashTimer)
          return prev
        }
        return prev + 1
      })
    }, 100)

    const welcomeTimer = setTimeout(() => setShowWelcome(true), 350)
    const fadeTimer = setTimeout(() => setFadeOut(true), 1800)
    const doneTimer = setTimeout(() => {
      if (mounted.current) onComplete()
    }, 2400)

    return () => {
      mounted.current = false
      clearInterval(flashTimer)
      clearTimeout(welcomeTimer)
      clearTimeout(fadeTimer)
      clearTimeout(doneTimer)
    }
  }, [onComplete])

  return (
    <div className={`zackos-boot ${fadeOut ? 'fade-out' : ''}`}>
      <div className="zackos-boot-content">
        <div className="zackos-boot-icons">
          {BOOT_ICONS.map((icon, idx) => (
            <span
              key={idx}
              className={`zackos-boot-icon ${idx < iconCount ? 'visible' : ''}`}
            >
              {icon}
            </span>
          ))}
        </div>
        <div className={`zackos-boot-welcome ${showWelcome ? 'visible' : ''}`}>
          welcome to zackOS
        </div>
      </div>
    </div>
  )
}
