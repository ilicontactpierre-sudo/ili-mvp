import { useRef } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import HomePage from './pages/HomePage.jsx'
import StoryPage from './pages/StoryPage.jsx'
import AdminPage from './pages/AdminPage.jsx'

// Instance audio globale, créée une seule fois
const clicAudio = new Audio('/sounds/Clic ILi.mp3')
clicAudio.volume = 0.6

const clicSettingsAudio = new Audio('/sounds/Clic-Settings.mp3')
clicSettingsAudio.volume = 0.2

export function playClicILi() {
  clicAudio.currentTime = 0
  clicAudio.play().catch(() => {})
}

export function playClicSettings() {
  clicSettingsAudio.currentTime = 0
  clicSettingsAudio.play().catch(() => {})
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/lire/:storyId" element={<StoryPage />} />
      <Route path="/admin" element={<AdminPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App