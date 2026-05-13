import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import EndScreen from '../components/EndScreen.jsx'
import StartScreen from '../components/StartScreen.jsx'
import StoryReader from '../components/StoryReader.jsx'
import AudioEngine from '../engine/AudioEngine.js'

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
      return prevIndex + 1
    })
  }, [isFinished, isStarted, lastIndex, segments.length])

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

    audioEngineRef.current.executeEvents(segments[currentIndex].audioEvents ?? [])
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
    goToNext()
  }

  function handleTouchStart(event) {
    if (Date.now() < ignoreAdvanceUntilRef.current) {
      return
    }

    touchStartY.current = event.changedTouches[0]?.clientY ?? null
  }

  function handleTouchEnd(event) {
    if (Date.now() < ignoreAdvanceUntilRef.current) {
      touchStartY.current = null
      return
    }

    if (touchStartY.current === null) {
      return
    }

    const touchEndY = event.changedTouches[0]?.clientY ?? touchStartY.current
    const deltaY = touchEndY - touchStartY.current
    touchStartY.current = null

    if (Math.abs(deltaY) < 50) {
      return
    }

    if (deltaY < 0) {
      goToNext()
      return
    }

    goToPrevious()
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
      <EndScreen
        title={story?.title ?? ''}
        author={story?.author ?? ''}
        formUrl={story?.formUrl}
        onRestart={() => {
          setCurrentIndex(0)
          setIsFinished(false)
        }}
      />
    )
  }

  if (!isStarted) {
    return (
      <StartScreen
        title={story?.title ?? ''}
        author={story?.author ?? ''}
        soundsToPreload={story?.sounds ?? []}
        onStart={(preloadedHowlMap) => {
          preloadedSoundsRef.current = preloadedHowlMap
          audioEngineRef.current = new AudioEngine(preloadedHowlMap)
          ignoreAdvanceUntilRef.current = Date.now() + 600
          touchStartY.current = null
          setIsStarted(true)
        }}
      />
    )
  }

  return (
    <div
      style={{ minHeight: '100vh' }}
      onClick={handleScreenClick}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <StoryReader storyData={story} currentIndex={currentIndex} />
    </div>
  )
}

export default StoryPage
