import { useState } from 'react'
import Map3D from './Map3D'
import OpeningScreen from './OpeningScreen'
import './App.css'

function App() {
  const [showOpening, setShowOpening] = useState(true)

  return (
    <>
      <Map3D />
      {showOpening && <OpeningScreen onFinish={() => setShowOpening(false)} />}
    </>
  )
}

export default App
