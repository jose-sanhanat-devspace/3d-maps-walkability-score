import { useEffect, useState } from 'react'

interface OpeningScreenProps {
  onFinish: () => void
}

function OpeningScreen({ onFinish }: OpeningScreenProps) {
  const [revealed, setRevealed] = useState(false)
  const [fadingOut, setFadingOut] = useState(false)

  useEffect(() => {
    const revealTimer = setTimeout(() => setRevealed(true), 500)
    const fadeTimer = setTimeout(() => setFadingOut(true), 1900)
    const finishTimer = setTimeout(onFinish, 2500)
    return () => {
      clearTimeout(revealTimer)
      clearTimeout(fadeTimer)
      clearTimeout(finishTimer)
    }
  }, [onFinish])

  return (
    <div className={`opening-screen${fadingOut ? ' fade-out' : ''}`}>
      <div className={`opening-card${revealed ? ' revealed' : ''}`}>📍</div>
    </div>
  )
}

export default OpeningScreen
