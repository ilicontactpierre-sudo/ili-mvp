import { useState, useEffect, useCallback, useRef } from 'react'
import StoryReader from '../StoryReader'
import StartScreen from '../StartScreen'
import EndScreen from '../EndScreen'
import AudioEngine from '../../engine/AudioEngine'
import GameOverlay from '../GameOverlay'

function StoryPreviewModal({ isOpen, storyData, onClose, startSegmentIndex = null }) {
  const [isStarted, setIsStarted] = useState(false)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isFinished, setIsFinished] = useState(false)
  const [readerKey, setReaderKey] = useState(0)
  const audioEngineRef = useRef(null)
  const ignoreAdvanceUntilRef = useRef(0)
  const touchStartYRef = useRef(null)

  const segments = storyData?.segments || []
  const lastIndex = Math.max(segments.length - 1, 0)

  const [startFromInput, setStartFromInput] = useState('')

  // Réinitialiser l'état quand le modal s'ouvre
  useEffect(() => {
    if (isOpen) {
      setIsStarted(false)
      setCurrentIndex(0)
      setIsFinished(false)
      setStartFromInput(startSegmentIndex != null ? String(startSegmentIndex + 1) : '')
      audioEngineRef.current = null
      ignoreAdvanceUntilRef.current = 0
      touchStartYRef.current = null
    }
  }, [isOpen, startSegmentIndex])

  // Nettoyer l'audio au démontage
  useEffect(() => {
    return () => {
      audioEngineRef.current?.stopAll()
    }
  }, [])

  // Fermer le modal — défini AVANT les useEffect qui l'utilisent
  const handleClose = useCallback(() => {
    audioEngineRef.current?.stopAll()
    audioEngineRef.current = null
    if (onClose) onClose()
  }, [onClose])

  // Navigation suivante
  const goToNext = useCallback(() => {
    if (!isStarted || !segments.length || isFinished) return
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
    if (!isStarted || !segments.length) return
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
  }, [isOpen, goToNext, goToPrevious, handleClose])

  // Exécuter les soundTracks au changement de segment
  useEffect(() => {
    if (!isStarted || !audioEngineRef.current) return
    const soundTracks = storyData?.soundTracks || []
    audioEngineRef.current.onSegmentChange(currentIndex, soundTracks, segments)
  }, [currentIndex, isStarted])

  // Arrêter l'audio à la fin
  useEffect(() => {
    if (!isFinished) return
    audioEngineRef.current?.stopAll(1500)
  }, [isFinished])

  // Recommencer depuis le début
  const handleRestart = () => {
    audioEngineRef.current?.stopAll()
    audioEngineRef.current = null
    setCurrentIndex(0)
    setIsFinished(false)
    setIsStarted(false)
    setStartFromInput('')
    ignoreAdvanceUntilRef.current = 0
  }

  // Démarrer l'histoire
  const handleStart = (preloadedHowlMap) => {
    audioEngineRef.current = new AudioEngine(preloadedHowlMap)
    audioEngineRef.current.setMasterVolume(storyData?.masterVolume ?? 1.0)
    ignoreAdvanceUntilRef.current = Date.now() + 600
    touchStartYRef.current = null
    const startIndex = Math.max(0, Math.min(segments.length - 1, parseInt(startFromInput) - 1 || 0))
    setCurrentIndex(startIndex)
    setIsStarted(true)
    // Forcer un second rendu après que le DOM soit peint :
    // StoryReader monte avec currentIndex correct mais offsetTop=0 au premier paint.
    // On re-set le même index 150ms après pour déclencher le useLayoutEffect
    // une fois que les segments sont vraiment positionnés dans le DOM.
    // Forcer un recalcul du translateY après que le DOM soit peint :
    // au premier mount, offsetTop=0 pour tous les segments.
    // On recrée StoryReader 150ms après pour qu'il recalcule avec le bon DOM.
    if (startIndex > 0) {
      setTimeout(() => {
        setReaderKey(k => k + 1)
      }, 150)
    }
  }

  // Gestion du clic sur l'overlay
  const handleOverlayClick = (event) => {
    if (event.target === event.currentTarget) handleClose()
  }

  const activeGameMode = segments[currentIndex]?.gameMode ?? null

  // Gestion du clic sur l'écran
  const handleScreenClick = (event) => {
    if (activeGameMode) return
    if (Date.now() < ignoreAdvanceUntilRef.current) return
    if (event.target.closest('a, button, input, textarea, select, summary, [role="button"]')) return
    goToNext()
  }

  const handleTouchStart = (event) => {
    if (Date.now() < ignoreAdvanceUntilRef.current) return
    touchStartYRef.current = event.changedTouches[0]?.clientY || null
  }

  const handleTouchEnd = (event) => {
    if (Date.now() < ignoreAdvanceUntilRef.current) {
      touchStartYRef.current = null
      return
    }
    if (touchStartYRef.current === null) return
    const touchEndY = event.changedTouches[0]?.clientY || touchStartYRef.current
    const deltaY = touchEndY - touchStartYRef.current
    touchStartYRef.current = null
    if (Math.abs(deltaY) < 50) return
    if (deltaY < 0) { goToNext(); return }
    goToPrevious()
  }

  if (!isOpen) return null

  return (
    <div
      style={{
        position: 'fixed',
        top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.92)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        animation: 'fadeIn 250ms ease'
      }}
      onClick={handleOverlayClick}
    >
      <button
        onClick={handleClose}
        style={{
          position: 'absolute',
          top: '2rem', right: '2rem',
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

      {!isStarted && startSegmentIndex == null && (
        <div style={{
          position: 'absolute',
          bottom: '3rem',
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          zIndex: 10001,
        }}>
          <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
            Démarrer au segment
          </span>
          <input
            type="number"
            min="1"
            max={segments.length}
            value={startFromInput}
            onChange={e => setStartFromInput(e.target.value)}
            placeholder="1"
            style={{
              width: '64px',
              padding: '0.4rem 0.6rem',
              fontSize: '0.85rem',
              border: '1px solid rgba(255,255,255,0.3)',
              borderRadius: '6px',
              backgroundColor: 'rgba(255,255,255,0.1)',
              color: 'white',
              textAlign: 'center',
              outline: 'none',
            }}
          />
          <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.8rem' }}>
            / {segments.length}
          </span>
        </div>
      )}
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
          animation: 'scaleIn 250ms ease',
        }}
      >
        {/* Notch */}
        <div style={{
          position: 'absolute', top: 0, left: '50%',
          transform: 'translateX(-50%)',
          width: '150px', height: '28px',
          backgroundColor: '#1a1a1a',
          borderBottomLeftRadius: '16px',
          borderBottomRightRadius: '16px',
          zIndex: 100
        }} />

        {/* Contenu réduit — simule un vrai écran mobile dans le cadre */}
        <div
          style={{
            width: '390px',
            height: '844px',
            transformOrigin: 'top left',
            transform: 'scale(0.792)',
            overflow: 'hidden',
            position: 'absolute',
            top: 0,
            left: 0,
            contain: 'strict',
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
              autoStart={startSegmentIndex != null}
            />
          )}
          {isStarted && !isFinished && (
            <>
              <StoryReader
                key={`preview-reader-${storyData?.id || 'draft'}-${readerKey}`}
                storyData={storyData}
                currentIndex={currentIndex}
                viewportHeight={844}
                _debugLabel="preview"
              />
              {activeGameMode && (
                <GameOverlay
                  gameMode={activeGameMode}
                  onResolved={goToNext}
                />
              )}
            </>
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

      {isFinished && (
        <button
          onClick={handleRestart}
          style={{
            position: 'absolute',
            bottom: '3rem', left: '50%',
            transform: 'translateX(-50%)',
            padding: '0.75rem 1.5rem',
            backgroundColor: 'rgba(255,255,255,0.1)',
            color: 'white',
            border: '1px solid rgba(255,255,255,0.3)',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '0.875rem',
            backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'center', gap: '0.5rem'
          }}
        >
          ↩ Recommencer depuis le début
        </button>
      )}

      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes scaleIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  )
}

export default StoryPreviewModal