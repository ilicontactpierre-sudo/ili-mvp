import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import EndScreen from '../components/EndScreen.jsx'
import StartScreen from '../components/StartScreen.jsx'
import StoryReader from '../components/StoryReader.jsx'
import AudioEngine from '../engine/AudioEngine.js'
import ReaderSettings, { saveProgress, loadProgress, clearProgress } from '../components/ReaderSettings.jsx'
import GameOverlay from '../components/GameOverlay.jsx'
import SeuilScreen from '../components/SeuilScreen.jsx'
import { trackStart, trackProgress, trackFinish, trackAbandon } from '../utils/analytics.js'

const fullScreenStyle = {
  minHeight: '100vh',
  display: 'grid',
  placeItems: 'center',
  background: 'var(--color-bg)',
  color: 'var(--color-text-focus)',
  fontFamily: 'var(--font-primary)',
}

// ── Indicateur de progression d'une partie ───────────────────────────────────
function partProgress(partId) {
  const saved = loadProgress(partId)
  if (!saved) return 'unstarted'
  if (saved.finished) return 'finished'
  if (saved.segmentIndex > 0) return 'inprogress'
  return 'unstarted'
}

const progressIcon = { unstarted: '●', inprogress: '◑', finished: '✓' }
const progressOpacity = { unstarted: 0.38, inprogress: 0.7, finished: 0.55 }

// ── CoverPage (page de garde des séries) ─────────────────────────────────────
function CoverPage({ storyData, onSelectPart }) {
  const [visible, setVisible] = useState(false)
  const [comingSoonMsg, setComingSoonMsg] = useState(null)

  const COMING_SOON_MESSAGES = [
    "Pas encore là… mais ça arrive. 🌱",
    "On y travaille. Promis, juré. ✨",
    "Bientôt disponible — le temps qu'on peaufine les derniers mots. 🖊️",
    "Patience, belle âme. La suite se prépare. 🌙",
    "Cette partie mijote encore. Revenez dans quelques jours ! 🍵",
    "On écrit encore les dernières lignes. À très vite. 📖",
    "Pas tout à fait prêt·e à vous accueillir ici. Encore un peu… 🤫",
    "Ce chapitre se fait désirer. C'est signe que ça vaut le coup. 💫",
  ]

  const showComingSoon = () => {
    const msg = COMING_SOON_MESSAGES[Math.floor(Math.random() * COMING_SOON_MESSAGES.length)]
    setComingSoonMsg(msg)
    setTimeout(() => setComingSoonMsg(null), 6000)
  }

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 60)
    return () => clearTimeout(t)
  }, [])

  const lineColor  = 'color-mix(in srgb, var(--color-text-focus) 16%, transparent)'
  const btnBorder  = 'color-mix(in srgb, var(--color-text-focus) 20%, transparent)'
  const btnColor   = 'color-mix(in srgb, var(--color-text-focus) 55%, transparent)'

  return (
    <main
      style={{
        minHeight: '100dvh',
        display: 'grid',
        gridTemplateRows: '1fr auto 1fr',
        alignItems: 'center',
        textAlign: 'center',
        background: 'var(--color-bg)',
        color: 'var(--color-text-focus)',
        fontFamily: 'var(--font-primary)',
        padding: '2rem 1.5rem',
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(14px)',
        transition: 'opacity 700ms cubic-bezier(0.16, 1, 0.3, 1), transform 700ms cubic-bezier(0.16, 1, 0.3, 1)',
      }}
    >
      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <div />

      <section style={{ width: '100%', maxWidth: '40rem', margin: '0 auto', animation: 'fadeUp 700ms cubic-bezier(0.16, 1, 0.3, 1) both' }}>
        {/* Titre */}
        <h1 style={{ fontSize: 'clamp(2.4rem, 9vw, 4rem)', fontWeight: 600, lineHeight: 1.2, marginBottom: '0.6rem' }}>
          {storyData.title}
        </h1>

        {/* Auteur */}
        <p style={{ opacity: 0.82, fontSize: 'clamp(1.1rem, 4.6vw, 1.55rem)', marginBottom: '0.5rem' }}>
          {storyData.author}
        </p>

        {/* Mood · Genre */}
        {(storyData.mood || storyData.genre) && (
          <p style={{
            opacity: 0.28,
            fontSize: 'clamp(0.6rem, 2.2vw, 0.72rem)',
            letterSpacing: '0.22em',
            textTransform: 'uppercase',
            fontFamily: 'var(--font-logo)',
            marginBottom: '0.5rem',
          }}>
            {[storyData.mood, storyData.genre].filter(Boolean).join(' · ')}
          </p>
        )}

        {/* Description */}
        {storyData.description && (
          <p style={{
            opacity: 0.5,
            fontSize: 'clamp(0.85rem, 3vw, 1rem)',
            fontStyle: 'italic',
            lineHeight: 1.55,
            maxWidth: '28rem',
            margin: '0 auto 0',
          }}>
            {storyData.description}
          </p>
        )}

        {/* Message "bientôt disponible" */}
        <div style={{
          minHeight: '1.8rem',
          marginTop: '1rem',
          transition: 'opacity 300ms ease',
          opacity: comingSoonMsg ? 1 : 0,
        }}>
          {comingSoonMsg && (
            <p style={{
              fontSize: 'clamp(0.75rem, 2.5vw, 0.88rem)',
              opacity: 0.65,
              fontStyle: 'italic',
              letterSpacing: '0.02em',
              margin: 0,
            }}>
              {comingSoonMsg}
            </p>
          )}
        </div>
        {/* Séparateur */}
        <div style={{
          width: '100%',
          maxWidth: '11rem',
          height: '1px',
          margin: '1rem auto 2rem',
          background: lineColor,
        }} />

        {/* Liste des parties */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0', width: '100%', maxWidth: '32rem', margin: '0 auto' }}>
          {(storyData.parts ?? []).filter(part => {
            const vis = part.visibility || (part.published ? 'published' : 'draft')
            return vis !== 'choice' // les parties 'choice' sont invisibles dans la liste
          }).map((part, index) => {
            const vis = part.visibility || (part.published ? 'published' : 'draft')
            const published = vis === 'published'
            const prog = published ? partProgress(part.id) : null

            return (
              <div
                key={part.id}
                onClick={published ? () => onSelectPart(part) : (e) => { e.stopPropagation(); showComingSoon() }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '1rem',
                  padding: '1rem 0',
                  borderBottom: index < (storyData.parts.length - 1)
                    ? '1px solid color-mix(in srgb, var(--color-text-focus) 8%, transparent)'
                    : 'none',
                  opacity: published ? 1 : 0.25,
                  cursor: published ? 'pointer' : 'default',
                  textAlign: 'left',
                  transition: 'opacity 200ms ease',
                }}
                onMouseEnter={e => { if (published) e.currentTarget.style.opacity = '0.75' }}
                onMouseLeave={e => { if (published) e.currentTarget.style.opacity = '1' }}
              >
                {/* Infos partie */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: 'clamp(1rem, 3.5vw, 1.15rem)',
                    fontWeight: 500,
                    letterSpacing: '0.01em',
                    marginBottom: (part.subtitle?.trim() || part.description?.trim()) ? '0.2rem' : 0,
                  }}>
                    {part.title || `Partie ${index + 1}`}
                  </div>
                  {part.subtitle?.trim() && (
                    <div style={{
                      opacity: 0.55,
                      fontSize: 'clamp(0.8rem, 2.8vw, 0.9rem)',
                      fontStyle: 'italic',
                    }}>
                      {part.subtitle}
                    </div>
                  )}
                  {part.description?.trim() && (
                    <div style={{
                      opacity: 0.38,
                      fontSize: 'clamp(0.72rem, 2.4vw, 0.82rem)',
                      lineHeight: 1.5,
                      marginTop: '0.3rem',
                    }}>
                      {part.description}
                    </div>
                  )}
                </div>

                {/* Indicateur droit */}
                {published ? (
                  <span style={{
                    opacity: progressOpacity[prog],
                    fontSize: prog === 'finished' ? '1rem' : '0.85rem',
                    flexShrink: 0,
                    letterSpacing: '0.05em',
                  }}>
                    {progressIcon[prog]}
                  </span>
                ) : (
                  <span style={{
                    fontSize: 'clamp(0.55rem, 1.8vw, 0.62rem)',
                    letterSpacing: '0.18em',
                    textTransform: 'uppercase',
                    fontFamily: 'var(--font-logo)',
                    opacity: 0.6,
                    flexShrink: 0,
                  }}>
                    Bientôt
                  </span>
                )}
              </div>
            )
          })}
        </div>
      </section>

      <div style={{ alignSelf: 'end', opacity: 0.3, fontSize: '0.95rem', letterSpacing: '0.06em' }}>
        ILi
      </div>
    </main>
  )
}

// ── StoryPage ─────────────────────────────────────────────────────────────────
function StoryPage() {
  const { storyId } = useParams()

  // Données brutes de la story (JSON complet)
  const [storyRaw, setStoryRaw] = useState(null)

  // Données de la partie active (ou story complète en mode simple)
  // activeStory a la même forme qu'une story simple : { id, title, segments, sounds, soundTracks, vfxTracks, … }
  const [activeStory, setActiveStory] = useState(null)

  // Index de la partie en cours (mode série uniquement)
  const [activePartIndex, setActivePartIndex] = useState(null)

  // Page de garde série
  const [showCoverPage, setShowCoverPage] = useState(false)

  const [isStarted, setIsStarted]     = useState(false)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isFinished, setIsFinished]   = useState(false)
  const [isFading, setIsFading]       = useState(false)
  const [isLoading, setIsLoading]     = useState(true)
  const [errorType, setErrorType]     = useState('')

  const touchStartY       = useRef(null)
  const touchStartX       = useRef(null)
  const touchDidScrollRef = useRef(false)
  const preloadedSoundsRef = useRef(new Map())
  const audioEngineRef    = useRef(null)
  const ignoreAdvanceUntilRef = useRef(0)

  // La story "active" détermine les segments affichés
  const segments = useMemo(() => activeStory?.segments ?? [], [activeStory])
  const lastIndex = Math.max(segments.length - 1, 0)

  // Clé de progression : part.id en mode série, story.id en mode simple
  const progressKey = useMemo(() => {
    if (storyRaw?.type === 'serial' && activeStory?.id) return activeStory.id
    return storyRaw?.id ?? null
  }, [storyRaw, activeStory])

  // Partie suivante (mode série)
  // Résout la visibilité d'une partie (rétrocompat: published:true sans visibility → 'published')
  const resolveVisibility = (part) => {
    if (!part) return 'draft'
    if (part.visibility) return part.visibility
    return part.published ? 'published' : 'draft'
  }

  const nextPart = useMemo(() => {
    if (!storyRaw?.parts || activePartIndex === null) return null
    const next = storyRaw.parts[activePartIndex + 1]
    return next && resolveVisibility(next) === 'published' ? next : null
  }, [storyRaw, activePartIndex])

  // ── Charger une partie dans les states de lecture ──────────────────────────
  const loadPart = useCallback((part, partIdx) => {
    // Stopper l'audio en cours
    audioEngineRef.current?.stopAll()
    audioEngineRef.current = null
    preloadedSoundsRef.current = new Map()

    // Construire l'objet "story active" à partir de la partie
    const partStory = {
      id:          part.id,
      title:       storyRaw?.title ?? '',
      author:      storyRaw?.author ?? '',
      mood:        storyRaw?.mood ?? '',
      genre:       storyRaw?.genre ?? '',
      description: part.description ?? storyRaw?.description ?? '',
      bookUrl:     storyRaw?.bookUrl ?? null,
      formUrl:     storyRaw?.formUrl ?? null,
      segments:    part.segments    ?? [],
      sounds:      part.sounds      ?? [],
      soundTracks: part.soundTracks ?? [],
      vfxTracks:   part.vfxTracks   ?? [],
    }

    setActiveStory(partStory)
    setActivePartIndex(partIdx)
    setCurrentIndex(0)
    setIsFinished(false)
    setIsFading(false)
    setIsStarted(false)
    setShowCoverPage(false)
  }, [storyRaw])

  // ── Chargement du JSON ─────────────────────────────────────────────────────
  useEffect(() => {
    let isCancelled = false
    async function loadStory() {
      setIsLoading(true)
      setErrorType('')
      setCurrentIndex(0)
      setIsFinished(false)
      setIsStarted(false)
      setShowCoverPage(false)
      setActivePartIndex(null)
      audioEngineRef.current?.stopAll()
      audioEngineRef.current = null
      preloadedSoundsRef.current = new Map()

      try {
        const response = await fetch(`/stories/${storyId}.json`)
        if (!response.ok) {
          throw new Error(response.status === 404 ? 'NOT_FOUND' : 'LOAD_ERROR')
        }
        const data = await response.json()
        if (!isCancelled) {
          setStoryRaw(data)
          if (data.type === 'serial') {
            // Mode série : afficher la page de garde, pas de activeStory encore
            setActiveStory(null)
            setShowCoverPage(true)
          } else {
            // Mode simple : comportement original
            setActiveStory(data)
            setShowCoverPage(false)
          }
        }
      } catch (err) {
        if (!isCancelled) {
          setStoryRaw(null)
          setActiveStory(null)
          setErrorType(err.message || 'LOAD_ERROR')
        }
      } finally {
        if (!isCancelled) setIsLoading(false)
      }
    }
    loadStory()
    return () => { isCancelled = true }
  }, [storyId])

  // ── Navigation ─────────────────────────────────────────────────────────────
  const goToNext = useCallback(() => {
    if (!isStarted || !segments.length || isFinished) return
    setCurrentIndex((prevIndex) => {
      if (prevIndex >= lastIndex) {
        setIsFading(true)
        // Marquer la partie comme terminée
        if (progressKey) saveProgress(progressKey, prevIndex, true)
        trackFinish(activeStory?.id, segments.length)
        return prevIndex
      }
      const next = prevIndex + 1
      if (progressKey) saveProgress(progressKey, next)
      trackProgress(activeStory?.id, next, segments.length)
      return next
    })
  }, [isFinished, isStarted, lastIndex, segments.length, activeStory, progressKey])

  const [jumpPhase, setJumpPhase] = useState('idle')
  const jumpTimersRef = useRef([])

  const goToIndex = useCallback((index) => {
    if (!isStarted || !segments.length || jumpPhase !== 'idle') return
    const clamped = Math.max(0, Math.min(lastIndex, index))
    jumpTimersRef.current.forEach(clearTimeout)
    jumpTimersRef.current = []
    setJumpPhase('out')
    const t1 = setTimeout(() => {
      setCurrentIndex(clamped)
      if (progressKey) saveProgress(progressKey, clamped)
    }, 550)
    const t2 = setTimeout(() => setJumpPhase('in'),  650)
    const t3 = setTimeout(() => setJumpPhase('idle'), 1800)
    jumpTimersRef.current = [t1, t2, t3]
  }, [isStarted, segments.length, lastIndex, progressKey, jumpPhase])

  const goToPrevious = useCallback(() => {
    if (!isStarted || !segments.length) return
    if (isFinished) { setIsFinished(false); return }
    setCurrentIndex((prevIndex) => Math.max(0, prevIndex - 1))
  }, [isFinished, isStarted, segments.length])

  // ── Abandon analytics ──────────────────────────────────────────────────────
  const abandonSentRef      = useRef(false)
  const isStartedRef        = useRef(false)
  const isFinishedRef       = useRef(false)
  const currentIndexRef     = useRef(0)
  const segmentsLengthRef   = useRef(0)
  const activeStoryIdRef    = useRef(null)

  useEffect(() => { isStartedRef.current      = isStarted },       [isStarted])
  useEffect(() => { isFinishedRef.current      = isFinished },      [isFinished])
  useEffect(() => { currentIndexRef.current    = currentIndex },    [currentIndex])
  useEffect(() => { segmentsLengthRef.current  = segments.length }, [segments.length])
  useEffect(() => { activeStoryIdRef.current   = activeStory?.id ?? null }, [activeStory])

  useEffect(() => {
    abandonSentRef.current = false
    return () => {
      audioEngineRef.current?.stopAll()
      if (
        isStartedRef.current &&
        !isFinishedRef.current &&
        activeStoryIdRef.current &&
        !abandonSentRef.current
      ) {
        abandonSentRef.current = true
        trackAbandon(activeStoryIdRef.current, currentIndexRef.current, segmentsLengthRef.current)
      }
    }
  }, [storyId])

  // ── Audio sur changement de segment ───────────────────────────────────────
  useEffect(() => {
    if (!isStarted || !audioEngineRef.current || !segments[currentIndex]) return
    if (activeStory?.soundTracks?.length) {
      audioEngineRef.current.onSegmentChange(currentIndex, activeStory.soundTracks, segments)
    } else {
      audioEngineRef.current.executeEvents(segments[currentIndex].audioEvents ?? [])
    }
  }, [currentIndex, isStarted])

  useEffect(() => {
    if (!isFading) return
    const engine = audioEngineRef.current
    engine?.stopAll(3000)
    const t = setTimeout(() => setIsFinished(true), 3000)
    return () => {
      clearTimeout(t)
      engine?.stopAll(0)
    }
  }, [isFading])

  // ── Clavier ────────────────────────────────────────────────────────────────
  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
        event.preventDefault(); goToNext()
      }
      if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
        event.preventDefault(); goToPrevious()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [goToNext, goToPrevious])

  // ── Interactions écran ─────────────────────────────────────────────────────
  function handleScreenClick(event) {
    if (Date.now() < ignoreAdvanceUntilRef.current) return
    if (event.target.closest('a, button, input, textarea, select, summary, [role="button"]')) return
    const x = event.clientX
    const width = window.innerWidth
    if (x / width < 0.40) goToPrevious()
    else goToNext()
  }

  function handleTouchStart(event) {
    if (Date.now() < ignoreAdvanceUntilRef.current) return
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
    if (deltaY > 6 && deltaY > deltaX) touchDidScrollRef.current = true
  }

  function handleTouchEnd(event) {
    if (Date.now() < ignoreAdvanceUntilRef.current) {
      touchStartY.current = null
      touchDidScrollRef.current = false
      return
    }
    if (touchStartY.current === null) return
    const touchEndY = event.changedTouches[0]?.clientY ?? touchStartY.current
    const deltaY    = touchEndY - touchStartY.current
    const didScroll = touchDidScrollRef.current
    touchStartY.current = null
    touchStartX.current = null
    touchDidScrollRef.current = false
    if (didScroll) return
    if (Math.abs(deltaY) >= 50) {
      if (deltaY < 0) goToNext()
      else goToPrevious()
      return
    }
  }

  // ── GameMode ───────────────────────────────────────────────────────────────
  const [showSeuil, setShowSeuil]     = useState(false)
  const [seuilDone, setSeuilDone]     = useState(false)
  const pendingStartRef               = useRef(null) // stocke { howlMap, resume } pendant le seuil
  const [frozenGameMode, setFrozenGameMode] = useState(null)
  const [frozenIndex, setFrozenIndex]       = useState(null)

  useEffect(() => {
    const currentSegment = segments[currentIndex]
    const activeGameMode = currentSegment?.gameMode ?? null
    if (activeGameMode) {
      setFrozenGameMode(activeGameMode)
      setFrozenIndex(currentIndex)
    }
  }, [currentIndex, segments])

  const handleGameResolved = useCallback(() => {
    setFrozenGameMode(null)
    setFrozenIndex(null)
    goToNext()
  }, [goToNext])

  // ── Partie suivante : rechargement ─────────────────────────────────────────
  const handleNextPart = useCallback(() => {
    if (!nextPart || activePartIndex === null) return
    loadPart(nextPart, activePartIndex + 1)
  }, [nextPart, activePartIndex, loadPart])

  // Navigation directe vers une partie par son ID (pour choice_branch)
  const handleNavigateToPart = useCallback((partId) => {
    // Réinitialiser l'overlay immédiatement
    setFrozenGameMode(null)
    setFrozenIndex(null)
    if (!storyRaw?.parts) return
    const idx = storyRaw.parts.findIndex(p => p.id === partId)
    if (idx === -1) {
      // Partie introuvable → avancer normalement
      goToNext()
      return
    }
    loadPart(storyRaw.parts[idx], idx)
  }, [storyRaw, loadPart, goToNext])

  // ── Render ─────────────────────────────────────────────────────────────────
  if (isLoading) {
    return <main style={{ ...fullScreenStyle, fontSize: '1.5rem' }}>Chargement...</main>
  }

  if (errorType === 'NOT_FOUND') {
    return (
      <main style={{ ...fullScreenStyle, textAlign: 'center', gap: '1rem', padding: '1.5rem' }}>
        <div>Histoire introuvable</div>
        <Link to="/" style={{ color: 'var(--color-text-focus)' }}>Retour a l'accueil</Link>
      </main>
    )
  }

  if (errorType) {
    return <main style={fullScreenStyle}>Erreur de chargement</main>
  }

  // ── Page de garde série ────────────────────────────────────────────────────
  if (showCoverPage && storyRaw?.type === 'serial') {
    return (
      <CoverPage
        storyData={storyRaw}
        onSelectPart={(part) => {
          const partIdx = storyRaw.parts.findIndex(p => p.id === part.id)
          loadPart(part, partIdx)
        }}
      />
    )
  }

  // ── Écran de fin ──────────────────────────────────────────────────────────
  if (isFinished) {
    return (
      <>
        <EndScreen
          title={activeStory?.title ?? storyRaw?.title ?? ''}
          author={activeStory?.author ?? storyRaw?.author ?? ''}
          formUrl={activeStory?.formUrl}
          bookUrl={activeStory?.bookUrl}
          nextPart={nextPart}
          onNextPart={handleNextPart}
        />
        <ReaderSettings storyId={progressKey} segments={[]} />
      </>
    )
  }

  // ── StartScreen ────────────────────────────────────────────────────────────
  if (!isStarted) {
    return (
      <>
        {showSeuil && seuilQuestions.length > 0 ? (
          <SeuilScreen
            questions={seuilQuestions}
            storyTitle={activeStory?.title ?? ''}
            onComplete={() => {
              setShowSeuil(false)
              // Finaliser le démarrage avec les données mises en attente
              const { howlMap, resume } = pendingStartRef.current ?? {}
              if (howlMap !== undefined) {
                preloadedSoundsRef.current = howlMap
                audioEngineRef.current = new AudioEngine(howlMap)
              }
              ignoreAdvanceUntilRef.current = Date.now() + 600
              touchStartY.current = null
              trackStart(activeStory?.id, segments.length)
              if (resume) {
                const saved = progressKey ? loadProgress(progressKey) : null
                if (saved && saved.segmentIndex > 0) setCurrentIndex(saved.segmentIndex)
              } else {
                if (progressKey) clearProgress(progressKey)
                setCurrentIndex(0)
              }
              setIsStarted(true)
              pendingStartRef.current = null
            }}
          />
        ) : (
        <StartScreen
          title={activeStory?.title ?? ''}
          author={activeStory?.author ?? storyRaw?.author ?? ''}
          segmentCount={segments.length}
          segments={segments}
          soundsToPreload={activeStory?.sounds ?? []}
          savedProgress={progressKey ? loadProgress(progressKey) : null}
          onStart={(preloadedHowlMap, resume) => {
            // Preload audio commence ici (StartScreen l'a déjà lancé)
            // Si seuil → afficher les questions pendant ce temps
            if (seuilQuestions.length > 0 && !seuilDone) {
              pendingStartRef.current = { howlMap: preloadedHowlMap, resume }
              setShowSeuil(true)
              return
            }
            // Pas de seuil → démarrer directement
            preloadedSoundsRef.current = preloadedHowlMap
            audioEngineRef.current = new AudioEngine(preloadedHowlMap)
            ignoreAdvanceUntilRef.current = Date.now() + 600
            touchStartY.current = null
            trackStart(activeStory?.id, segments.length)
            if (resume) {
              const saved = progressKey ? loadProgress(progressKey) : null
              if (saved && saved.segmentIndex > 0) setCurrentIndex(saved.segmentIndex)
            } else {
              if (progressKey) clearProgress(progressKey)
              setCurrentIndex(0)
            }
            setIsStarted(true)
          }}
        />
        )}
        <ReaderSettings storyId={progressKey} segments={[]} />
      </>
    )
  }

  // ── Lecture ────────────────────────────────────────────────────────────────
  const currentSegment = segments[currentIndex]
  const showOverlay    = frozenGameMode !== null

  return (
    <div
      style={{
        minHeight: '100vh',
        opacity: isFading ? 0 : 1,
        transition: isFading ? 'opacity 2800ms cubic-bezier(0.4, 0, 1, 1)' : 'none',
        pointerEvents: isFading ? 'none' : 'auto',
        touchAction: 'manipulation',
      }}
      onClick={!showOverlay && !isFading ? (e) => {
        if (touchDidScrollRef.current) return
        handleScreenClick(e)
      } : undefined}
      onTouchStart={!showOverlay ? handleTouchStart : undefined}
      onTouchMove={!showOverlay ? handleTouchMove : undefined}
      onTouchEnd={!showOverlay ? handleTouchEnd : undefined}
    >
      {showOverlay && (
        <GameOverlay
          key={frozenIndex}
          gameMode={frozenGameMode}
          segmentIndex={frozenIndex}
          onResolved={handleGameResolved}
          onNavigateToPart={handleNavigateToPart}
          onBack={() => {
            setFrozenGameMode(null)
            setFrozenIndex(null)
            goToPrevious()
          }}
        />
      )}
      <StoryReader storyData={activeStory} currentIndex={currentIndex} jumpPhase={jumpPhase} />
      <ReaderSettings
        storyId={progressKey}
        segments={segments}
        currentIndex={currentIndex}
        onJumpTo={goToIndex}
      />
    </div>
  )
}

export default StoryPage