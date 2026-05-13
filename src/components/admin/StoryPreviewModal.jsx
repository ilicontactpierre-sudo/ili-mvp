import { useState, useEffect, useCallback, useRef } from 'react'
import StoryReader from '../StoryReader'
import StartScreen from '../StartScreen'
import EndScreen from '../EndScreen'
import AudioEngine from '../../engine/AudioEngine'

function StoryPreviewModal({ isOpen, storyData, onClose }) {
  const [isStarted, setIsStarted] = useState(false)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isFinished, setIsFinished] = useState(false)
  const [preloadedSounds, setPreloadedSounds] = useState(new Map())
  const audioEngineRef = useRef(null)
  const ignoreAdvanceUntilRef = useRef(0)
  const touchStartYRef = useRef(null)

  const segments = storyData?.segments || []
  const lastIndex = Math.max(segments.length - 1, 0)

  // Réinitialiser l'état quand le modal s'ouvre
  useEffect(() => {
    if (isOpen) {
      setIsStarted(false)
      setCurrentIndex(0)
      setIsFinished(false)
      setPreloadedSounds(new Map())
      audioEngineRef.current = null
      ignoreAdvanceUntilRef.current = 0
      touchStartYRef.current = null
    }
  }, [isOpen])

  // Nettoyer l'audio au démontage
  useEffect(() => {
    return () => {
      audioEngineRef.current?.stopAll()
    }
  }, [])

  // Navigation suivante
  const goToNext = useCallback(() => {
    if (!isStarted || !segments.length || isFinished) {
      return
    }

    setCurrentIndex((prevIndex) => {
      if (prevIndex >= lastIndex) {
        setIsFinished(true)
        return prevIndex
      }
      return prevIndex + 1
    })
  }, [isFinished, isStarted, lastIndex, segments.length])

  // Navigation précédente
  const goToPrevious = useCallback(() => {
    if (!isStarted || !segments.length) {
      return
    }

    if (isFinished) {
      setIsFinished(false)
      return
    }

    setCurrentIndex((prevIndex) => Math.max(0, prevIndex - 1))
  }, [isFinished, isStarted, segments.length])

  // Raccourcis clavier
  useEffect(() => {
    if (!isOpen) return

    function handleKeyDown(event) {
      // Échap pour fermer
      if (event.key === 'Escape') {
        event.preventDefault()
        handleClose()
        return
      }

      if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
        event.preventDefault()
        goToNext()
      }

      if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
        event.preventDefault()
        goToPrevious()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, goToNext, goToPrevious])

  // Exécuter les événements audio au changement de segment
  useEffect(() => {
    if (!isStarted || !audioEngineRef.current || !segments[currentIndex]) {
      return
    }

    audioEngineRef.current.executeEvents(segments[currentIndex].audioEvents || [])
  }, [currentIndex, isStarted, segments])

  // Arrêter l'audio à la fin
  useEffect(() => {
    if (!isFinished) {
      return
    }

    audioEngineRef.current?.stopAll(1500)
  }, [isFinished])

  // Gestion du clic sur l'overlay
  const handleOverlayClick = (event) => {
    // Ne fermer que si on clic sur l'overlay, pas sur le contenu
    if (event.target === event.currentTarget) {
      handleClose()
    }
  }

  // Gestion du clic sur l'écran (navigation)
  const handleScreenClick = (event) => {
    if (Date.now() < ignoreAdvanceUntilRef.current) {
      return
    }

    if (event.target.closest('a, button, input, textarea, select, summary, [role="button"]')) {
      return
    }
    goToNext()
  }

  // Gestion du toucher
  const handleTouchStart = (event) => {
    if (Date.now() < ignoreAdvanceUntilRef.current) {
      return
    }

    touchStartYRef.current = event.changedTouches[0]?.clientY || null
  }

  const handleTouchEnd = (event) => {
    if (Date.now() < ignoreAdvanceUntilRef.current) {
      touchStartYRef.current = null
      return
    }

    if (touchStartYRef.current === null) {
      return
    }

    const touchEndY = event.changedTouches[0]?.clientY || touchStartYRef.current
    const deltaY = touchEndY - touchStartYRef.current
    touchStartYRef.current = null

    if (Math.abs(deltaY) < 50) {
      return
    }

    if (deltaY < 0) {
      goToNext()
      return
    }

    goToPrevious()
  }

  // Fermer le modal
  const handleClose = () => {
    audioEngineRef.current?.stopAll()
    if (onClose) {
      onClose()
    }
  }

  // Recommencer depuis le début
  const handleRestart = () => {
    setCurrentIndex(0)
    setIsFinished(false)
    setIsStarted(false)
    audioEngineRef.current?.stopAll()
    audioEngineRef.current = null
    ignoreAdvanceUntilRef.current = 0
  }

  // Démarrer l'histoire (après le StartScreen)
  const handleStart = (preloadedHowlMap) => {
    setPreloadedSounds(preloadedHowlMap)
    audioEngineRef.current = new AudioEngine(preloadedHowlMap)
    ignoreAdvanceUntilRef.current = Date.now() + 600
    touchStartYRef.current = null
    setIsStarted(true)
  }

  if (!isOpen) {
    return null
  }

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.92)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        animation: 'fadeIn 250ms ease'
      }}
      onClick={handleOverlayClick}
    >
      {/* Bouton fermer (en haut à droite) */}
      <button
        onClick={handleClose}
        style={{
          position: 'absolute',
          top: '2rem',
          right: '2rem',
          padding: '0.5rem 1rem',
          backgroundColor: 'rgba(255,255,255,0.1)',
          color: 'white',
          border: '1px solid rgba(255,255,255,0.3)',
          borderRadius: '4px',
          cursor: 'pointer',
          fontSize: '0.875rem',
          backdropFilter: 'blur(4px)',
          zIndex: 10000
        }}
      >
        ✕ Fermer
      </button>

      {/* Cadre téléphone */}
      <div
        style={{
          width: '375px',
          height: '667px',
          borderRadius: '44px',
          border: '8px solid #2a2a2a',
          boxShadow: '0 30px 80px rgba(0,0,0,0.9)',
          overflow: 'hidden',
          backgroundColor: 'var(--color-bg)',
          position: 'relative',
          animation: 'scaleIn 250ms ease'
        }}
      >
        {/* Notch CSS (optionnel) */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: '50%',
            transform: 'translateX(-50%)',
            width: '150px',
            height: '28px',
            backgroundColor: '#1a1a1a',
            borderBottomLeftRadius: '16px',
            borderBottomRightRadius: '16px',
            zIndex: 100
          }}
        />

        {/* Contenu interactif */}
        <div
          style={{
            width: '100%',
            height: '100%',
            overflow: 'hidden'
          }}
          onClick={handleScreenClick}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          {!isStarted && (
            <StartScreen
              title={storyData?.title || ''}
              author={storyData?.author || ''}
              soundsToPreload={storyData?.sounds || []}
              onStart={handleStart}
            />
          )}

          {isStarted && !isFinished && (
            <StoryReader
              storyData={storyData}
              currentIndex={currentIndex}
            />
          )}

          {isFinished && (
            <EndScreen
              title={storyData?.title || ''}
              author={storyData?.author || ''}
              onRestart={handleRestart}
            />
          )}
        </div>
      </div>

      {/* Bouton recommencer (en bas, centré) */}
      {isFinished && (
        <button
          onClick={handleRestart}
          style={{
            position: 'absolute',
            bottom: '3rem',
            left: '50%',
            transform: 'translateX(-50%)',
            padding: '0.75rem 1.5rem',
            backgroundColor: 'rgba(255,255,255,0.1)',
            color: 'white',
            border: '1px solid rgba(255,255,255,0.3)',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '0.875rem',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}
        >
          ↩ Recommencer depuis le début
        </button>
      )}

      {/* Styles d'animation */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes scaleIn {
          from { 
            opacity: 0;
            transform: scale(0.95);
          }
          to { 
            opacity: 1;
            transform: scale(1);
          }
        }
      `}</style>
    </div>
  )
}

export default StoryPreviewModal