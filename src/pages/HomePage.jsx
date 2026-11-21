import { useState, useEffect, useLayoutEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import StoryMenu from '../components/StoryMenu';
import ReaderSettings from '../components/ReaderSettings.jsx'
import { playClicILi } from '../App.jsx'
import TutorialIcon from '../components/TutorialIcon.jsx'
import TutorialLaunch from '../components/TutorialLaunch.jsx'
import { LAUNCH_WHOOSH } from '../utils/tutorialLaunch.js'

// ── Composant ligne d'histoire enrichie ──────────────────────────────────────
function StoryRow({ story, onNavigate }) {
  const [open, setOpen] = useState(false)
  const hasInfo = story.mood || story.genre || story.description

  return (
    <div style={{
      // Theme-aware : utilise la variable CSS au lieu d'une couleur hardcodée
      borderBottom: '1px solid color-mix(in srgb, var(--color-text-focus) 8%, transparent)',
    }}>
      {/* Ligne principale */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 0' }}>
        {/* Zone cliquable */}
        <div
          onClick={() => onNavigate(story)}
          style={{ flex: 1, cursor: 'pointer', minWidth: 0 }}
        >
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.6rem', flexWrap: 'wrap' }}>
            <span style={{
              color: 'var(--color-text-focus)',
              fontSize: '1rem',
              fontWeight: 500,
            }}>
              {story.title}
            </span>
            <span style={{
              color: 'color-mix(in srgb, var(--color-text-focus) 45%, transparent)',
              fontSize: '0.78rem',
            }}>
              {story.author}
            </span>
            {(story.mood || story.genre) && (
              <span style={{
                color: 'color-mix(in srgb, var(--color-text-focus) 28%, transparent)',
                fontSize: '0.62rem',
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                fontWeight: 400,
              }}>
                {[story.mood, story.genre].filter(Boolean).join(' · ')}
              </span>
            )}
          </div>
        </div>

        {/* Bouton ⓘ */}
        {hasInfo && (
          <button
            onClick={(e) => { e.stopPropagation(); setOpen(o => !o) }}
            aria-label="Description"
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: open
                ? 'color-mix(in srgb, var(--color-text-focus) 70%, transparent)'
                : 'color-mix(in srgb, var(--color-text-focus) 25%, transparent)',
              fontSize: '1rem',
              padding: '0 0.25rem',
              lineHeight: 1,
              flexShrink: 0,
              transition: 'color 0.15s',
            }}
          >ⓘ</button>
        )}
      </div>

      {/* Zone dépliable */}
      <div style={{
        overflow: 'hidden',
        maxHeight: open ? '120px' : '0',
        opacity: open ? 1 : 0,
        transition: 'max-height 0.25s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.2s ease',
      }}>
        {story.description && (
          <p style={{
            margin: '0 0 0.75rem 0',
            paddingLeft: '0.75rem',
            borderLeft: '2px solid color-mix(in srgb, var(--color-text-focus) 12%, transparent)',
            color: 'color-mix(in srgb, var(--color-text-focus) 55%, transparent)',
            fontSize: '0.8rem',
            lineHeight: '1.55',
            fontStyle: 'italic',
          }}>
            {story.description}
          </p>
        )}
      </div>
    </div>
  )
}

function HomePage() {
  const navigate = useNavigate();
  const location = useLocation();
  // ── Entrée animée dans le tutoriel (maquette v2, 21/11/2026) ──
  // { variant: 'accueil' | 'liste', from: position, taille et opacité de l'icône touchée }
  const [launch, setLaunch] = useState(null)
  useEffect(() => { LAUNCH_WHOOSH.prepare() }, []) // ~45 Ko, prêt avant le toucher
  const startLaunch = (variant, target) => {
    if (launch) return
    const icon = target.querySelector('svg') ?? target
    const r = icon.getBoundingClientRect()
    if (!r.width) { navigate('/tutoriel'); return } // icône non mesurable : passage direct
    const opacity = parseFloat(getComputedStyle(target).opacity) || 0.62
    setLaunch({ variant, from: { left: r.left, top: r.top, width: r.width, height: r.height, opacity } })
  }
  const handleLaunchDone = useCallback(() => {
    navigate('/tutoriel', { state: { fromIcon: true } })
  }, [navigate])
  // Arrivée depuis l'écran de fin : l'accueil s'ouvre directement sur la liste,
  // et le « ILi » du bas de l'écran de fin vient prendre la place du logo.
  const [fromEnd] = useState(() => Boolean(location.state?.fromEnd))
  const [logoFrom] = useState(() => location.state?.logoFrom ?? null)
  const logoRef = useRef(null)
  const [phase, setPhase] = useState(() => (location.state?.fromEnd ? 'open' : 'idle'));// idle | bumping | transitioning | open
  const [stories, setStories] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  // Onboarding : mémorise que le lecteur est déjà entré une fois (l'indice, lui, revient à chaque visite)
  const [showOnboarding, setShowOnboarding] = useState(() => {
    try { return !localStorage.getItem('ili_onboarding_done') } catch { return true }
  })
  // Indice si le lecteur ne fait rien (à chaque visite) : trait sous le logo (0,8 s),
  // logo qui se trouble puis redevient net (4,7 s), puis le mot (8,1 s). Une seule fois.
  const [hintStage, setHintStage] = useState(0)
  useEffect(() => {
    if (phase !== 'idle') return
    const timers = [
      setTimeout(() => setHintStage(s => Math.max(s, 1)), 800),
      setTimeout(() => setHintStage(s => Math.max(s, 2)), 4700),
      setTimeout(() => setHintStage(3), 8100),
    ]
    return () => timers.forEach(clearTimeout)
  }, [phase])

  // ── Vol du logo depuis l'écran de fin (technique « FLIP ») ──
  // On part de la position et de la taille du « ILi » de l'écran de fin, puis on glisse
  // jusqu'à la vraie place du logo. Rien ne bouge si le téléphone demande moins d'animations.
  useLayoutEffect(() => {
    const from = logoFrom
    const el = logoRef.current
    if (!from || !el) return undefined
    const to = el.getBoundingClientRect()
    const toFont = parseFloat(getComputedStyle(el).fontSize) || 1
    const scale = from.fontSize / toFont
    const dx = (from.x + from.w / 2) - (to.left + to.width / 2)
    const dy = (from.y + from.h / 2) - (to.top + to.height / 2)
    el.style.transition = 'none'
    el.style.transformOrigin = 'center center'
    el.style.transform = `translate(${dx}px, ${dy}px) scale(${scale})`
    el.style.opacity = '0.55'
    el.getBoundingClientRect() // applique la position de départ avant de lancer le vol
    const raf = requestAnimationFrame(() => {
      el.style.transition = 'transform 1100ms cubic-bezier(0.65, 0, 0.35, 1), opacity 1100ms ease'
      el.style.transform = ''
      el.style.opacity = ''
    })
    const reset = () => {
      el.style.transition = ''
      el.style.transformOrigin = ''
      el.style.transform = ''
      el.style.opacity = ''
    }
    const done = setTimeout(() => {
      reset()
      // Oublie l'arrivée : un rechargement de la page ne rejoue pas le vol
      try { window.history.replaceState({ ...window.history.state, usr: null }, '') } catch { /* rien */ }
    }, 1200)
    return () => { cancelAnimationFrame(raf); clearTimeout(done); reset() }
  }, [logoFrom])

  // ── Retour depuis le tutoriel : déclenche l'animation d'entrée automatiquement ──
  useEffect(() => {
    if (location.state?.fromTutorial) {
      // Marquer l'onboarding comme vu
      try { localStorage.setItem('ili_onboarding_done', '1') } catch {}
      setShowOnboarding(false)
      // Délai court pour laisser la page se monter proprement
      const t1 = setTimeout(() => {
        playClicILi()
        setPhase('bumping')
      }, 400)
      const t2 = setTimeout(() => setPhase('transitioning'), 520)
      const t3 = setTimeout(() => setPhase('open'), 1320)
      return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3) }
    }
  }, [])

  const isLocalDev = typeof window !== 'undefined' &&
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

  useEffect(() => {
    const fetchStories = async () => {
      try {
        const response = await fetch('/stories/index.json');
        if (!response.ok) throw new Error('Failed to fetch stories');
        const data = await response.json();
        const storiesArray = Array.isArray(data) ? data : (Array.isArray(data.stories) ? data.stories : [])
        setStories(storiesArray.filter(s => !s.hidden));
      } catch (error) {
        console.error('Error loading stories:', error);
        setStories([]);
      } finally {
        setIsLoading(false);
      }
    };
    fetchStories();
  }, []);

  const handleLogoClick = () => {
    if (phase !== 'idle') return;

    // Marquer l'onboarding comme vu
    if (showOnboarding) {
      setShowOnboarding(false)
      try { localStorage.setItem('ili_onboarding_done', '1') } catch {}
    }

    playClicILi()
    setPhase('bumping');
    setTimeout(() => setPhase('transitioning'), 120);
    setTimeout(() => setPhase('open'), 900);
  };

  const handleClose = () => { setHintStage(0); setPhase('idle'); };

  const handleDeleteStory = async (storyId, password) => {
    if (isLocalDev) throw new Error('Suppression non disponible en local.');
    try {
      const response = await fetch('/api/delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug: storyId, password }),
      });
      if (!response.ok) {
        const text = await response.text();
        let message = 'Erreur lors de la suppression';
        try { message = JSON.parse(text).error || text; } catch { message = text; }
        throw new Error(message);
      }
      const fetchResponse = await fetch('/stories/index.json');
      if (fetchResponse.ok) {
        const data = await fetchResponse.json();
        setStories(Array.isArray(data) ? data : (Array.isArray(data.stories) ? data.stories : []));
      }
      alert('Histoire supprimée avec succès');
    } catch (error) {
      throw error;
    }
  };

  const isOpen    = phase === 'open';
  const isMoving  = phase === 'transitioning' || phase === 'open';
  const isBumping = phase === 'bumping';

  return (
    <>
      <style>{`
        @keyframes hp-onboarding-pulse {
          0%, 100% { opacity: 0.38; transform: translateY(0); }
          50%       { opacity: 0.55; transform: translateY(-2px); }
        }
        @keyframes hp-onboarding-in {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes hp-hint-line {
          from { width: 0; }
          to   { width: 64px; }
        }
        @keyframes hp-hint-blur {
          0%   { filter: blur(0);     opacity: 1; }
          50%  { filter: blur(2.5px); opacity: 0.55; }
          100% { filter: blur(0);     opacity: 1; }
        }
        .hp-hint-line {
          position: absolute;
          left: calc(50% - 0.075em);
          bottom: -4px;
          height: 1px;
          width: 0;
          transform: translateX(-50%);
          background: color-mix(in srgb, var(--color-text-focus) 50%, transparent);
          pointer-events: none;
        }
        .hp-hint-line--on { animation: hp-hint-line 1400ms cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .hp-hint-blur { animation: hp-hint-blur 2400ms cubic-bezier(0.45, 0, 0.2, 1) both; }
        .home-page--from-end .story-menu-container { animation-delay: 1000ms; }
        /* ── Entrée dans le tutoriel : le reste de l'écran s'efface en fondu flou ── */
        @keyframes hp-sortie-carte {
          from { opacity: 1; filter: blur(0); transform: translateY(0); }
          to   { opacity: 0; filter: blur(6px); transform: translateY(8px); }
        }
        .hp-launch .logo-container > * {
          opacity: 0 !important;
          filter: blur(8px);
          transform: translateY(-10px);
          transition: opacity 800ms cubic-bezier(0.65, 0, 0.35, 1), filter 800ms cubic-bezier(0.65, 0, 0.35, 1), transform 900ms cubic-bezier(0.16, 1, 0.3, 1) !important;
          transition-delay: 180ms !important;
        }
        .hp-launch--accueil .logo-container > .logo { transition-delay: 80ms !important; }
        .hp-launch--accueil .logo-container > .logo-tagline { transition-delay: 140ms !important; }
        .hp-launch--liste .logo-container > * { transition-delay: 40ms !important; }
        .hp-launch .logo-container > .hp-tuto { opacity: 0 !important; transition: none !important; }
        .hp-launch .story-card {
          animation: hp-sortie-carte 650ms cubic-bezier(0.65, 0, 0.35, 1) calc(100ms + var(--delay, 0ms)) both !important;
        }
        .hp-launch .story-menu-filters,
        .hp-launch .empty-state,
        .hp-launch .rs-gear-btn {
          opacity: 0 !important;
          transition: opacity 600ms cubic-bezier(0.65, 0, 0.35, 1) 60ms !important;
          pointer-events: none !important;
        }
        .hp-launch .sm-tuto-btn { opacity: 0 !important; animation: none !important; transition: none !important; }
        @media (prefers-reduced-motion: reduce) {
          .hp-hint-line--on { animation: none; width: 64px; }
          .hp-hint-blur { animation: none; }
        }
      `}</style>

      <div className={`home-page${fromEnd ? ' home-page--from-end' : ''}${launch ? ` hp-launch hp-launch--${launch.variant}` : ''}`}>
        <div className={`logo-container ${isMoving ? 'logo-open' : ''}`}>
          <h1
            ref={logoRef}
            className={`logo ${isBumping ? 'logo-bump' : ''}${phase === 'idle' && hintStage === 2 ? ' hp-hint-blur' : ''}`}
            onClick={handleLogoClick}
            style={{ position: 'relative' }}
          >
            ILi
            {phase === 'idle' && (
              <span
                aria-hidden="true"
                className={`hp-hint-line${hintStage >= 1 ? ' hp-hint-line--on' : ''}`}
              />
            )}
          </h1>
          <p className="logo-tagline">lecture immersive</p>

          {/* ── Indice : le mot apparaît en dernier (8,1 s), à chaque visite ── */}
          {/* Toujours présent à l'état idle (place réservée), invisible jusqu'au moment venu. */}
          {phase === 'idle' && (
            <p style={{
              fontFamily: 'var(--font-logo)',
              fontSize: '11px',
              fontWeight: 500,
              letterSpacing: '0.3em',
              textTransform: 'uppercase',
              color: 'color-mix(in srgb, var(--color-text-focus) 65%, transparent)',
              marginTop: '1.4rem',
              userSelect: 'none',
              pointerEvents: 'none',
              opacity: hintStage >= 3 ? undefined : 0,
              animation: hintStage >= 3
                ? 'hp-onboarding-in 900ms cubic-bezier(0.16, 1, 0.3, 1) both'
                : 'none',
            }}>
              Touche pour entrer
            </p>
          )}

          <p className="logo-invite">Choisis ton histoire</p>
          {/* ── Accès tutoriel ── */}
          {/* Visible uniquement à l'état idle, discret, sous la tagline */}
          <div
            className="hp-tuto"
            aria-label="Tutoriel"
            onClick={(e) => { if (phase !== 'idle') return; e.stopPropagation(); startLaunch('accueil', e.currentTarget) }}
            style={{
              color: 'var(--color-text-focus)',
              marginTop: '2.4rem',
              cursor: phase === 'idle' ? 'pointer' : 'default',
              width: '132px',
              height: '132px',
              opacity: phase === 'idle' ? 0.62 : 0,
              pointerEvents: phase === 'idle' ? 'auto' : 'none',
              transition: 'opacity 400ms cubic-bezier(0.76, 0, 0.24, 1)',
            }}
            onMouseEnter={(e) => { if (phase === 'idle') e.currentTarget.style.opacity = '0.55' }}
            onMouseLeave={(e) => { if (phase === 'idle') e.currentTarget.style.opacity = '0.32' }}
            title="Comment ça marche ?"
          >
            <TutorialIcon />
          </div>
        </div>

        {isOpen && (
          <StoryMenu
            isOpen={true}
            stories={stories}
            isLoading={isLoading}
            onClose={handleClose}
            onDeleteStory={handleDeleteStory}
            onTutorial={(target) => startLaunch('liste', target)}
          />
        )}

        {isOpen && <ReaderSettings />}

        {launch && <TutorialLaunch from={launch.from} variant={launch.variant} onDone={handleLaunchDone} />}
      </div>
    </>
  );
}

export default HomePage;
