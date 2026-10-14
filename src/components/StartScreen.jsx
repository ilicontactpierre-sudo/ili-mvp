import { useState, useEffect, useRef } from 'react'
import { Howl } from 'howler'
import { SoundLoader } from '../engine/SoundLoader.js'
import { orderSoundsByNeed, getStartSoundIds } from '../utils/soundOrder.js'
import { waitForSounds } from '../utils/startGate.js'

// ── Détection plateforme ──────────────────────────────────────────────────────
const isIOS = () => /iPad|iPhone|iPod/.test(navigator.userAgent)
const isStandalone = () =>
  window.navigator.standalone === true ||
  window.matchMedia('(display-mode: standalone)').matches

function StartScreen({ title, author, segmentCount = 0, segments = [], soundsToPreload = [], story = null, savedProgress, onStart, autoStart = false }) {
  const [phase, setPhase] = useState('idle') // idle | loading | exiting
  const [loadProgress, setLoadProgress] = useState(0) // 0–100
  const loadProgressRef = useRef(0)
  const [isSlow, setIsSlow] = useState(false) // chargement lent : propose de commencer sans tout le son
  const loaderRef = useRef(null)
  const gateRef = useRef(null)
  const aliveRef = useRef(true)
  const handedOverRef = useRef(false)

  // Écran quitté pendant le chargement : arrêter l'attente et libérer le chargeur
  // (sauf s'il a déjà été confié à la page par onStart).
  useEffect(() => {
    aliveRef.current = true
    return () => {
      aliveRef.current = false
      gateRef.current?.cancel()
      if (!handedOverRef.current) loaderRef.current?.dispose()
    }
  }, [])

  // ── PWA install prompt ────────────────────────────────────────────────────
  const deferredPromptRef = useRef(null)
  const [showInstallBtn, setShowInstallBtn] = useState(false)
  const [showIOSHint, setShowIOSHint]       = useState(false)

  useEffect(() => {
    if (isStandalone()) return
    if (isIOS()) {
      const already = localStorage.getItem('ili_install_hint_shown')
      if (!already) setShowIOSHint(true)
      return
    }
    const handler = (e) => {
      e.preventDefault()
      deferredPromptRef.current = e
      setShowInstallBtn(true)
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  // ── Démarrage automatique ─────────────────────────────────────────────────
  const autoStartFiredRef = useRef(false)
  useEffect(() => {
    if (autoStart && !autoStartFiredRef.current) {
      autoStartFiredRef.current = true
      handleStart(false)
    }
  }, [autoStart])

  const handleInstall = async () => {
    const prompt = deferredPromptRef.current
    if (!prompt) return
    prompt.prompt()
    await prompt.userChoice
    deferredPromptRef.current = null
    setShowInstallBtn(false)
  }

  const dismissIOSHint = () => {
    localStorage.setItem('ili_install_hint_shown', '1')
    setShowIOSHint(false)
  }

  // ── Dérivés ───────────────────────────────────────────────────────────────
  const hasProgress = savedProgress && savedProgress.segmentIndex > 0

  const minutes = Math.ceil(segmentCount * 3 / 60)
  const durationLabel = segmentCount === 0
    ? null
    : minutes < 1
      ? '< 1 min de lecture'
      : `~ ${minutes} min de lecture`

  const minutesRead = hasProgress && segmentCount > 0
    ? Math.ceil(savedProgress.segmentIndex * 3 / 60)
    : null

  // "Tu as déjà lu ~X min" — chaleureux, minuscules, lisible
  const dontLabel = minutesRead !== null
    ? minutesRead < 1
      ? 'Tu as déjà lu quelques instants'
      : `Tu as déjà lu ~ ${minutesRead} min`
    : null

  const lastSegmentText = hasProgress && segments.length > 0
    ? (() => {
        const seg = segments[savedProgress.segmentIndex]
        const text = seg?.text ?? ''
        return text.length > 80 ? text.slice(0, 80).trimEnd() + '…' : text
      })()
    : null

  const prevSegmentText = hasProgress && segments.length > 0 && savedProgress.segmentIndex > 1
    ? (() => {
        const seg = segments[savedProgress.segmentIndex - 1]
        const text = seg?.text ?? ''
        return text.length > 60 ? '… ' + text.slice(-60).trimStart() : text
      })()
    : null

  // ── Chargement audio avec progression réelle ──────────────────────────────
  async function handleStart(resume) {
    if (phase !== 'idle') return
    setPhase('loading')
    setLoadProgress(0)
    loadProgressRef.current = 0
    setIsSlow(false)

    // Débloque l'audio (iOS/Android) PENDANT le tap : Howler enregistre son déblocage à la
    // création d'un Howl, et le chargeur ne crée les siens qu'après le téléchargement, donc
    // hors du geste. Ce Howl factice ne charge rien (preload: false).
    try { new Howl({ src: ['data:audio/mpeg;base64,'], preload: false, html5: false }).unload() } catch { /* rien */ }

    // Position de départ : celle de la reprise, sinon le début
    const startIndex = resume ? (savedProgress?.segmentIndex ?? 0) : 0
    const audioStory = story ?? { segments, sounds: soundsToPreload, soundTracks: [] }
    const loader = new SoundLoader({ createHowl: (options) => new Howl(options) })
    loaderRef.current = loader
    const ordered = orderSoundsByNeed(audioStory, startIndex)
    loader.start(ordered)

    if (ordered.length > 0) {
      // On n'attend que les sons du DÉBUT (actifs à la position de départ + ceux des 3
      // segments suivants). Les autres continuent de se télécharger pendant la lecture.
      const gate = waitForSounds(loader, getStartSoundIds(audioStory, startIndex, 3), {
        onProgress: (done, total) => {
          const pct = total === 0 ? 100 : Math.round((done / total) * 100)
          loadProgressRef.current = pct
          setLoadProgress(pct)
        },
        onSlow: () => setIsSlow(true),
      })
      gateRef.current = gate
      await gate.done
      gateRef.current = null
      if (!aliveRef.current) return
    }
    setIsSlow(false)
    loadProgressRef.current = 100
    setLoadProgress(100)

    // Pause courte à 100% — laisse l'animation de la barre se terminer
    await new Promise(r => window.setTimeout(r, 280))
    if (!aliveRef.current) return

    setPhase('exiting')
    window.setTimeout(() => {
      if (!aliveRef.current) return
      handedOverRef.current = true // le chargeur appartient désormais à la page
      onStart(loader.howlMap, resume, loader)
    }, 500)
  }

  // ── Courbe S pour la barre de progression ─────────────────────────────────
  // On anime la barre visuellement avec une transition CSS douce.
  // La valeur réelle suit la progression des Howl.

  const EASE = 'cubic-bezier(0.16, 1, 0.3, 1)'
  const isLoading = phase === 'loading'
  const isExiting = phase === 'exiting'

  return (
    <>
      <style>{`
        @keyframes ss-rise {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes ss-bar-pulse {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.6; }
        }
        .ss-btn-primary {
          background: transparent;
          border: none;
          border-bottom: 1px solid color-mix(in srgb, var(--color-text-focus) 35%, transparent);
          border-radius: 0;
          color: color-mix(in srgb, var(--color-text-focus) 90%, transparent);
          font-family: var(--font-primary);
          font-size: clamp(1rem, 3.8vw, 1.25rem);
          font-weight: 400;
          letter-spacing: 0.04em;
          padding: 0.75rem 0;
          cursor: pointer;
          -webkit-tap-highlight-color: transparent;
          transition: color 400ms cubic-bezier(0.16,1,0.3,1),
                      border-color 400ms cubic-bezier(0.16,1,0.3,1),
                      opacity 400ms cubic-bezier(0.16,1,0.3,1);
        }
        .ss-btn-primary:hover {
          color: var(--color-text-focus);
          border-bottom-color: color-mix(in srgb, var(--color-text-focus) 60%, transparent);
        }
        .ss-btn-secondary {
          background: transparent;
          border: none;
          border-bottom: 1px solid color-mix(in srgb, var(--color-text-focus) 10%, transparent);
          border-radius: 0;
          color: color-mix(in srgb, var(--color-text-focus) 35%, transparent);
          font-family: var(--font-primary);
          font-size: clamp(0.9rem, 3.2vw, 1.1rem);
          font-weight: 300;
          letter-spacing: 0.04em;
          padding: 0.75rem 0;
          cursor: pointer;
          -webkit-tap-highlight-color: transparent;
          transition: color 400ms cubic-bezier(0.16,1,0.3,1),
                      border-color 400ms cubic-bezier(0.16,1,0.3,1);
        }
        .ss-btn-secondary:hover {
          color: color-mix(in srgb, var(--color-text-focus) 60%, transparent);
          border-bottom-color: color-mix(in srgb, var(--color-text-focus) 25%, transparent);
        }
      `}</style>

      <main
        onPointerUp={!hasProgress && phase === 'idle' && !autoStart
          ? (e) => { e.stopPropagation(); handleStart(false) }
          : undefined}
        style={{
          minHeight: '100dvh',
          display: 'grid',
          placeItems: 'center',
          textAlign: 'center',
          background: 'var(--color-bg)',
          color: 'var(--color-text-focus)',
          fontFamily: 'var(--font-primary)',
          padding: '2rem 1.5rem',
          opacity: isExiting ? 0 : 1,
          transform: isExiting ? 'translateY(-8px)' : 'translateY(0)',
          transition: isExiting
            ? `opacity 500ms cubic-bezier(0.4, 0, 1, 1), transform 500ms cubic-bezier(0.4, 0, 1, 1)`
            : 'none',
          animation: 'ss-rise 700ms cubic-bezier(0.16, 1, 0.3, 1) both',
          cursor: !hasProgress && phase === 'idle' && !autoStart ? 'pointer' : 'default',
        }}
      >
        <section style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '0',
          width: '100%',
          maxWidth: '40rem',
        }}>

          {/* ── Titre ── */}
          <h1 style={{
            fontSize: 'clamp(2.4rem, 9vw, 4rem)',
            fontWeight: 600,
            lineHeight: 1.2,
            margin: 0,
          }}>
            {title}
          </h1>

          {/* ── Auteur ── */}
          <p style={{
            opacity: 0.75,
            fontSize: 'clamp(1.05rem, 4.2vw, 1.45rem)',
            marginTop: '0.7rem',
            marginBottom: 0,
          }}>
            {author}
          </p>

          {/* ── Durée ── */}
          {durationLabel && (
            <p style={{
              opacity: 0.35,
              fontSize: 'clamp(0.62rem, 2.2vw, 0.74rem)',
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              fontFamily: 'var(--font-logo)',
              marginTop: '0.9rem',
              marginBottom: 0,
            }}>
              {durationLabel}
            </p>
          )}

          {/* ── Tu as déjà lu — chaleureux, lisible ── */}
          {dontLabel && (
            <p style={{
              opacity: 0.45,
              fontSize: 'clamp(0.72rem, 2.4vw, 0.82rem)',
              fontFamily: 'var(--font-primary)',
              fontStyle: 'italic',
              letterSpacing: '0.02em',
              marginTop: '0.35rem',
              marginBottom: 0,
            }}>
              {dontLabel}
            </p>
          )}

          {/* ── PWA install Android ── */}
          {showInstallBtn && (
            <button
              onClick={handleInstall}
              style={{
                marginTop: '2.5rem',
                background: 'transparent',
                border: 'none',
                borderBottom: '1px solid color-mix(in srgb, var(--color-text-focus) 15%, transparent)',
                borderRadius: 0,
                color: 'color-mix(in srgb, var(--color-text-focus) 30%, transparent)',
                fontFamily: 'var(--font-logo, sans-serif)',
                fontSize: 'clamp(0.6rem, 2.2vw, 0.7rem)',
                letterSpacing: '0.2em',
                textTransform: 'uppercase',
                padding: '0.5rem 0',
                cursor: 'pointer',
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              Installer l'app
            </button>
          )}

          {/* ── PWA hint iOS ── */}
          {showIOSHint && (
            <div
              onClick={dismissIOSHint}
              style={{
                marginTop: '2.5rem',
                padding: '0.65rem 1rem',
                border: '1px solid color-mix(in srgb, var(--color-text-focus) 12%, transparent)',
                borderRadius: '8px',
                color: 'color-mix(in srgb, var(--color-text-focus) 35%, transparent)',
                fontFamily: 'var(--font-logo, sans-serif)',
                fontSize: 'clamp(0.58rem, 2vw, 0.68rem)',
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                lineHeight: 1.55,
                maxWidth: '22rem',
                cursor: 'pointer',
                textAlign: 'center',
              }}
            >
              Safari → Partager → « Sur l'écran d'accueil »
              <span style={{ display: 'block', marginTop: '0.35rem', opacity: 0.45, fontSize: '0.85em' }}>
                (toucher pour fermer)
              </span>
            </div>
          )}

          {/* ── Zone basse : chargement / reprise / vide ── */}
          <div style={{
            marginTop: '4.5rem',
            minHeight: '10rem',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            width: '100%',
          }}>

            {/* ── État chargement ── */}
            {(isLoading || isExiting) && (
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '1.2rem',
                width: '100%',
                animation: 'ss-rise 400ms cubic-bezier(0.16, 1, 0.3, 1) both',
              }}>
                {/* Barre de progression — courbe S sur la transition CSS */}
                <div style={{
                  width: 'min(180px, 45vw)',
                  height: '1px',
                  background: 'color-mix(in srgb, var(--color-text-focus) 10%, transparent)',
                  borderRadius: '999px',
                  overflow: 'hidden',
                }}>
                  <div style={{
                    height: '100%',
                    width: `${loadProgress}%`,
                    background: 'color-mix(in srgb, var(--color-text-focus) 55%, transparent)',
                    borderRadius: '999px',
                    // Courbe S : démarre lentement, accélère au milieu, ralentit à la fin
                    transition: loadProgress === 100
                      ? 'width 280ms cubic-bezier(0.16, 1, 0.3, 1)'
                      : 'width 600ms cubic-bezier(0.37, 0, 0.63, 1)',
                  }} />
                </div>

                {/* Label discret */}
                <p style={{
                  opacity: 0.28,
                  fontSize: 'clamp(0.6rem, 2vw, 0.7rem)',
                  letterSpacing: '0.2em',
                  textTransform: 'uppercase',
                  fontFamily: 'var(--font-logo)',
                  margin: 0,
                  // Pulse léger quand pas encore à 100%
                  animation: loadProgress < 100
                    ? 'ss-bar-pulse 1.8s ease-in-out infinite'
                    : 'none',
                }}>
                  {loadProgress < 100
                    ? soundsToPreload.length > 0
                      ? `${loadProgress} %`
                      : 'Préparation…'
                    : 'Prêt'}
                </p>
              </div>
            )}

            {/* ── Connexion lente : proposer de commencer sans attendre tous les sons ── */}
            {isLoading && isSlow && (
              <div style={{
                marginTop: '1.8rem',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '1.1rem',
                maxWidth: '22rem',
                textAlign: 'center',
                animation: 'ss-rise 400ms cubic-bezier(0.16, 1, 0.3, 1) both',
              }}>
                <p style={{
                  margin: 0,
                  opacity: 0.55,
                  fontSize: 'clamp(0.8rem, 2.8vw, 0.9rem)',
                  fontFamily: 'var(--font-primary)',
                  lineHeight: 1.55,
                }}>
                  Connexion lente. Vous pouvez commencer maintenant : les sons se joindront
                  à la lecture dès qu'ils seront prêts.
                </p>
                <button
                  className="ss-btn-primary"
                  onPointerUp={(e) => { e.stopPropagation(); gateRef.current?.continueNow() }}
                >
                  Commencer maintenant
                </button>
                <button
                  className="ss-btn-secondary"
                  onPointerUp={(e) => { e.stopPropagation(); gateRef.current?.waitMore(); setIsSlow(false) }}
                >
                  Attendre encore
                </button>
              </div>
            )}

            {/* ── État reprise de progression ── */}
            {phase === 'idle' && hasProgress && (
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '0',
                width: '100%',
                animation: 'ss-rise 700ms cubic-bezier(0.16, 1, 0.3, 1) both',
              }}>
                {/* Extrait précédent — très discret */}
                {prevSegmentText && (
                  <p style={{
                    opacity: 0.22,
                    fontSize: 'clamp(0.8rem, 2.8vw, 0.9rem)',
                    fontFamily: 'var(--font-primary)',
                    lineHeight: 1.55,
                    marginBottom: '0.5rem',
                    maxWidth: '28rem',
                    textAlign: 'center',
                  }}>
                    {prevSegmentText}
                  </p>
                )}

                {/* Extrait actuel — légèrement plus présent */}
                {lastSegmentText && (
                  <p style={{
                    opacity: 0.45,
                    fontSize: 'clamp(0.88rem, 3vw, 1.02rem)',
                    fontStyle: 'italic',
                    fontFamily: 'var(--font-primary)',
                    lineHeight: 1.6,
                    marginBottom: '2.2rem',
                    maxWidth: '28rem',
                    textAlign: 'center',
                  }}>
                    «&nbsp;{lastSegmentText}&nbsp;»
                  </p>
                )}

                <button
                  className="ss-btn-primary"
                  onPointerUp={(e) => { e.stopPropagation(); handleStart(true) }}
                >
                  Continuer
                </button>

                <div style={{ height: '1.4rem' }} />

                <button
                  className="ss-btn-secondary"
                  onPointerUp={(e) => { e.stopPropagation(); handleStart(false) }}
                >
                  Recommencer
                </button>
              </div>
            )}

          </div>
        </section>
      </main>
    </>
  )
}

export default StartScreen
