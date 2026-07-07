import { useRef, useState } from 'react'

interface OpeningScreenProps {
  onFinish: () => void
}

function OpeningScreen({ onFinish }: OpeningScreenProps) {
  const [revealed, setRevealed] = useState(false)
  const [fadingOut, setFadingOut] = useState(false)
  const clickedRef = useRef(false)

  const handleClick = () => {
    if (clickedRef.current) return
    clickedRef.current = true

    setRevealed(true)
    setTimeout(() => setFadingOut(true), 900)
    setTimeout(onFinish, 1500)
  }

  return (
    <div className={`opening-screen${fadingOut ? ' fade-out' : ''}`} onClick={handleClick}>
      <div className={`opening-card${revealed ? ' revealed' : ''}`}>📍</div>
      {!revealed && <p className="opening-hint">Click to begin</p>}
    </div>
  )
}

export default OpeningScreen
