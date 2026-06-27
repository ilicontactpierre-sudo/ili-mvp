import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import StoryMenu from '../components/StoryMenu';
import ReaderSettings from '../components/ReaderSettings.jsx'
import { playClicILi } from '../App.jsx'

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
  const [phase, setPhase] = useState('idle');// idle | bumping | transitioning | open
  const [stories, setStories] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  // Onboarding : afficher "Appuie pour commencer" une seule fois
  const [showOnboarding, setShowOnboarding] = useState(() => {
    try { return !localStorage.getItem('ili_onboarding_done') } catch { return true }
  })

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

  const handleClose = () => setPhase('idle');

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
      `}</style>

      <div className="home-page">
        <div className={`logo-container ${isMoving ? 'logo-open' : ''}`}>
          <h1
            className={`logo ${isBumping ? 'logo-bump' : ''}`}
            onClick={handleLogoClick}
          >
            ILi
          </h1>
          <p className="logo-tagline">lecture immersive</p>

          {/* ── Onboarding première visite ── */}
          {/* Visible uniquement si l'utilisateur n'a jamais interagi avec le logo.
              Disparaît dès le premier tap. Pulse doux pour attirer l'attention
              sans agressivité. Délai de 1.2s pour apparaître après le logo. */}
          {showOnboarding && phase === 'idle' && (
            <p style={{
              fontFamily: 'var(--font-logo)',
              fontSize: '10px',
              fontWeight: 500,
              letterSpacing: '0.32em',
              textTransform: 'uppercase',
              color: 'color-mix(in srgb, var(--color-text-focus) 38%, transparent)',
              marginTop: '1.4rem',
              userSelect: 'none',
              pointerEvents: 'none',
              animation:
                'hp-onboarding-in 800ms cubic-bezier(0.16, 1, 0.3, 1) 1200ms both, ' +
                'hp-onboarding-pulse 2.8s ease-in-out 2000ms infinite',
            }}>
              Appuie pour commencer
            </p>
          )}

          <p className="logo-invite">Choisis ton histoire</p>
          {/* ── Accès tutoriel ── */}
          {/* Visible uniquement à l'état idle, discret, sous la tagline */}
          {phase === 'idle' && (
            <div
              onClick={(e) => { e.stopPropagation(); navigate('/tutoriel') }}
              style={{
                marginTop: '2.4rem',
                cursor: 'pointer',
                opacity: 0.52,
                transition: 'opacity 300ms ease',
                width: '152px',
                height: '152px',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.55' }}
              onMouseLeave={(e) => { e.currentTarget.style.opacity = '0.28' }}
              title="Comment ça marche ?"
            >
              <img
               src="/tutoriel-icon.png"
                alt="Tutoriel"
                style={{ width: '100%', height: '100%', objectFit: 'contain', filter: 'brightness(0) invert(1)' }}
              />
            </div>
          )}
        </div>

        {isOpen && (
          <StoryMenu
            isOpen={true}
            stories={stories}
            isLoading={isLoading}
            onClose={handleClose}
            onDeleteStory={handleDeleteStory}
          />
        )}

        {isOpen && <ReaderSettings />}
      </div>
    </>
  );
}

export default HomePage;
