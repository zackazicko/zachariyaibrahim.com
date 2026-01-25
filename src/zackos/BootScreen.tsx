import { useState, useEffect } from 'react'

interface BootScreenProps {
  onComplete: () => void
}

export function BootScreen({ onComplete }: BootScreenProps) {
  const [progress, setProgress] = useState(0)
  const [showWelcome, setShowWelcome] = useState(false)
  const [fadeOut, setFadeOut] = useState(false)

  useEffect(() => {
    // Animate progress bar over 1.8 seconds
    const duration = 1800
    const interval = 20
    const increment = 100 / (duration / interval)
    
    const timer = setInterval(() => {
      setProgress(prev => {
        const next = prev + increment
        if (next >= 100) {
          clearInterval(timer)
          return 100
        }
        return next
      })
    }, interval)

    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    if (progress >= 100) {
      // Show welcome message
      setShowWelcome(true)
      // Start fade out after a brief pause
      const fadeTimer = setTimeout(() => {
        setFadeOut(true)
      }, 300)
      // Complete after fade
      const completeTimer = setTimeout(() => {
        onComplete()
      }, 600)
      return () => {
        clearTimeout(fadeTimer)
        clearTimeout(completeTimer)
      }
    }
  }, [progress, onComplete])

  return (
    <div className={`zackos-boot ${fadeOut ? 'fade-out' : ''}`}>
      <div className="zackos-boot-content">
        <div className="zackos-boot-logo">zackOS</div>
        {!showWelcome ? (
          <div className="zackos-boot-progress">
            <div className="zackos-boot-progress-bar">
              <div 
                className="zackos-boot-progress-fill" 
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="zackos-boot-status">Loading...</div>
          </div>
        ) : (
          <div className="zackos-boot-welcome">Welcome to zackOS</div>
        )}
      </div>
    </div>
  )
}
