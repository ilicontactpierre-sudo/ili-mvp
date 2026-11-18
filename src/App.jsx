import { useEffect, useRef } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import HomePage from './pages/HomePage.jsx'
import StoryPage from './pages/StoryPage.jsx'
import AdminPage from './pages/AdminPage.jsx'
import TutorialPage from './pages/TutorialPage.jsx'
import { createUiSound } from './utils/uiSounds.js'

// Sons d'interface, créés une seule fois (par Howler : volume respecté sur iPhone)
const clicILi = createUiSound('/sounds/Clic ILi.mp3', 0.6)
const clicSettings = createUiSound('/sounds/Clic-Settings.mp3', 0.1)

export function playClicILi() {
  clicILi.play()
}

export function playClicSettings() {
  clicSettings.play()
}

function App() {
  // Les deux clics sont téléchargés dès l'ouverture du site (~200 Ko)
  useEffect(() => {
    clicILi.prepare()
    clicSettings.prepare()
  }, [])

  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/lire/:storyId" element={<StoryPage />} />
      <Route path="/tutoriel" element={<TutorialPage />} />
      <Route path="/admin" element={<AdminPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App