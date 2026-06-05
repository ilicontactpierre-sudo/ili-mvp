import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import EndScreen from '../components/EndScreen.jsx'
import StartScreen from '../components/StartScreen.jsx'
import StoryReader from '../components/StoryReader.jsx'
import AudioEngine from '../engine/AudioEngine.js'
import ReaderSettings, { saveProgress, loadProgress, clearProgress } from '../components/ReaderSettings.jsx'
import GameOverlay from '../components/GameOverlay.jsx'

const fullScreenStyle = {
  minHeight: '100vh',
  display: 'grid',
  placeItems: 'center',
  background: 'var(--color-bg)',
  color: 'var(--color-text-focus)',
  fontFamily: 'var(--font-primary)',
}

function StoryPage() {
  const { storyId } = useParams()
  const [story, setStory] = useState(null)
  const [isStarted, setIsStarted] = useState(false)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isFinished, setIsFinished] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [errorType, setErrorType] = useState('')
  const touchStartY = useRef(null)
  const touchStartX = useRef(null)
  const touchDidScrollRef = useRef(false)
  const preloadedSoundsRef = useRef(new Map())
  const audioEngineRef = useRef(null)
  const ignoreAdvanceUntilRef = useRef(0)
  const segments = useMemo(() => story?.segments ?? [], [story])
  const lastIndex = Math.max(segments.length - 1, 0)

  const goToNext = useCallback(() => {
    if (!isStarted || !segments.length || isFinished) {
      return
    }
    setCurrentIndex((prevIndex) => {
      if (prevIndex >= lastIndex) {
        setIsFinished(true)
        return prevIndex
      }
      const next = prevIndex + 1
      if (story?.id) saveProgress(story.id, next)
      return next
    })
  }, [isFinished, isStarted, lastIndex, segments.length, story])

  const [jumpPhase, setJumpPhase] = useState('idle')
  const jumpTimersRef = useRef([])

  const goToIndex = useCallback((index) => {
    if (!isStarted || !segments.length || jumpPhase !== 'idle') return
    const clamped = Math.max(0, Math.min(lastIndex, index))

    jumpTimersRef.current.forEach(clearTimeout)
    jumpTimersRef.current = []

    // Phase out : blur + opacité
    setJumpPhase('out')

    // Changer le segment au pic du fondu
    const t1 = setTimeout(() => {
      setCurrentIndex(clamped)
      if (story?.id) saveProgress(story.id, clamped)
    }, 550)

    // Démarrer le fade in
    const t2 = setTimeout(() => {
      setJumpPhase('in')
    }, 650)

    // Retour idle
    const t3 = setTimeout(() => {
      setJumpPhase('idle')
    }, 1800)

    jumpTimersRef.current = [t1, t2, t3]
  }, [isStarted, segments.length, lastIndex, story, jumpPhase])

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

  useEffect(() => {
    let isCancelled = false

    async function loadStory() {
      setIsLoading(true)
      setErrorType('')
      setCurrentIndex(0)
      setIsFinished(false)
      setIsStarted(false)
      audioEngineRef.current?.stopAll()
      audioEngineRef.current = null
      preloadedSoundsRef.current = new Map()

      try {
        const response = await fetch(`/stories/${storyId}.json`)

        if (!response.ok) {
          if (response.status === 404) {
            throw new Error('NOT_FOUND')
          }
          throw new Error('LOAD_ERROR')
        }

        const data = await response.json()

        if (!isCancelled) {
          setStory(data)
        }
      } catch (err) {
        if (!isCancelled) {
          setStory(null)
          setErrorType(err.message || 'LOAD_ERROR')
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false)
        }
      }
    }

    loadStory()

    return () => {
      isCancelled = true
    }
  }, [storyId])

  useEffect(() => {
    return () => {
      audioEngineRef.current?.stopAll()
    }
  }, [])

  useEffect(() => {
    if (!isStarted || !audioEngineRef.current || !segments[currentIndex]) {
      return
    }
    // Si la story a des soundTracks (nouveau système), on ignore les audioEvents legacy
    if (story?.soundTracks?.length) {
      audioEngineRef.current.onSegmentChange(currentIndex, story.soundTracks, segments)
    } else {
      // Système legacy audioEvents (compatibilité avec les vieilles histoires)
      audioEngineRef.current.executeEvents(segments[currentIndex].audioEvents ?? [])
    }
  }, [currentIndex, isStarted])

  useEffect(() => {
    if (!isFinished) {
      return
    }

    audioEngineRef.current?.stopAll(1500)
  }, [isFinished])

  useEffect(() => {
    function handleKeyDown(event) {
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

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [goToNext, goToPrevious])

  function handleScreenClick(event) {
    if (Date.now() < ignoreAdvanceUntilRef.current) {
      return
    }
    if (event.target.closest('a, button, input, textarea, select, summary, [role="button"]')) {
      return
    }
    const x = event.clientX
    const width = window.innerWidth
    if (x / width < 0.40) {
      goToPrevious()
    } else {
      goToNext()
    }
  }

  function handleTouchStart(event) {
    if (Date.now() < ignoreAdvanceUntilRef.current) {
      return
    }
    const touch = event.changedTouches[0]
    touchStartY.current = touch?.clientY ?? null
    touchStartX.current = touch?.clientX ?? null
    touchDidScrollRef.current = false
  }

  function handleTouchMove(event) {
    if (touchStartY.current === null) return
    const touch = event.changedTouches[0]
    const deltaY = Math.abs((touch?.clientY ?? touchStartY.current) - touchStartY.current)
    const deltaX = Math.abs((touch?.clientX ?? touchStartX.current) - touchStartX.current)
    // Dès que le doigt bouge de plus de 6px verticalement, on considère que c'est un scroll
    if (deltaY > 6 && deltaY > deltaX) {
      touchDidScrollRef.current = true
    }
  }

  function handleTouchEnd(event) {
    if (Date.now() < ignoreAdvanceUntilRef.current) {
      touchStartY.current = null
      touchDidScrollRef.current = false
      return
    }
    if (touchStartY.current === null) return

    const touchEndY = event.changedTouches[0]?.clientY ?? touchStartY.current
    const deltaY = touchEndY - touchStartY.current
    const didScroll = touchDidScrollRef.current

    touchStartY.current = null
    touchStartX.current = null
    touchDidScrollRef.current = false

    // C'était un scroll : bloquer le tap qui suivrait
    if (didScroll) return

    // C'était un swipe intentionnel (ancien comportement)
    if (Math.abs(deltaY) >= 50) {
      if (deltaY < 0) goToNext()
      else goToPrevious()
      return
    }

    // Petit mouvement ou tap franc : laisser le onClick gérer
  }

  if (isLoading) {
    return (
      <main style={{ ...fullScreenStyle, fontSize: '1.5rem' }}>
        Chargement...
      </main>
    )
  }

  if (errorType === 'NOT_FOUND') {
    return (
      <main
        style={{
          ...fullScreenStyle,
          textAlign: 'center',
          gap: '1rem',
          padding: '1.5rem',
        }}
      >
        <div>Histoire introuvable</div>
        <Link to="/" style={{ color: 'var(--color-text-focus)' }}>
          Retour a l'accueil
        </Link>
      </main>
    )
  }

  if (errorType) {
    return (
      <main style={fullScreenStyle}>
        Erreur de chargement
      </main>
    )
  }

  if (isFinished) {
    return (
      <>
        <EndScreen
          title={story?.title ?? ''}
          author={story?.author ?? ''}
          formUrl={story?.formUrl}
          bookUrl={story?.bookUrl}
        />
        <ReaderSettings storyId={story?.id} segments={[]} />
      </>
    )
  }

  if (!isStarted) {
    return (
      <>
        <StartScreen
          title={story?.title ?? ''}
          author={story?.author ?? ''}
          soundsToPreload={story?.sounds ?? []}
          savedProgress={story?.id ? loadProgress(story.id) : null}
          onStart={(preloadedHowlMap, resume) => {
            console.log('resume =', resume)
            preloadedSoundsRef.current = preloadedHowlMap
            audioEngineRef.current = new AudioEngine(preloadedHowlMap)
            ignoreAdvanceUntilRef.current = Date.now() + 600
            touchStartY.current = null
            if (resume) {
              const saved = story?.id ? loadProgress(story.id) : null
              if (saved && saved.segmentIndex > 0) {
                setCurrentIndex(saved.segmentIndex)
              }
            } else {
              if (story?.id) clearProgress(story.id)
              setCurrentIndex(0)
            }
            setIsStarted(true)
          }}
        />
        <ReaderSettings storyId={story?.id} segments={[]} />
      </>
    )
  }

  const currentSegment = segments[currentIndex]
  const activeGameMode = currentSegment?.gameMode ?? null

  return (
    <div
      style={{ minHeight: '100vh' }}
      onClick={!activeGameMode ? (e) => {
        // Si le dernier touch était un scroll, absorber le click fantôme
        if (touchDidScrollRef.current) return
        handleScreenClick(e)
      } : undefined}
      onTouchStart={!activeGameMode ? handleTouchStart : undefined}
      onTouchMove={!activeGameMode ? handleTouchMove : undefined}
      onTouchEnd={!activeGameMode ? handleTouchEnd : undefined}
    >
      {activeGameMode && (
        <GameOverlay
          key={currentIndex}
          gameMode={activeGameMode}
          onResolved={goToNext}
        />
      )}
      <StoryReader storyData={story} currentIndex={currentIndex} jumpPhase={jumpPhase} />
      <ReaderSettings
        storyId={story?.id}
        segments={segments}
        currentIndex={currentIndex}
        onJumpTo={goToIndex}
      />
    </div>
  )
}

export default StoryPage
