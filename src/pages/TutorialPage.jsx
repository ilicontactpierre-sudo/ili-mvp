import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import ReaderSettings from '../components/ReaderSettings.jsx'

// ── Courbes d'animation (cohérentes avec le reste de l'app) ─────────────────
const EASE = {
  out:    'cubic-bezier(0.16, 1, 0.3, 1)',
  inOut:  'cubic-bezier(0.76, 0, 0.24, 1)',
  s:      'cubic-bezier(0.87, 0, 0.13, 1)',
  spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
}

const SCREENS = ['navigation', 'headphones', 'settings', 'progress', 'outro']
// Délai minimum (ms) avant de pouvoir taper "suivant" sur chaque écran
const MIN_DELAY = { navigation: 0, headphones: 2600, settings: 6000, progress: 2200, outro: 1800 }

// ── Bouton "suivant" discret, façon ContinueBtn de GameOverlay ──────────────
function NextHint({ visible, label = 'continuer' }) {
  return (
    <div
      aria-hidden="true"
      style={{
        position: 'fixed',
        bottom: '8%',
        left: 0,
        right: 0,
        display: 'flex',
        justifyContent: 'center',
        pointerEvents: 'none',
        zIndex: 50,
      }}
    >
      <span style={{
        fontFamily: 'var(--font-logo, sans-serif)',
        fontSize: '0.68rem',
        letterSpacing: '0.18em',
        textTransform: 'uppercase',
        color: 'color-mix(in srgb, var(--color-text-focus) 45%, transparent)',
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(6px)',
        transition: `opacity 500ms ${EASE.out}, transform 500ms ${EASE.out}`,
      }}>
        {label}
      </span>
    </div>
  )
}

// ── Bouton quitter, coin haut-gauche ──────────────────────────────────────
function ExitButton({ onExit }) {
  return (
    <button
      onClick={onExit}
      aria-label="Quitter le tutoriel"
      style={{
        position: 'fixed',
        top: '1.5rem',
        left: '1.5rem',
        zIndex: 9999,
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        padding: '0.5rem',
        opacity: 0.35,
        transition: 'opacity 300ms ease',
        lineHeight: 1,
      }}
      onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.7' }}
      onMouseLeave={(e) => { e.currentTarget.style.opacity = '0.35' }}
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-focus, #fff)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="6" x2="6" y2="18" />
        <line x1="6" y1="6" x2="18" y2="18" />
      </svg>
    </button>
  )
}

// ── Points de progression (1 par écran), en haut ────────────────────────────
function ProgressDots({ count, current }) {
  return (
    <div
      aria-hidden="true"
      style={{
        position: 'fixed',
        top: '1.8rem',
        left: 0,
        right: 0,
        display: 'flex',
        justifyContent: 'center',
        gap: '0.5rem',
        zIndex: 9999,
        pointerEvents: 'none',
      }}
    >
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          style={{
            width: i === current ? '1.3rem' : '0.35rem',
            height: '0.35rem',
            borderRadius: '999px',
            backgroundColor: 'var(--color-text-focus)',
            opacity: i === current ? 0.75 : i < current ? 0.4 : 0.15,
            transition: `all 500ms ${EASE.out}`,
          }}
        />
      ))}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════
// ÉCRAN 1 — Navigation tactile (next / previous)
// ══════════════════════════════════════════════════════════════════════════
function ScreenNavigation({ onUnlock }) {
  const [leftDone, setLeftDone] = useState(false)
  const [rightDone, setRightDone] = useState(false)
  const [flashSide, setFlashSide] = useState(null) // 'left' | 'right' | null

  useEffect(() => {
    if (leftDone && rightDone) {
      const t = setTimeout(onUnlock, 500)
      return () => clearTimeout(t)
    }
  }, [leftDone, rightDone, onUnlock])

  const handleTap = (side) => {
    setFlashSide(side)
    setTimeout(() => setFlashSide(null), 220)
    if (side === 'left') setLeftDone(true)
    else setRightDone(true)
  }

  const label = !leftDone && !rightDone
    ? 'Touche un côté de l\u2019écran pour avancer ou reculer'
    : !leftDone
      ? 'Essaie maintenant la zone de gauche (précédent)'
      : !rightDone
        ? 'Essaie maintenant la zone de droite (suivant)'
        : 'Parfait.'

  return (
    <div style={{ position: 'fixed', inset: 0, display: 'flex' }}>
      <div
        onClick={() => handleTap('left')}
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          backgroundColor: flashSide === 'left' ? 'rgba(20,20,22,0.94)' : 'transparent',
          transition: flashSide === 'left' ? 'background-color 80ms ease' : `background-color 400ms ${EASE.out}`,
        }}
      >
        <span style={{
          fontFamily: 'var(--font-primary)',
          fontSize: 'clamp(1.3rem, 5vw, 1.8rem)',
          color: flashSide === 'left' ? '#fff' : 'var(--color-text-focus)',
          opacity: leftDone ? 0.35 : 0.85,
          transition: `color 150ms ease, opacity 400ms ${EASE.out}`,
          userSelect: 'none',
        }}>
          Previous
        </span>
      </div>
      <div style={{ width: '1px', background: 'color-mix(in srgb, var(--color-text-focus) 15%, transparent)' }} />
      <div
        onClick={() => handleTap('right')}
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          backgroundColor: flashSide === 'right' ? 'rgba(20,20,22,0.94)' : 'transparent',
          transition: flashSide === 'right' ? 'background-color 80ms ease' : `background-color 400ms ${EASE.out}`,
        }}
      >
        <span style={{
          fontFamily: 'var(--font-primary)',
          fontSize: 'clamp(1.3rem, 5vw, 1.8rem)',
          color: flashSide === 'right' ? '#fff' : 'var(--color-text-focus)',
          opacity: rightDone ? 0.35 : 0.85,
          transition: `color 150ms ease, opacity 400ms ${EASE.out}`,
          userSelect: 'none',
        }}>
          Next
        </span>
      </div>
      {/* Texte d'instruction, au-dessus, ne capte pas le tap */}
      <div style={{
        position: 'fixed',
        top: '38%',
        left: '1.5rem',
        right: '1.5rem',
        textAlign: 'center',
        pointerEvents: 'none',
      }}>
        <p style={{
          fontFamily: 'var(--font-primary)',
          fontSize: 'clamp(0.92rem, 3vw, 1.08rem)',
          color: 'var(--color-text-focus)',
          opacity: 0.8,
          lineHeight: 1.6,
          margin: 0,
          fontStyle: 'italic',
          transition: `opacity 400ms ${EASE.out}`,
        }}>
          {label}
        </p>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════
// ÉCRAN 2 — Casque obligatoire (test stéréo)
// ══════════════════════════════════════════════════════════════════════════
function ScreenHeadphones({ onUnlock }) {
  const audioRef = useRef(null)
  const [playing, setPlaying] = useState(false)

  useEffect(() => {
    const audio = new Audio('/sounds/tutoriel-casque.mp3')
    audio.volume = 0.85
    audioRef.current = audio
    const t = setTimeout(() => {
      audio.play().then(() => setPlaying(true)).catch(() => {})
    }, 500)
    audio.addEventListener('ended', () => {
      setPlaying(false)
      onUnlock?.()
    })
    return () => {
      clearTimeout(t)
      audio.pause()
      audioRef.current = null
    }
  }, [])

  const replay = (e) => {
    e.stopPropagation()
    const audio = audioRef.current
    if (!audio) return
    audio.currentTime = 0
    audio.play().then(() => setPlaying(true)).catch(() => {})
  }

  return (
    <div style={{
      position: 'fixed', inset: 0,
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      textAlign: 'center', padding: '2rem',
      animation: `tut-rise 700ms ${EASE.out} both`,
    }}>
      {/* ── Casque animé ── */}
      <style>{`
        @keyframes headphones-float {
          0%   { transform: translateY(0px)   scale(1)      rotate(0deg); }
          25%  { transform: translateY(-4px)  scale(1.012)  rotate(0.8deg); }
          50%  { transform: translateY(-6px)  scale(1.018)  rotate(0deg); }
          75%  { transform: translateY(-3px)  scale(1.010)  rotate(-0.6deg); }
          100% { transform: translateY(0px)   scale(1)      rotate(0deg); }
        }
      `}</style>
      <svg
        width="52" height="52"
        viewBox="0 0 24 24"
        fill="none"
        stroke="var(--color-text-focus)"
        strokeWidth="1.3"
        style={{
          opacity: 0.85,
          marginBottom: '2rem',
          animation: `headphones-float 4200ms cubic-bezier(0.45, 0.05, 0.55, 0.95) infinite`,
          willChange: 'transform',
        }}
      >
        <path d="M3 14v-2a9 9 0 0 1 18 0v2" />
        <rect x="1" y="14" width="6" height="7" rx="2" />
        <rect x="17" y="14" width="6" height="7" rx="2" />
      </svg>

      <p style={{
        fontFamily: 'var(--font-primary)',
        fontSize: 'clamp(1.05rem, 4vw, 1.3rem)',
        color: 'var(--color-text-focus)',
        opacity: 0.92,
        lineHeight: 1.65,
        maxWidth: '24rem',
        margin: 0,
      }}>
        Mets un casque ou des écouteurs.
      </p>
      <p style={{
        fontFamily: 'var(--font-primary)',
        fontSize: 'clamp(0.85rem, 3vw, 0.98rem)',
        color: 'var(--color-text-focus)',
        opacity: 0.5,
        lineHeight: 1.6,
        maxWidth: '22rem',
        marginTop: '0.9rem',
        fontStyle: 'italic',
      }}>
        Le son fait partie de l'histoire — et il sera parfois très présent.
      </p>
      <button
        onClick={replay}
        style={{
          marginTop: '2.5rem',
          background: 'none',
          border: '1px solid color-mix(in srgb, var(--color-text-focus) 35%, transparent)',
          color: 'var(--color-text-focus)',
          fontFamily: 'var(--font-primary)',
          fontSize: '0.82rem',
          letterSpacing: '0.06em',
          padding: '0.6rem 1.6rem',
          borderRadius: '2px',
          cursor: 'pointer',
          opacity: playing ? 0.4 : 0.75,
          transition: `opacity 300ms ${EASE.out}`,
          pointerEvents: playing ? 'none' : 'auto',
        }}
      >
        {playing ? 'écoute…' : 'réécouter'}
      </button>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════
// ÉCRAN 3 — Roue crantée (spotlight sur le vrai ReaderSettings)
// ══════════════════════════════════════════════════════════════════════════
const SETTINGS_STEPS = [
  { key: 'theme',      text: 'Choisis l\u2019ambiance : sombre, clair, et quelques variantes cachées.' },
  { key: 'font',       text: 'Adapte la taille du texte et les options de lecture facilitée (DYS).' },
  { key: 'progress',   text: 'Affiche ou masque la barre de progression sur le côté.' },
  { key: 'fullscreen', text: 'Passe en plein écran pour une immersion totale.' },
]
function ScreenSettings({ onUnlock }) {
  const [rects, setRects] = useState(null)
  const [stepIndex, setStepIndex] = useState(0)
  const isLastStep = stepIndex >= SETTINGS_STEPS.length - 1

  const handleScreenClick = useCallback(() => {
    if (isLastStep) {
      onUnlock?.()
    } else {
      setStepIndex(i => i + 1)
    }
  }, [isLastStep, onUnlock])

  const handleSectionRects = useCallback((r) => setRects(r), [])

  const currentKey = SETTINGS_STEPS[stepIndex]?.key
  const targetRect = rects?.[currentKey] ?? null

  return (
    <div
      style={{ position: 'fixed', inset: 0 }}
      onClick={handleScreenClick}
    >
      <ReaderSettings forceOpen onSectionRects={handleSectionRects} />
      {/* ── Voile sombre avec trou spotlight ── */}
      {targetRect && (
        <div
          aria-hidden="true"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 7998,
            pointerEvents: 'none',
            transition: `clip-path 600ms ${EASE.inOut}`,
            background: 'rgba(0,0,0,0.55)',
            clipPath: `path('M0,0 H${window.innerWidth} V${window.innerHeight} H0 Z M${targetRect.left - 10},${targetRect.top - 8} H${targetRect.right + 10} V${targetRect.bottom + 8} H${targetRect.left - 10} Z')`,
          }}
        />
      )}
      {/* ── Halo de contour autour de la section ciblée ── */}
      {targetRect && (
        <div
          aria-hidden="true"
          style={{
            position: 'fixed',
            zIndex: 8001,
            left: targetRect.left - 10,
            top: targetRect.top - 8,
            width: targetRect.width + 20,
            height: targetRect.height + 16,
            borderRadius: '12px',
            border: '1.5px solid rgba(255,255,255,0.55)',
            boxShadow: '0 0 24px rgba(255,255,255,0.25)',
            pointerEvents: 'none',
            transition: `all 600ms ${EASE.inOut}`,
          }}
        />
      )}
      {/* ── Texte d'explication, bas d'écran ── */}
      <div style={{
        position: 'fixed',
        bottom: '14%',
        left: '1.8rem',
        right: '1.8rem',
        textAlign: 'center',
        zIndex: 8002,
        pointerEvents: 'none',
      }}>
        <p
          key={stepIndex}
          style={{
            fontFamily: 'var(--font-primary)',
            fontSize: 'clamp(0.88rem, 3vw, 1rem)',
            color: '#fff',
            opacity: 0.9,
            lineHeight: 1.6,
            margin: 0,
            fontStyle: 'italic',
            animation: `tut-rise 500ms ${EASE.out} both`,
          }}
        >
          {SETTINGS_STEPS[stepIndex]?.text}
        </p>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════
// ÉCRAN 4 — Ligne de progression latérale
// ══════════════════════════════════════════════════════════════════════════
function ScreenProgress() {
  const [fill, setFill] = useState(8)

  useEffect(() => {
    const t = setTimeout(() => setFill(82), 400)
    return () => clearTimeout(t)
  }, [])

  return (
    <div style={{ position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
      <div
        style={{
          position: 'fixed',
          top: 0, left: 0,
          width: '4px',
          height: '100vh',
          backgroundColor: 'rgba(255,255,255,0.07)',
        }}
      >
        <div style={{
          width: '100%',
          height: `${fill}%`,
          backgroundColor: 'rgba(255,255,255,0.5)',
          transition: `height 2200ms ${EASE.inOut}`,
        }} />
      </div>
      <p style={{
        fontFamily: 'var(--font-primary)',
        fontSize: 'clamp(0.95rem, 3.5vw, 1.15rem)',
        color: 'var(--color-text-focus)',
        opacity: 0.85,
        lineHeight: 1.7,
        textAlign: 'center',
        maxWidth: '22rem',
        fontStyle: 'italic',
        animation: `tut-rise 700ms ${EASE.out} both`,
      }}>
        Ce trait, sur le côté, te montre où tu en es dans l'histoire.
      </p>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════
// ÉCRAN 5 — Message de fin
// ══════════════════════════════════════════════════════════════════════════
function ScreenOutro() {
  return (
    <div style={{
      position: 'fixed', inset: 0,
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      textAlign: 'center', padding: '2rem',
    }}>
      <p style={{
        fontFamily: 'var(--font-primary)',
        fontSize: 'clamp(1.15rem, 4.5vw, 1.5rem)',
        color: 'var(--color-text-focus)',
        opacity: 0.95,
        lineHeight: 1.75,
        maxWidth: '26rem',
        margin: 0,
        fontStyle: 'italic',
        animation: `tut-rise 900ms ${EASE.s} both`,
      }}>
        Laisse-toi plonger dans l'histoire,<br />et lis comme tu n'as jamais lu.
      </p>
      <p style={{
        fontFamily: 'var(--font-logo)',
        fontSize: '0.7rem',
        letterSpacing: '0.2em',
        textTransform: 'uppercase',
        color: 'var(--color-text-focus)',
        opacity: 0.4,
        marginTop: '2.2rem',
        animation: `tut-rise 900ms ${EASE.s} 300ms both`,
      }}>
        — L'équipe ILi
      </p>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════
// COMPOSANT PRINCIPAL
// ══════════════════════════════════════════════════════════════════════════
function TutorialPage() {
  const navigate = useNavigate()
  const [screenIndex, setScreenIndex] = useState(0)
  const [transitioning, setTransitioning] = useState(false)
  const [canAdvance, setCanAdvance] = useState(false)
  const screen = SCREENS[screenIndex]

  // ── Délai minimum avant de pouvoir avancer (sauf écran 1, débloqué par l'interaction elle-même) ──
  useEffect(() => {
    setCanAdvance(screen === 'navigation' ? false : false)
    const delay = MIN_DELAY[screen] ?? 0
    if (screen === 'navigation') return // débloqué par ScreenNavigation via onUnlock
    const t = setTimeout(() => setCanAdvance(true), delay)
    return () => clearTimeout(t)
  }, [screen])

  // ── Auto-avance depuis l'écran navigation dès que les deux zones sont tapées ──
  useEffect(() => {
    if (screen === 'navigation' && canAdvance && !transitioning) {
      setTransitioning(true)
      setTimeout(() => {
        setScreenIndex(i => i + 1)
        setTransitioning(false)
      }, 350)
    }
  }, [canAdvance, screen, transitioning])

  const goNext = useCallback(() => {
    if (!canAdvance || transitioning) return
    if (screenIndex >= SCREENS.length - 1) {
      navigate('/')
      return
    }
    setTransitioning(true)
    setTimeout(() => {
      setScreenIndex(i => i + 1)
      setTransitioning(false)
    }, 350)
  }, [canAdvance, transitioning, screenIndex, navigate])

  const handleExit = () => navigate('/')
  const handleUnlockNavigation = useCallback(() => setCanAdvance(true), [])

  return (
    <>
      <style>{`
        @keyframes tut-rise {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
      <div
        onClick={screen === 'navigation' ? undefined : goNext}
        style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'var(--color-bg, #080809)',
          color: 'var(--color-text-focus, #fff)',
          fontFamily: 'var(--font-primary)',
          opacity: transitioning ? 0 : 1,
          filter: transitioning ? 'blur(10px)' : 'blur(0px)',
          transition: `opacity 350ms ${EASE.inOut}, filter 350ms ${EASE.inOut}`,
          cursor: screen === 'navigation' ? 'default' : 'pointer',
        }}
      >
        <ExitButton onExit={handleExit} />
        <ProgressDots count={SCREENS.length} current={screenIndex} />

        {screen === 'navigation' && <ScreenNavigation onUnlock={handleUnlockNavigation} />}
        {screen === 'headphones' && <ScreenHeadphones onUnlock={handleUnlockNavigation} />}
        {screen === 'settings'   && <ScreenSettings onUnlock={handleUnlockNavigation} />}
        {screen === 'progress'   && <ScreenProgress />}
        {screen === 'outro'      && <ScreenOutro />}

        {screen !== 'navigation' && screen !== 'settings' && (
          <NextHint visible={canAdvance} label={screenIndex === SCREENS.length - 1 ? 'commencer' : 'continuer'} />
        )}
      </div>
    </>
  )
}

export default TutorialPage